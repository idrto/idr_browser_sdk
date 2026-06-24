export type Envelope = {
  v: number;
  id: string;
  type: string;
  ts: string;
  payload: Record<string, unknown>;
};

export function createEnvelope(
  type: string,
  id: string,
  payload: Record<string, unknown>,
): Envelope {
  return { v: 1, id, type, ts: new Date().toISOString(), payload };
}

export function parseEnvelope(data: string): Envelope {
  const parsed = JSON.parse(data) as Envelope;
  if (parsed.v !== 1 || !parsed.id || !parsed.type || typeof parsed.payload !== "object") {
    throw new Error("Invalid envelope");
  }
  return parsed;
}

export function serializeEnvelope(env: Envelope): string {
  return JSON.stringify(env);
}
