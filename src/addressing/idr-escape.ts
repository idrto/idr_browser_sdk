const ESCAPE_MAP: Record<string, string> = {
  "-": "-2D",
  "@": "-40",
  ":": "-3A",
  "/": "-2F",
  "%": "-25",
  ".": "-2E",
};

const ESCAPE_RE = /-([0-9A-Fa-f]{2})/g;

export function idrEscapeEntity(entityId: string, dnsLabel = false): string {
  let out = "";
  for (const ch of entityId) {
    if (ch === "." && !dnsLabel) {
      out += ch;
      continue;
    }
    out += ESCAPE_MAP[ch] ?? ch;
  }
  return out;
}

export function idrUnescapeEntity(encoded: string): string {
  return encoded.replace(ESCAPE_RE, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}
