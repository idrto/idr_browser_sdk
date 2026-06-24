import { signalUrl } from "../constants";
import { IdrError } from "../errors/IdrError";
import type { DeviceIdentity } from "../crypto/deviceIdentity";
import { createEnvelope, parseEnvelope, serializeEnvelope, type Envelope } from "./envelope";

export type SignalingClientOptions = {
  identity: DeviceIdentity;
  onEnvelope?: (env: Envelope) => void;
  signal?: AbortSignal;
};

export class SignalingClient {
  private ws: WebSocket | null = null;
  private challengeId = "";
  private sendQueue: string[] = [];
  private authenticated = false;
  private authOkPromise: Promise<void> | null = null;
  private authOkResolve: (() => void) | null = null;
  private authOkReject: ((err: Error) => void) | null = null;

  constructor(private opts: SignalingClientOptions) {}

  async connect(): Promise<void> {
    if (this.ws) return;

    this.authOkPromise = new Promise((resolve, reject) => {
      this.authOkResolve = resolve;
      this.authOkReject = reject;
    });

    const url = signalUrl();
    const ws = new WebSocket(url);
    this.ws = ws;

    const abort = () => {
      ws.close();
      this.authOkReject?.(new IdrError("aborted", "Signaling connection aborted"));
    };
    this.opts.signal?.addEventListener("abort", abort, { once: true });

    ws.onmessage = (ev) => {
      if (typeof ev.data !== "string") return;
      this.handleMessage(ev.data);
    };

    ws.onerror = () => {
      this.authOkReject?.(new IdrError("signaling_error", "WebSocket error"));
    };

    ws.onclose = () => {
      this.ws = null;
      if (!this.authenticated) {
        this.authOkReject?.(new IdrError("signaling_closed", "Signaling closed before auth"));
      }
    };

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new IdrError("signaling_error", "Failed to open signaling WebSocket"));
    });

    await this.authOkPromise;
    this.opts.signal?.removeEventListener("abort", abort);
  }

  send(type: string, id: string, payload: Record<string, unknown>): void {
    const msg = serializeEnvelope(createEnvelope(type, id, payload));
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(msg);
    } else {
      this.sendQueue.push(msg);
    }
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }

  private flushQueue(): void {
    while (this.sendQueue.length && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(this.sendQueue.shift()!);
    }
  }

  private async handleMessage(text: string): Promise<void> {
    let env: Envelope;
    try {
      env = parseEnvelope(text);
    } catch {
      return;
    }

    switch (env.type) {
      case "auth.challenge": {
        this.challengeId = env.id;
        const nonce = String(env.payload.nonce ?? "");
        const signature = await this.opts.identity.signNonceHex(nonce);
        this.send("auth.challenge_response", this.challengeId, {
          device_id: this.opts.identity.deviceIdBase32(),
          public_key: this.opts.identity.publicKeyBase64Url(),
          signature,
          agent: { mode: "browser", version: "0.1.0", platform: navigator.userAgent.slice(0, 64) },
        });
        break;
      }
      case "auth.ok":
        this.authenticated = true;
        this.flushQueue();
        this.authOkResolve?.();
        break;
      case "auth.failed":
        this.authOkReject?.(
          new IdrError(
            String(env.payload.code ?? "auth_failed"),
            String(env.payload.message ?? "Authentication failed"),
          ),
        );
        break;
      case "ping":
        this.send("pong", env.id, {});
        break;
      default:
        this.opts.onEnvelope?.(env);
    }
  }
}
