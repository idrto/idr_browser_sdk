import { ALLOWED_HOST_SUFFIXES } from "../constants";
import { IdrError } from "../errors/IdrError";
import { idrEscapeEntity, idrUnescapeEntity } from "./idr-escape";

export const IDRTO_V2_MARKER = "/--/";
export const IDR_HOST_SUFFIX = ".idr";
export const IDR_TO_HOST_SUFFIX = ".idr.to";

const LABEL_RE = /^[A-Za-z0-9-]+$/;
const SERVICE_NAME_RE = /^[A-Za-z0-9_-]+$/;

export function validateHostSuffix(hostOrUrl: string): void {
  const lower = hostOrUrl.toLowerCase();
  const ok = ALLOWED_HOST_SUFFIXES.some((s) => lower.endsWith(s));
  if (!ok && !hostOrUrl.startsWith("idrto:") && !hostOrUrl.startsWith("https://idr.to/")) {
    throw new IdrError(
      "invalid_host",
      `Target must use suffix ${ALLOWED_HOST_SUFFIXES.join(" or ")} (use .idr synthetic hostnames or idrto: URIs; *.idr.to labels are opaque)`,
    );
  }
}

/** Build synthetic `<host>.<idr-escaped-entity>.idr` (encode-only; no decode of opaque labels). */
export function buildIdrHostname(entityId: string, host: string): string {
  validateHostLabels(host);
  const encoded = idrEscapeEntity(entityId, true);
  return `${host}.${encoded}${IDR_HOST_SUFFIX}`;
}

export function parseIdrHostname(hostname: string): { entityId: string; host: string } {
  const lower = hostname.toLowerCase();
  if (!lower.endsWith(IDR_HOST_SUFFIX)) {
    throw new IdrError("invalid_uri", "Hostname must end with .idr");
  }
  const withoutSuffix = hostname.slice(0, -IDR_HOST_SUFFIX.length);
  const parts = withoutSuffix.split(".");
  if (parts.length < 2) {
    throw new IdrError("invalid_uri", "Invalid .idr hostname (need host.entity.idr)");
  }
  const encodedEntity = parts[parts.length - 1]!;
  const entityId = idrUnescapeEntity(encodedEntity);
  const hostPart = parts.slice(0, -1).join(".");
  if (!hostPart) throw new IdrError("invalid_uri", "Empty host in .idr hostname");
  validateHostLabels(hostPart);
  return { entityId, host: hostPart };
}

export function formatIdrtoUri(entityId: string, host: string, service: string): string {
  const encoded = idrEscapeEntity(entityId, false);
  return `idrto:${encoded}${IDRTO_V2_MARKER}${host}/${service}`;
}

export function parseTargetInput(
  input: string,
  service: string,
): {
  entityId: string;
  host: string;
  service: string;
  path: string;
  query: string;
  idrtoUri: string;
} {
  const trimmed = input.trim();
  if (!trimmed) throw new IdrError("invalid_uri", "Empty target host");

  if (trimmed.toLowerCase().endsWith(IDR_TO_HOST_SUFFIX)) {
    throw new IdrError(
      "invalid_uri",
      "Cannot parse *.idr.to hostnames locally (labels may be opaque hashes). Use a .idr synthetic hostname or idrto: URI.",
    );
  }

  validateHostSuffix(trimmed);

  if (trimmed.startsWith("idrto:")) {
    const parsed = parseIdrtoUri(trimmed);
    return { ...parsed, path: "", query: "", idrtoUri: trimmed };
  }

  if (trimmed.startsWith("https://idr.to/")) {
    const parsed = parseIdrtoUri(trimmed);
    return { ...parsed, path: "", query: "", idrtoUri: trimmed };
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    throw new IdrError(
      "invalid_uri",
      "HTTPS targets must use https://idr.to/... canonical paths, not *.idr.to hostnames",
    );
  }

  if (trimmed.toLowerCase().endsWith(IDR_HOST_SUFFIX)) {
    const { entityId, host } = parseIdrHostname(trimmed);
    const idrtoUri = formatIdrtoUri(entityId, host, service);
    return { entityId, host, service, path: "", query: "", idrtoUri };
  }

  throw new IdrError(
    "invalid_uri",
    "Unrecognized target host format — use host.entity.idr or idrto:…",
  );
}

function parseIdrtoUri(uri: string): {
  entityId: string;
  host: string;
  service: string;
} {
  let path: string;
  if (uri.startsWith("idrto:")) {
    path = uri.slice("idrto:".length);
  } else if (uri.startsWith("https://idr.to/")) {
    path = uri.slice("https://idr.to/".length);
  } else {
    throw new IdrError("invalid_uri", "URI must start with idrto: or https://idr.to/");
  }

  const marker = path.indexOf(IDRTO_V2_MARKER);
  if (marker >= 0) {
    const encodedEntity = path.slice(0, marker);
    const rest = path.slice(marker + IDRTO_V2_MARKER.length);
    const entityId = idrUnescapeEntity(encodedEntity);
    return parseHostService(entityId, rest);
  }

  const slash1 = path.indexOf("/");
  if (slash1 < 0) throw new IdrError("invalid_uri", "Missing host and service");
  const entityId = decodeURIComponent(path.slice(0, slash1));
  const rest = path.slice(slash1 + 1);
  return parseHostService(entityId, rest);
}

function parseHostService(
  entityId: string,
  rest: string,
): { entityId: string; host: string; service: string } {
  const slash2 = rest.lastIndexOf("/");
  if (slash2 < 0) throw new IdrError("invalid_uri", "Missing service component");
  const host = rest.slice(0, slash2);
  const svc = rest.slice(slash2 + 1);
  if (!entityId) throw new IdrError("invalid_uri", "Empty entity-id");
  if (!host) throw new IdrError("invalid_uri", "Empty host");
  if (!svc) throw new IdrError("invalid_uri", "Empty service");
  validateHostLabels(host);
  if (/^\d+$/.test(svc)) {
    const port = Number(svc);
    if (port < 1 || port > 65535) throw new IdrError("invalid_uri", "Port out of range");
    return { entityId, host, service: svc };
  }
  if (!SERVICE_NAME_RE.test(svc)) {
    throw new IdrError("invalid_uri", "Invalid service name");
  }
  return { entityId, host, service: svc };
}

function validateHostLabels(host: string): void {
  const labels = host.split(".");
  if (labels.length === 0 || labels.some((l) => !l || !LABEL_RE.test(l))) {
    throw new IdrError("invalid_uri", "Invalid host labels");
  }
}
