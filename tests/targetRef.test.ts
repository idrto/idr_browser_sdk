import { describe, expect, it } from "vitest";
import { targetRefFromUriSegment, encodeTargetRefOpen } from "../src/addressing/targetRef";
import { resolveServiceTransport } from "../src/services/resolvePort";

describe("targetRef", () => {
  it("builds service ref from URI segment", () => {
    const ref = targetRefFromUriSegment("ollama");
    expect(ref).toEqual({ kind: "service", value: "ollama", transport: "tcp" });
    const open = encodeTargetRefOpen(ref!);
    expect(open).toEqual({ host: "@ollama", port: 0, transport: "tcp" });
  });

  it("builds port ref without resolving semantics", () => {
    const ref = targetRefFromUriSegment("443");
    expect(ref?.kind).toBe("port");
    expect(ref?.value).toBe("443");
  });

  it("resolveServiceTransport is syntax-only", () => {
    expect(resolveServiceTransport("53UDP")).toBe("udp");
    expect(resolveServiceTransport("ollama")).toBe("tcp");
  });
});
