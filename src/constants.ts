/** Hardcoded idr.to platform endpoints (not overridable in production ISV apps). */

export const IDR_API_BASE = "https://idr.to";
export const IDR_SIGNAL_URL = "wss://idr.to/v1/signal";
export const IDR_RELAY_BASE_DOMAIN = "idr.to";
export const IDR_WELL_KNOWN = "https://idr.to/.well-known/idr-configuration";
export const ALLOWED_HOST_SUFFIXES = [".idr.to", ".idr"] as const;
export const BROWSER_SOURCE_HOST = "browser";
export const DATA_CHANNEL_LABEL = "idr-tunnel";
export const CREDENTIAL_STORAGE_KEY = "idr.sdk.credential.v1";
export const DEVICE_KEY_STORAGE_KEY = "idr.sdk.device.v1";

/** Dev-only override via localStorage `idr.sdk.devApiBase` (examples/tests). */
export function apiBase(): string {
  if (typeof localStorage !== "undefined") {
    const dev = localStorage.getItem("idr.sdk.devApiBase");
    if (dev?.trim()) return dev.replace(/\/$/, "");
  }
  return IDR_API_BASE;
}

export function signalUrl(): string {
  const base = apiBase();
  if (base !== IDR_API_BASE) {
    const u = new URL(base);
    const proto = u.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${u.host}/v1/signal`;
  }
  return IDR_SIGNAL_URL;
}
