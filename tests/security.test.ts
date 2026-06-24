import { describe, expect, it } from "vitest";
import { IdrClient } from "../src/IdrClient";

describe("credential isolation", () => {
  it("does not expose access key getters on client", () => {
    const client = IdrClient.forService("ollama");
    expect("getAccessKey" in client).toBe(false);
    expect("accessKey" in client).toBe(false);
  });

  it("rejects accessKey in connect()", async () => {
    const client = IdrClient.forService("ollama");
    await expect(
      client.connect({ host: "edge-gpu-1.test.idr", accessKey: "idr_ak_secret" } as never),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("authMode is none before login", () => {
    expect(IdrClient.forService("ollama").authMode()).toBe("none");
  });
});
