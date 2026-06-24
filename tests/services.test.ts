import { describe, expect, it } from "vitest";
import { resolveServicePort, resolveServiceTransport } from "../src/services/resolvePort";

describe("resolvePort", () => {
  it("resolves named services", () => {
    expect(resolveServicePort("ollama")).toBe(11434);
    expect(resolveServicePort("443")).toBe(443);
  });

  it("resolves UDP transport", () => {
    expect(resolveServiceTransport("53UDP")).toBe("udp");
    expect(resolveServiceTransport("443")).toBe("tcp");
  });
});
