import { IdrError } from "../errors/IdrError";
import { classifyServiceSegment } from "../addressing/parseTarget";

const NAMED: Record<string, number> = {
  ssh: 22,
  http: 80,
  https: 443,
  postgres: 5432,
  postgresql: 5432,
  psql: 5432,
  ollama: 11434,
};

export function resolveServicePort(service: string): number {
  const classified = classifyServiceSegment(service);
  if (classified.kind === "port" && classified.port !== undefined) {
    return classified.port;
  }
  const lower = service.toLowerCase();
  if (lower in NAMED) return NAMED[lower]!;
  throw new IdrError("invalid_service", `Unknown service: ${service}`);
}

export function resolveServiceTransport(service: string): "tcp" | "udp" {
  return classifyServiceSegment(service).transport;
}
