import { BROWSER_SOURCE_HOST } from "./constants";
import { parseTargetInput } from "./addressing/parseTarget";
import { loadOrCreateDeviceIdentity } from "./crypto/deviceIdentity";
import { IdrError } from "./errors/IdrError";
import { fetchOverTunnel, IdrResponse } from "./http/fetchOverTunnel";
import {
  createCheckout,
  exchangeAccessKey,
  fetchBillingStatus,
  browserLogin,
  resolveTarget,
} from "./platform/api";
import {
  accessTokenFromCredential,
  authModeFromCredential,
  clearCredential,
  entityIdFromCredential,
  keyHint,
  loadCredential,
  saveCredential,
  sourceHostFromCredential,
  type StoredCredential,
} from "./platform/credential-store";
import { resolveServicePort } from "./services/resolvePort";
import { SignalingClient } from "./signaling/client";
import { TunnelMultiplexer, type TunnelStream } from "./tunnel/multiplexer";
import type {
  ConnectOptions,
  IdrAuthMode,
  IdrConnectionState,
  IdrFetchInit,
  ParsedTarget,
} from "./types";
import { createOutboundPeer, createSignalingRelay, type PeerConnectionHandle } from "./webrtc/peer";

export type EnsureSessionOptions = {
  /** Open built-in auth UI when not authenticated */
  interactive?: boolean;
  mount?: HTMLElement;
};

export type LoginOptions = {
  entityId: string;
  password: string;
  persist?: boolean;
};

export type AccessKeyLoginOptions = {
  accessKey: string;
  persist?: boolean;
};

const FORBIDDEN_CONNECT_KEYS = ["accessKey", "access_key", "token", "bearer"] as const;

export class IdrClient {
  private credential: StoredCredential | null = loadCredential();
  private state: IdrConnectionState = "idle";
  private parsedTarget: ParsedTarget | null = null;
  private mux: TunnelMultiplexer | null = null;
  private peer: PeerConnectionHandle | null = null;
  private signaling: SignalingClient | null = null;
  private relay: ReturnType<typeof createSignalingRelay> | null = null;
  private servicePort: number;
  private authPanelMount: HTMLElement | null = null;

  private constructor(private readonly service: string) {
    this.servicePort = resolveServicePort(service);
  }

  static forService(service: string): IdrClient {
    if (!service?.trim()) throw new IdrError("invalid_service", "Service name is required");
    return new IdrClient(service.trim());
  }

  authMode(): IdrAuthMode {
    return authModeFromCredential(this.credential);
  }

  isAuthenticated(): boolean {
    return Boolean(accessTokenFromCredential(this.credential));
  }

  connectionState(): IdrConnectionState {
    return this.state;
  }

  serviceName(): string {
    return this.service;
  }

  async ensureSession(opts: EnsureSessionOptions = {}): Promise<void> {
    if (this.isAuthenticated()) return;
    if (!opts.interactive) {
      throw new IdrError("auth_required", "Sign in or enter an access key via ensureSession({ interactive: true })");
    }
    const { mountAuthPanel } = await import("./ui/AuthPanel");
    const mount = opts.mount ?? this.authPanelMount;
    if (!mount) {
      throw new IdrError("auth_required", "Provide mount element for interactive auth");
    }
    await mountAuthPanel(mount, { client: this });
    if (!this.isAuthenticated()) {
      throw new IdrError("auth_required", "Authentication was not completed");
    }
  }

  setAuthPanelMount(el: HTMLElement): void {
    this.authPanelMount = el;
  }

  async loginAccount(opts: LoginOptions): Promise<void> {
    const result = await browserLogin(opts.entityId.trim().toLowerCase(), opts.password);
    const expiresAt = Date.now() + result.expires_in * 1000;
    this.credential = {
      mode: "account",
      accessToken: result.access_token,
      entityId: result.entity_id,
      expiresAt,
      sourceHost: BROWSER_SOURCE_HOST,
    };
    saveCredential(this.credential, opts.persist ?? false);
    await this.ensureBillingActive();
  }

  async loginAccessKey(opts: AccessKeyLoginOptions): Promise<void> {
    const key = opts.accessKey.trim();
    if (!key) throw new IdrError("invalid_request", "Access key is required");
    const result = await exchangeAccessKey(key);
    const expiresAt = Date.now() + result.expires_in * 1000;
    this.credential = {
      mode: "access_key",
      accessToken: result.access_token,
      entityId: result.entity_id,
      expiresAt,
      sourceHost: result.host ?? BROWSER_SOURCE_HOST,
      keyHint: keyHint(key),
    };
    saveCredential(this.credential, opts.persist ?? false);
  }

  async logout(): Promise<void> {
    await this.close();
    clearCredential();
    this.credential = null;
  }

  async billingStatus() {
    const token = accessTokenFromCredential(this.credential);
    if (!token) throw new IdrError("auth_required", "Not authenticated");
    return fetchBillingStatus(token);
  }

  async openCheckout(product: "signaling" | "turn", host?: string): Promise<string | undefined> {
    const token = accessTokenFromCredential(this.credential);
    if (!token) throw new IdrError("auth_required", "Not authenticated");
    const session = await createCheckout(token, product, host);
    return session.checkout_url ?? session.url;
  }

  async connect(options: ConnectOptions): Promise<void> {
    for (const key of FORBIDDEN_CONNECT_KEYS) {
      if (key in (options as Record<string, unknown>)) {
        throw new IdrError(
          "forbidden",
          `Do not pass ${key} to connect() — use SDK auth UI (ensureSession / mountAuthPanel)`,
        );
      }
    }

    const token = accessTokenFromCredential(this.credential);
    if (!token) throw new IdrError("auth_required", "Call ensureSession() before connect()");

    this.state = "connecting";
    try {
      const parsed = parseTargetInput(options.host, this.service);
      this.parsedTarget = parsed;

      const resolved = await resolveTarget(
        token,
        parsed.idrtoUri,
        sourceHostFromCredential(this.credential),
      );

      const identity = await loadOrCreateDeviceIdentity();
      const signalSession = resolved.signal_session;
      let answerResolve: (() => void) | null = null;
      let answerReject: ((err: Error) => void) | null = null;
      const answerWait = new Promise<void>((resolve, reject) => {
        answerResolve = resolve;
        answerReject = reject;
      });
      const answerTimer = setTimeout(
        () => answerReject?.(new IdrError("timeout", "Timed out waiting for WebRTC answer")),
        options.timeoutMs ?? 60_000,
      );

      this.relay = createSignalingRelay(
        (type, id, payload) => this.signaling?.send(type, id, payload),
        signalSession,
        { entity_id: parsed.entityId, host: parsed.host },
      );

      this.signaling = new SignalingClient({
        identity,
        signal: options.signal,
        onEnvelope: (env) => {
          if (env.payload.signal_session !== signalSession) return;
          this.relay?.handleEnvelope(env.type, env.payload);
          if (env.type === "signal.answer") {
            clearTimeout(answerTimer);
            answerResolve?.();
          }
        },
      });

      await this.signaling.connect();

      this.peer = await createOutboundPeer(resolved, this.relay);
      this.mux = new TunnelMultiplexer((frame) => this.peer!.sendBinary(frame));
      this.peer.onBinary((data) => this.mux!.ingest(data));

      await Promise.race([
        answerWait,
        this.peer.whenDataChannelOpen,
        new Promise((_, reject) => {
          options.signal?.addEventListener(
            "abort",
            () => reject(new IdrError("aborted", "Connect aborted")),
            { once: true },
          );
        }),
      ]);

      await this.peer.whenDataChannelOpen;
      this.state = "connected";
    } catch (err) {
      this.state = "failed";
      await this.close();
      throw err;
    }
  }

  openStream(host = "127.0.0.1", port = this.servicePort): TunnelStream {
    if (!this.mux || this.state !== "connected") {
      throw new IdrError("not_connected", "Call connect() first");
    }
    return this.mux.openStream(host, port);
  }

  async fetch(path: string, init?: IdrFetchInit): Promise<IdrResponse> {
    if (!this.mux || this.state !== "connected") {
      throw new IdrError("not_connected", "Call connect() first");
    }
    const basePath = this.parsedTarget?.path ?? "";
    const fullPath = `${basePath}${path.startsWith("/") ? path : `/${path}`}`;
    const result = await fetchOverTunnel(
      (h, p) => this.mux!.openStream(h, p),
      this.servicePort,
      fullPath,
      init,
    );
    return new IdrResponse(result.status, result.headers, result.body);
  }

  async close(): Promise<void> {
    this.peer?.close();
    this.signaling?.disconnect();
    this.peer = null;
    this.signaling = null;
    this.mux = null;
    this.relay = null;
    this.parsedTarget = null;
    this.state = "idle";
  }

  /** @internal Used by auth panel — entity id for display only */
  _entityId(): string | null {
    return entityIdFromCredential(this.credential);
  }

  private async ensureBillingActive(): Promise<void> {
    const status = await this.billingStatus();
    if (!status.signaling_active) {
      throw new IdrError(
        "billing_required",
        "Signaling subscription required — use openCheckout('signaling')",
      );
    }
  }
}
