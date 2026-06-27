export type IdrConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "closed"
  | "failed";

export type IdrAuthMode = "none" | "account";

export type HostIdentityDocument = {
  schemaVersion: number;
  entityId: string;
  hostId: string;
  ou: string;
  publicKey: {
    algorithm: "Ed25519";
    value: string;
  };
  issuedAt: string;
  expiresAt: string;
  issuer: string;
  signature: string;
};

export type ParsedTarget = {
  entityId: string;
  host: string;
  service: string;
  transport: "tcp" | "udp";
  path: string;
  query: string;
  idrtoUri: string;
};

export type ResolveResponse = {
  entity_id: string;
  host: string;
  service: string;
  transport?: "tcp" | "udp";
  signal_session: string;
  signal_url?: string;
  def_hostname?: string;
  https_url?: string;
  stun_urls?: string[];
  turn_urls?: string[];
  turn_username?: string;
  turn_credential?: string;
  turn_ttl?: number;
  attestation_url?: string;
};

export type BillingStatus = {
  bundle_active: boolean;
  acl_tier?: "personal" | "enterprise";
};

export type IdrFetchInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string | ArrayBuffer | Uint8Array;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type ConnectTransport = "auto" | "webrtc" | "https";

export type ConnectOptions = {
  host: string;
  /** WebRTC first with HTTPS relay fallback (default), WebRTC only, or HTTPS relay only */
  transport?: ConnectTransport;
  signal?: AbortSignal;
  timeoutMs?: number;
};
