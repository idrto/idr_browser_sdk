const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const DEVICE_ID_LENGTH = 15;

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (padded.length % 4)) % 4;
  const b64 = padded + "=".repeat(pad);
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)!;
  return out;
}

export function hexDecode(hex: string): Uint8Array {
  const clean = hex.trim();
  if (clean.length % 2 !== 0) throw new Error("Invalid hex");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function randomUuid(): string {
  return crypto.randomUUID();
}

export function encodeDeviceIdBase32(raw: Uint8Array): string {
  if (raw.length !== DEVICE_ID_LENGTH) throw new Error("Invalid device id length");
  let chars = "";
  let buffer = 0;
  let bits = 0;
  for (const byte of raw) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      chars += CROCKFORD[(buffer >> bits) & 0x1f]!;
    }
  }
  if (bits > 0) chars += CROCKFORD[(buffer << (5 - bits)) & 0x1f]!;
  const padded = chars.slice(0, 24).padEnd(24, "0");
  return padded.match(/.{1,4}/g)!.join("-");
}

import { sha256 } from "../crypto/webCrypto";

export function deriveDeviceIdRaw(publicKey: Uint8Array): Promise<Uint8Array> {
  return sha256(publicKey).then((hash) => hash.slice(0, DEVICE_ID_LENGTH));
}
