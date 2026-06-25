import { apiBase } from "../constants";
import { IdrError } from "../errors/IdrError";
import type { BillingStatus, HostIdentityDocument, ResolveResponse } from "../types";

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

export async function fetchResolveChallenge(): Promise<{ challenge_id: string; nonce: string }> {
  return apiFetch("/v1/resolve/challenge");
}

export async function resolveWithHostIdentity(
  uri: string,
  hostIdentity: HostIdentityDocument,
  challenge: { challenge_id: string; nonce: string; pop_signature: string },
): Promise<ResolveResponse> {
  return apiFetch<ResolveResponse>("/resolve", {
    method: "POST",
    body: JSON.stringify({
      uri,
      host_identity: hostIdentity,
      challenge_id: challenge.challenge_id,
      nonce: challenge.nonce,
      pop_signature: challenge.pop_signature,
    }),
  });
}

export async function registerSourceIdentity(
  bearer: string,
  entityId: string,
  host: string,
  publicKeyBase64Url: string,
): Promise<{ host_identity: HostIdentityDocument }> {
  return apiFetch(`/entities/${encodeURIComponent(entityId)}/source-identities`, {
    method: "POST",
    bearer,
    body: JSON.stringify({ host, public_key: publicKeyBase64Url }),
  });
}

export async function fetchBillingStatus(bearer: string): Promise<BillingStatus> {
  const status = await apiFetch<{ bundle_active: boolean; acl_tier?: "personal" | "enterprise" }>(
    "/v1/billing/status",
    { bearer },
  );
  return {
    bundle_active: status.bundle_active,
    acl_tier: status.acl_tier,
  };
}

export async function accountLogin(entityId: string, password: string): Promise<{
  access_token: string;
  entity_id: string;
  expires_in: number;
  scope: string;
}> {
  return apiFetch("/auth/cli/login", {
    method: "POST",
    body: JSON.stringify({ entity_id: entityId, password }),
  });
}

export async function createCheckout(
  bearer: string,
  bundle: "personal" | "enterprise",
  quantity = 1,
): Promise<{ url?: string; checkout_url?: string }> {
  return apiFetch("/v1/billing/checkout", {
    method: "POST",
    bearer,
    body: JSON.stringify({ bundle, quantity }),
  });
}
