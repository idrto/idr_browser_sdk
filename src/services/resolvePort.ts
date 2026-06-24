import { IdrError } from "../errors/IdrError";

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
  const lower = service.toLowerCase();
  if (lower in NAMED) return NAMED[lower]!;
  const n = Number(service);
  if (Number.isInteger(n) && n >= 1 && n <= 65535) return n;
  throw new IdrError("invalid_service", `Unknown service: ${service}`);
}
