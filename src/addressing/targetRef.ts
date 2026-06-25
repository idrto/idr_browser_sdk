export type TargetKind = "port" | "service";
export type Transport = "tcp" | "udp";

export type TargetRef = {
  kind: TargetKind;
  value: string;
  transport: Transport;
};

export const TARGET_REF_PREFIX = "@";

export function targetRefFromUriSegment(segment: string): TargetRef | null {
  if (!segment) return null;
  const first = segment[0];
  if (first >= "0" && first <= "9") {
    const m = segment.match(/^(\d{1,5})([Uu][Dd][Pp])?$/);
    if (!m) return null;
    return {
      kind: "port",
      value: segment,
      transport: m[2] ? "udp" : "tcp",
    };
  }
  if ((first >= "a" && first <= "z") || (first >= "A" && first <= "Z")) {
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(segment)) return null;
    return { kind: "service", value: segment, transport: "tcp" };
  }
  return null;
}

export function encodeTargetRefOpen(target: TargetRef): { host: string; port: number; transport: Transport } {
  return {
    host: `${TARGET_REF_PREFIX}${target.value}`,
    port: 0,
    transport: target.transport,
  };
}

export function parseTargetRefFromOpen(
  host: string,
  port: number,
  transport: Transport = "tcp",
): TargetRef {
  if (port === 0 && host.startsWith(TARGET_REF_PREFIX)) {
    const value = host.slice(TARGET_REF_PREFIX.length);
    const kind = value[0]! >= "0" && value[0]! <= "9" ? "port" : "service";
    return { kind, value, transport };
  }
  return {
    kind: "port",
    value: port > 0 ? String(port) : host,
    transport,
  };
}
