import { describe, expect, it } from "vitest";
import { loadOrCreateDeviceIdentity } from "../src/crypto/deviceIdentity";
import { ed25519KeyPairFromSeed, ed25519Sign, sha256 } from "../src/crypto/webCrypto";
import { base64UrlDecode, hexDecode } from "../src/util/encoding";

describe("webCrypto", () => {
  it("sha256 matches known vector", async () => {
    const hash = await sha256(new TextEncoder().encode("abc"));
    expect(Buffer.from(hash).toString("hex")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("ed25519 signs and verifies", async () => {
    const seed = hexDecode("9d61b19deffd5a60ba844af492ec2cc4c444fb989e99ddadbf6777ebc55fb4f5");
    const { privateKey, publicKeyRaw } = await ed25519KeyPairFromSeed(seed);
    const message = new TextEncoder().encode("test");
    const sig = await ed25519Sign(privateKey, message);
    const publicKey = await crypto.subtle.importKey(
      "raw",
      publicKeyRaw,
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    const ok = await crypto.subtle.verify({ name: "Ed25519" }, publicKey, sig, message);
    expect(ok).toBe(true);
  });
});

describe("deviceIdentity", () => {
  it("creates stable device id for stored seed", async () => {
    const seed = hexDecode("000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20");
    sessionStorage.setItem(
      "idr.sdk.device.v1",
      btoa(String.fromCharCode(...seed)),
    );
    const a = await loadOrCreateDeviceIdentity();
    const b = await loadOrCreateDeviceIdentity();
    expect(a.deviceIdBase32()).toBe(b.deviceIdBase32());
    expect(a.publicKeyBase64Url()).toBe(b.publicKeyBase64Url());
    const sig = await a.signNonceHex("aabbcc");
    expect(sig.length).toBeGreaterThan(10);
    expect(base64UrlDecode(sig).length).toBe(64);
  });
});
