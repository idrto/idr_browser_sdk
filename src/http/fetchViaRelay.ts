import { buildRelayHttpsUrl } from "../addressing/def";
import type { ParsedTarget } from "../types";
import type { IdrFetchInit } from "../types";

export type RelayFetchResult = {
  status: number;
  headers: Record<string, string>;
  body: ArrayBuffer;
};

export function relayUrlForTarget(target: ParsedTarget, requestPath: string): string {
  const basePath = target.path ?? "";
  const suffix = `${basePath}${requestPath.startsWith("/") ? requestPath : `/${requestPath}`}`;
  return buildRelayHttpsUrl(target.entityId, target.host, target.service, suffix);
}

export async function fetchViaRelay(
  target: ParsedTarget,
  path: string,
  init?: IdrFetchInit,
): Promise<RelayFetchResult> {
  const url = relayUrlForTarget(target, path);
  const headers = new Headers(init?.headers);
  const controller = new AbortController();
  const timeoutMs = init?.timeoutMs ?? 60_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (init?.signal) {
    init.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const res = await fetch(url, {
      method: init?.method ?? "GET",
      headers,
      body: init?.body as BodyInit | undefined,
      signal: controller.signal,
    });
    const body = await res.arrayBuffer();
    const outHeaders: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      outHeaders[key] = value;
    });
    return { status: res.status, headers: outHeaders, body };
  } finally {
    clearTimeout(timer);
  }
}
