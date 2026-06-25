/** PKCS#8 prefix for a 32-byte Ed25519 seed (RFC 8410). */
const ED25519_PKCS8_PREFIX = new Uint8Array([
  0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20,
]);

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function ed25519Pkcs8FromSeed(seed: Uint8Array): Uint8Array {
  if (seed.length !== 32) throw new Error("Ed25519 seed must be 32 bytes");
  const out = new Uint8Array(ED25519_PKCS8_PREFIX.length + 32);
  out.set(ED25519_PKCS8_PREFIX);
  out.set(seed, ED25519_PKCS8_PREFIX.length);
  return out;
}

export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", toArrayBuffer(data));
  return new Uint8Array(digest);
}

export type Ed25519KeyPair = {
  privateKey: CryptoKey;
  publicKeyRaw: Uint8Array;
};

export async function ed25519KeyPairFromSeed(seed: Uint8Array): Promise<Ed25519KeyPair> {
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    toArrayBuffer(ed25519Pkcs8FromSeed(seed)),
    { name: "Ed25519" },
    true,
    ["sign"],
  );
  const jwk = await crypto.subtle.exportKey("jwk", privateKey);
  if (!jwk.x) throw new Error("Ed25519 JWK missing public key");
  const publicKey = await crypto.subtle.importKey(
    "jwk",
    { kty: "OKP", crv: "Ed25519", x: jwk.x },
    { name: "Ed25519" },
    true,
    ["verify"],
  );
  const publicKeyRaw = new Uint8Array(await crypto.subtle.exportKey("raw", publicKey));
  return { privateKey, publicKeyRaw };
}

export async function ed25519Sign(privateKey: CryptoKey, message: Uint8Array): Promise<Uint8Array> {
  const sig = await crypto.subtle.sign({ name: "Ed25519" }, privateKey, toArrayBuffer(message));
  return new Uint8Array(sig);
}
