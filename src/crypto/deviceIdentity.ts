import { sha256 } from "@noble/hashes/sha256";
import * as ed from "@noble/ed25519";
import {
  base64UrlEncode,
  deriveDeviceIdRaw,
  encodeDeviceIdBase32,
  hexDecode,
} from "../util/encoding";
import { DEVICE_KEY_STORAGE_KEY } from "../constants";

export type DeviceIdentity = {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
  deviceIdBase32: () => string;
  publicKeyBase64Url: () => string;
  signNonceHex: (nonceHex: string) => Promise<string>;
};

function loadStoredSeed(): Uint8Array | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(DEVICE_KEY_STORAGE_KEY);
  if (!raw) return null;
  try {
    const seed = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
    if (seed.length !== 32) return null;
    return seed;
  } catch {
    return null;
  }
}

function storeSeed(seed: Uint8Array): void {
  if (typeof sessionStorage === "undefined") return;
  const b64 = btoa(String.fromCharCode(...seed));
  sessionStorage.setItem(DEVICE_KEY_STORAGE_KEY, b64);
}

function randomSeed(): Uint8Array {
  const seed = new Uint8Array(32);
  crypto.getRandomValues(seed);
  return seed;
}

export async function loadOrCreateDeviceIdentity(): Promise<DeviceIdentity> {
  let seed = loadStoredSeed();
  if (!seed) {
    seed = randomSeed();
    storeSeed(seed);
  }
  const privateKey = seed;
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  const deviceIdRaw = deriveDeviceIdRaw(publicKey);
  const deviceIdBase32 = encodeDeviceIdBase32(deviceIdRaw);

  return {
    publicKey,
    privateKey,
    deviceIdBase32: () => deviceIdBase32,
    publicKeyBase64Url: () => base64UrlEncode(publicKey),
    async signNonceHex(nonceHex: string) {
      const nonce = hexDecode(nonceHex);
      const sig = await ed.signAsync(nonce, privateKey);
      return base64UrlEncode(sig);
    },
  };
}

export { sha256 };
