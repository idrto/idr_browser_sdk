import { resolveServicePort } from "../src/services/resolvePort";
import { describe, expect, it } from "vitest";

describe("resolveServicePort", () => {
  it("resolves named services", () => {
    expect(resolveServicePort("ollama")).toBe(11434);
    expect(resolveServicePort("443")).toBe(443);
  });
});
