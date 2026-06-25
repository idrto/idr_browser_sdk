import { describe, expect, it } from "vitest";
import { IdrClient } from "../src/IdrClient";

describe("credential isolation", () => {
  it("does not expose secret getters on client", () => {
    const client = IdrClient.forService("ollama");
    expect("getAccessKey" in client).toBe(false);
    expect("accessKey" in client).toBe(false);
    expect("loginAccessKey" in client).toBe(false);
  });

  it("authMode is none before login", () => {
    expect(IdrClient.forService("ollama").authMode()).toBe("none");
  });

  it("requires auth before connect", async () => {
    const client = IdrClient.forService("ollama");
    await expect(client.connect({ host: "edge-gpu-1.test.idr" })).rejects.toMatchObject({
      code: "auth_required",
    });
  });
});
