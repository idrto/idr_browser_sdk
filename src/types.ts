export type IdrConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "closed"
  | "failed";

export type IdrAuthMode = "none" | "account" | "access_key";

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
  stun_urls?: string[];
  turn_urls?: string[];
  turn_username?: string;
  turn_credential?: string;
  turn_ttl?: number;
  attestation_url?: string;
};

export type BillingStatus = {
  signaling_active: boolean;
  turn?: Array<{ host: string | null; status: string }>;
};

export type IdrFetchInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string | ArrayBuffer | Uint8Array;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type ConnectOptions = {
  host: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** @internal Forbidden — access keys only via SDK auth UI */
  accessKey?: never;
};
