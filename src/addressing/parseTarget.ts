import { ALLOWED_HOST_SUFFIXES } from "../constants";
import { IdrError } from "../errors/IdrError";
import { idrEscapeEntity, idrUnescapeEntity } from "./idr-escape";

export const IDR_HOST_SUFFIX = ".idr";
export const IDR_TO_HOST_SUFFIX = ".idr.to";

const LABEL_RE = /^[A-Za-z0-9-]+$/;

export type Transport = "tcp" | "udp";

export function classifyServiceSegment(seg: string): {
  kind: "port" | "service";
  port?: number;
  transport: Transport;
  raw: string;
} {
  if (!seg || !/^[0-9a-zA-Z]/.test(seg)) {
    throw new IdrError("invalid_uri", "Invalid service-or-port segment");
  }
  if (/^[0-9]/.test(seg)) {
    const m = seg.match(/^(\d{1,5})([Uu][Dd][Pp])?$/);
    if (!m) throw new IdrError("invalid_uri", "Invalid port segment");
    const port = Number(m[1]);
    if (port > 65535) throw new IdrError("invalid_uri", "Port out of range");
    return {
      kind: "port",
      port,
      transport: m[2] ? "udp" : "tcp",
      raw: seg,
    };
  }
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(seg)) {
    throw new IdrError("invalid_uri", "Invalid service name");
  }
  return { kind: "service", transport: "tcp", raw: seg };
}

export function validateHostSuffix(hostOrUrl: string): void {
  const lower = hostOrUrl.toLowerCase();
  const ok = ALLOWED_HOST_SUFFIXES.some((s) => lower.endsWith(s));
  if (!ok && !hostOrUrl.startsWith("idrto:")) {
    throw new IdrError(
      "invalid_host",
      `Target must use suffix ${ALLOWED_HOST_SUFFIXES.join(" or ")} (use .idr synthetic hostnames or idrto: URIs; *.idr.to labels are opaque)`,
    );
  }
}

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
  return `idrto:${host}~${encoded}/${service}`;
}

export function parseTargetInput(
  input: string,
  service: string,
): {
  entityId: string;
  host: string;
  service: string;
  transport: Transport;
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
    return { ...parsed, path: parsed.path ?? "", query: parsed.query ?? "", idrtoUri: trimmed };
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    throw new IdrError(
      "invalid_uri",
      "Use idrto: URIs or *.idr synthetic hostnames — not HTTPS URLs",
    );
  }

  if (trimmed.toLowerCase().endsWith(IDR_HOST_SUFFIX)) {
    const { entityId, host } = parseIdrHostname(trimmed);
    const classified = classifyServiceSegment(service);
    const idrtoUri = formatIdrtoUri(entityId, host, service);
    return {
      entityId,
      host,
      service,
      transport: classified.transport,
      path: "",
      query: "",
      idrtoUri,
    };
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
  transport: Transport;
  path?: string;
  query?: string;
} {
  if (!uri.startsWith("idrto:")) {
    throw new IdrError("invalid_uri", "URI must start with idrto:");
  }
  let pathPart = uri.slice("idrto:".length);

  const q = pathPart.indexOf("?");
  let query: string | undefined;
  if (q >= 0) {
    query = pathPart.slice(q + 1);
    pathPart = pathPart.slice(0, q);
  }

  const slash = pathPart.indexOf("/");
  if (slash < 0) throw new IdrError("invalid_uri", "Missing service-or-port");
  const locator = pathPart.slice(0, slash);
  const remainder = pathPart.slice(slash + 1);
  const { host, entityId } = parseLocator(locator);

  const slash2 = remainder.indexOf("/");
  const serviceOrPort = slash2 < 0 ? remainder : remainder.slice(0, slash2);
  const pathSuffix = slash2 < 0 ? undefined : remainder.slice(slash2);
  const classified = classifyServiceSegment(serviceOrPort);

  return {
    entityId,
    host,
    service: classified.raw,
    transport: classified.transport,
    path: pathSuffix,
    query,
  };
}

function parseLocator(locator: string): { host: string; entityId: string } {
  const tilde = locator.indexOf("~");
  if (tilde < 0) throw new IdrError("invalid_uri", "Missing ~ between host and entity-id");
  const host = locator.slice(0, tilde);
  const entityPart = locator.slice(tilde + 1);
  if (!host || !entityPart) throw new IdrError("invalid_uri", "Empty host or entity-id");
  validateHostLabels(host);
  const entityId = idrUnescapeEntity(entityPart);
  if (!entityId) throw new IdrError("invalid_uri", "Empty entity-id");
  return { host, entityId };
}

function validateHostLabels(host: string): void {
  const labels = host.split(".");
  if (labels.length === 0 || labels.some((l) => !l || !LABEL_RE.test(l))) {
    throw new IdrError("invalid_uri", "Invalid host labels");
  }
}
