import { apiBase } from "../constants";
import { IdrError } from "../errors/IdrError";
import type { BillingStatus, ResolveResponse } from "../types";

const API_HEADERS: Record<string, string> = {
  Accept: "application/json",
  "Accept-Version": "1",
};

async function apiFetch<T>(
  path: string,
  init: RequestInit & { bearer?: string } = {},
): Promise<T> {
  const headers = new Headers({ ...API_HEADERS, ...(init.headers as Record<string, string> | undefined) });
  if (init.bearer) headers.set("Authorization", `Bearer ${init.bearer}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${apiBase()}${path}`, { ...init, headers });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  if (text) {
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      /* ignore */
    }
  }

  if (!res.ok) {
    const code = String(json.code ?? "api_error");
    const message = String(json.message ?? res.statusText);
    throw new IdrError(code, message);
  }
  return json as T;
}

export async function resolveTarget(
  bearer: string,
  uri: string,
  sourceHost: string,
): Promise<ResolveResponse> {
  return apiFetch<ResolveResponse>("/resolve", {
    method: "POST",
    bearer,
    body: JSON.stringify({ uri, source_host: sourceHost }),
  });
}

export async function fetchBillingStatus(bearer: string): Promise<BillingStatus & { signaling?: unknown }> {
  const status = await apiFetch<{
    signaling_active: boolean;
    turn?: Array<{ host: string | null; status: string }>;
  }>("/v1/billing/status", { bearer });
  return {
    signaling_active: status.signaling_active,
    turn: status.turn,
  };
}

export async function browserLogin(entityId: string, password: string): Promise<{
  access_token: string;
  entity_id: string;
  expires_in: number;
  scope: string;
}> {
  return apiFetch("/v1/auth/browser/login", {
    method: "POST",
    body: JSON.stringify({ entity_id: entityId, password }),
  });
}

/** @deprecated Use browserLogin — portal tokens are read-only */
export const portalLogin = browserLogin;

export async function exchangeAccessKey(accessKey: string): Promise<{
  access_token: string;
  entity_id: string;
  host?: string;
  target_entity_id?: string;
  target_host?: string;
  expires_in: number;
}> {
  return apiFetch("/v1/auth/access-key/exchange", {
    method: "POST",
    body: JSON.stringify({ access_key: accessKey }),
  });
}

export async function createCheckout(
  bearer: string,
  product: "signaling" | "turn",
  host?: string,
): Promise<{ url?: string; checkout_url?: string }> {
  return apiFetch("/v1/billing/checkout", {
    method: "POST",
    bearer,
    body: JSON.stringify({ product, host }),
  });
}

export async function createAccessKey(
  bearer: string,
  targetEntityId: string,
  targetHost: string,
  opts?: { label?: string; expiresInSeconds?: number },
): Promise<{ id: string; access_key: string; key_prefix: string }> {
  return apiFetch("/v1/access-keys", {
    method: "POST",
    bearer,
    body: JSON.stringify({
      target_entity_id: targetEntityId,
      target_host: targetHost,
      label: opts?.label,
      expires_in_seconds: opts?.expiresInSeconds,
    }),
  });
}

export async function listAccessKeys(bearer: string): Promise<{ items: unknown[] }> {
  return apiFetch("/v1/access-keys", { bearer });
}

export async function revokeAccessKey(bearer: string, id: string): Promise<void> {
  await apiFetch(`/v1/access-keys/${id}`, { method: "DELETE", bearer });
}
