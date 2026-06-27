import { IDR_RELAY_BASE_DOMAIN } from "../constants";

const MAX_LABEL_LENGTH = 63;

function isLiteralByte(byte: number): boolean {
  return (byte >= 0x61 && byte <= 0x7a) || (byte >= 0x30 && byte <= 0x39);
}

function canonicalize(input: string): string {
  return input
    .split("")
    .map((ch) => (ch >= "A" && ch <= "Z" ? ch.toLowerCase() : ch))
    .join("");
}

function ensureFits(currentLen: number, addLen: number): void {
  if (currentLen + addLen > MAX_LABEL_LENGTH) {
    throw new Error("encoded label exceeds 63 characters");
  }
}

export function encodeDef(input: string): string {
  const canonical = canonicalize(input);
  let out = "";
  for (const ch of canonical) {
    const byte = ch.charCodeAt(0);
    if (isLiteralByte(byte)) {
      ensureFits(out.length, 1);
      out += ch;
    } else {
      const escape = `-${byte.toString(16).padStart(2, "0")}`;
      ensureFits(out.length, escape.length);
      out += escape;
    }
  }
  return out;
}

export function defHostnameForLocator(
  entityId: string,
  host: string,
  baseDomain = IDR_RELAY_BASE_DOMAIN,
): string {
  const locator = `${host}~${entityId}`;
  const label = encodeDef(locator);
  return `${label}.${baseDomain}`;
}

export function buildRelayHttpsUrl(
  entityId: string,
  host: string,
  service: string,
  pathSuffix = "",
  baseDomain = IDR_RELAY_BASE_DOMAIN,
): string {
  const defHost = defHostnameForLocator(entityId, host, baseDomain);
  const path = pathSuffix.startsWith("/") ? pathSuffix : pathSuffix ? `/${pathSuffix}` : "";
  return `https://${defHost}/${service}${path}`;
}
