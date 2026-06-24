import { describe, expect, it } from "vitest";
import {
  buildIdrHostname,
  classifyServiceSegment,
  formatIdrtoUri,
  parseIdrHostname,
  parseTargetInput,
} from "../src/addressing/parseTarget";

describe("addressing", () => {
  it("formats idrto host~entity URI", () => {
    const uri = formatIdrtoUri("user@example.com", "edge-gpu-1", "ollama");
    expect(uri).toBe("idrto:edge-gpu-1~user-40example.com/ollama");
  });

  it("parses idrto URI", () => {
    const uri = "idrto:laptop~user-40example.com/11434";
    const p = parseTargetInput(uri, "ollama");
    expect(p.entityId).toBe("user@example.com");
    expect(p.host).toBe("laptop");
    expect(p.service).toBe("11434");
    expect(p.transport).toBe("tcp");
  });

  it("parses UDP port suffix", () => {
    const classified = classifyServiceSegment("53UDP");
    expect(classified.port).toBe(53);
    expect(classified.transport).toBe("udp");
  });

  it("builds and parses .idr hostname", () => {
    const host = buildIdrHostname("user@example.com", "edge-gpu-1");
    expect(host).toBe("edge-gpu-1.user-40example-2Ecom.idr");
    const parsed = parseIdrHostname(host);
    expect(parsed.entityId).toBe("user@example.com");
    expect(parsed.host).toBe("edge-gpu-1");
  });

  it("rejects opaque idr.to labels", () => {
    expect(() => parseTargetInput("a1b2c3d4e5f6.example.idr.to", "ollama")).toThrow(
      /opaque/i,
    );
  });
});
