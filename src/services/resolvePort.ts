import { classifyServiceSegment } from "../addressing/parseTarget";
import type { Transport } from "../addressing/parseTarget";

/** Syntax-only transport from a URI service-or-port segment (no port resolution). */
export function resolveServiceTransport(service: string): Transport {
  return classifyServiceSegment(service).transport;
}
