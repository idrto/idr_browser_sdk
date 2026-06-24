import { describe, expect, it } from "vitest";
import {
  buildIdrHostname,
  formatIdrtoUri,
  parseTargetInput,
} from "../src/addressing/parseTarget";
import { idrEscapeEntity, idrUnescapeEntity } from "../src/addressing/idr-escape";

describe("addressing", () => {
  it("escapes entity id for idrto URI", () => {
    expect(idrEscapeEntity("user@example.com")).toBe("user-40example.com");
    expect(idrUnescapeEntity("user-40example-2Ecom")).toBe("user@example.com");
  });

  it("formats idrto v2 URI", () => {
    const uri = formatIdrtoUri("user@example.com", "edge-gpu-1", "ollama");
    expect(uri).toBe("idrto:user-40example.com/--/edge-gpu-1/ollama");
  });

  it("builds synthetic .idr hostname (encode-only)", () => {
    expect(buildIdrHostname("user@example.com", "laptop")).toBe(
      "laptop.user-40example-2Ecom.idr",
    );
  });

  it("parses .idr hostname", () => {
    const parsed = parseTargetInput("edge-gpu-1.user-40example-2Ecom.idr", "ollama");
    expect(parsed.entityId).toBe("user@example.com");
    expect(parsed.host).toBe("edge-gpu-1");
    expect(parsed.service).toBe("ollama");
  });

  it("rejects opaque *.idr.to labels", () => {
    expect(() => parseTargetInput("a1b2c3d4e5f6.example.idr.to", "ollama")).toThrow(/opaque/i);
  });

  it("parses idrto URI directly", () => {
    const uri = "idrto:user-40example.com/--/laptop/11434";
    const parsed = parseTargetInput(uri, "ollama");
    expect(parsed.service).toBe("11434");
    expect(parsed.host).toBe("laptop");
  });
});
