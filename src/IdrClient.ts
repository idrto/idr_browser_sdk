import { BROWSER_SOURCE_HOST } from "./constants";
import { parseTargetInput } from "./addressing/parseTarget";
import { loadOrCreateDeviceIdentity } from "./crypto/deviceIdentity";
import { IdrError } from "./errors/IdrError";
import { fetchOverTunnel, IdrResponse } from "./http/fetchOverTunnel";
import {
  accountLogin,
  createCheckout,
  fetchBillingStatus,
  fetchResolveChallenge,
  registerSourceIdentity,
  resolveWithHostIdentity,
} from "./platform/api";
import {
  accessTokenFromCredential,
  authModeFromCredential,
  clearCredential,
  credentialIsPersisted,
  entityIdFromCredential,
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
  HostIdentityDocument,
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

const HOST_IDENTITY_REFRESH_MS = 24 * 60 * 60 * 1000;

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
  private lastPersist = credentialIsPersisted();

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
      throw new IdrError("auth_required", "Sign in via ensureSession({ interactive: true })");
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
    const entityId = opts.entityId.trim().toLowerCase();
    const result = await accountLogin(entityId, opts.password);
    const expiresAt = Date.now() + result.expires_in * 1000;
    const device = await loadOrCreateDeviceIdentity();
    const sourceHost = BROWSER_SOURCE_HOST;
    const registered = await registerSourceIdentity(
      result.access_token,
      entityId,
      sourceHost,
      device.publicKeyBase64Url(),
    );

    this.lastPersist = opts.persist ?? false;
    this.credential = {
      mode: "account",
      accessToken: result.access_token,
      entityId,
      expiresAt,
      sourceHost,
      hostIdentity: registered.host_identity,
    };
    saveCredential(this.credential, this.lastPersist);
    await this.ensureBillingActive();
  }

  async logout(): Promise<void> {
    await this.close();
    clearCredential();
    this.credential = null;
    this.lastPersist = false;
  }

  async billingStatus() {
    const token = accessTokenFromCredential(this.credential);
    if (!token) throw new IdrError("auth_required", "Not authenticated");
    return fetchBillingStatus(token);
  }

  async openCheckout(bundle: "personal" | "enterprise", quantity = 1): Promise<string | undefined> {
    const token = accessTokenFromCredential(this.credential);
    if (!token) throw new IdrError("auth_required", "Not authenticated");
    const session = await createCheckout(token, bundle, quantity);
    return session.checkout_url ?? session.url;
  }

  async connect(options: ConnectOptions): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new IdrError("auth_required", "Call ensureSession() before connect()");
    }

    this.state = "connecting";
    try {
      const parsed = parseTargetInput(options.host, this.service);
      this.parsedTarget = parsed;

      const hostIdentity = await this.ensureHostIdentity();
      const device = await loadOrCreateDeviceIdentity();
      const challenge = await fetchResolveChallenge();
      const popSignature = await device.signNonceBase64Url(challenge.nonce);

      const resolved = await resolveWithHostIdentity(parsed.idrtoUri, hostIdentity, {
        challenge_id: challenge.challenge_id,
        nonce: challenge.nonce,
        pop_signature: popSignature,
      });

      const identity = device;
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

      this.peer = await createOutboundPeer(
        {
          ...resolved,
          transport: resolved.transport ?? parsed.transport,
        },
        this.relay,
      );
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

  private async ensureHostIdentity(): Promise<HostIdentityDocument> {
    const cred = this.credential;
    const token = accessTokenFromCredential(cred);
    if (!cred || !token) throw new IdrError("auth_required", "Not authenticated");

    const expiresAt = new Date(cred.hostIdentity.expiresAt).getTime();
    if (expiresAt > Date.now() + HOST_IDENTITY_REFRESH_MS) {
      return cred.hostIdentity;
    }

    const device = await loadOrCreateDeviceIdentity();
    const sourceHost = sourceHostFromCredential(cred);
    const registered = await registerSourceIdentity(
      token,
      cred.entityId,
      sourceHost,
      device.publicKeyBase64Url(),
    );

    cred.hostIdentity = registered.host_identity;
    this.credential = cred;
    saveCredential(cred, this.lastPersist);
    return cred.hostIdentity;
  }

  private async ensureBillingActive(): Promise<void> {
    const status = await this.billingStatus();
    if (!status.bundle_active) {
      throw new IdrError(
        "billing_required",
        "Active product bundle required — use openCheckout('personal')",
      );
    }
  }
}
