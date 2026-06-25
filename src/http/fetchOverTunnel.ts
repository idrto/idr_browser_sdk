import type { TunnelStream } from "../tunnel/multiplexer";
import type { TargetRef } from "../addressing/targetRef";
import { IdrError } from "../errors/IdrError";
import type { IdrFetchInit } from "../types";

function buildHttpRequest(
  method: string,
  path: string,
  hostHeader: string,
  headers: Record<string, string>,
  body?: Uint8Array,
): Uint8Array {
  const lines = [`${method.toUpperCase()} ${path} HTTP/1.1`, `Host: ${hostHeader}`, "Connection: close"];
  const merged = { ...headers };
  if (body && !merged["Content-Length"] && !merged["content-length"]) {
    merged["Content-Length"] = String(body.length);
  }
  for (const [k, v] of Object.entries(merged)) {
    lines.push(`${k}: ${v}`);
  }
  lines.push("", "");
  const head = new TextEncoder().encode(lines.join("\r\n"));
  if (!body?.length) return head;
  const out = new Uint8Array(head.length + body.length);
  out.set(head);
  out.set(body, head.length);
  return out;
}

function parseHttpResponse(buffer: Uint8Array): {
  status: number;
  headers: Record<string, string>;
  body: Uint8Array;
} {
  const text = new TextDecoder("latin1").decode(buffer);
  const sep = text.indexOf("\r\n\r\n");
  if (sep < 0) throw new IdrError("protocol_error", "Incomplete HTTP response");
  const head = text.slice(0, sep);
  const bodyBytes = buffer.slice(sep + 4);

  const lines = head.split("\r\n");
  const statusLine = lines[0] ?? "";
  const statusMatch = /HTTP\/\d\.\d (\d+)/.exec(statusLine);
  const status = statusMatch ? Number(statusMatch[1]) : 0;

  const headers: Record<string, string> = {};
  for (const line of lines.slice(1)) {
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    headers[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
  }

  let body = bodyBytes;
  const cl = headers["content-length"];
  if (cl) {
    const len = Number(cl);
    if (Number.isFinite(len)) body = bodyBytes.slice(0, len);
  }

  return { status, headers, body };
}

export type FetchOverTunnelResult = {
  status: number;
  headers: Record<string, string>;
  body: Uint8Array;
  text: () => string;
  json: <T = unknown>() => T;
};

export function fetchOverTunnel(
  openTarget: (target: TargetRef) => TunnelStream,
  target: TargetRef,
  path: string,
  init: IdrFetchInit = {},
): Promise<FetchOverTunnelResult> {
  const method = init.method ?? "GET";
  const urlPath = path.startsWith("/") ? path : `/${path}`;
  const body =
    init.body == null
      ? undefined
      : typeof init.body === "string"
        ? new TextEncoder().encode(init.body)
        : init.body instanceof Uint8Array
          ? init.body
          : new Uint8Array(init.body);

  const hostHeader = target.kind === "service" ? target.value : `127.0.0.1`;
  const reqBytes = buildHttpRequest(method, urlPath, hostHeader, init.headers ?? {}, body);

  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    const stream = openTarget(target);

    const timeoutMs = init.timeoutMs ?? 60_000;
    const timer = setTimeout(() => {
      stream.close();
      reject(new IdrError("timeout", "Request timed out"));
    }, timeoutMs);

    const onAbort = () => {
      clearTimeout(timer);
      stream.close();
      reject(new IdrError("aborted", "Request aborted"));
    };
    init.signal?.addEventListener("abort", onAbort, { once: true });

    stream.onData((data) => chunks.push(data));
    stream.onClose(() => {
      clearTimeout(timer);
      init.signal?.removeEventListener("abort", onAbort);
      try {
        const total = chunks.reduce((n, c) => n + c.length, 0);
        const merged = new Uint8Array(total);
        let off = 0;
        for (const c of chunks) {
          merged.set(c, off);
          off += c.length;
        }
        const parsed = parseHttpResponse(merged);
        resolve({
          ...parsed,
          text: () => new TextDecoder().decode(parsed.body),
          json: <T>() => JSON.parse(new TextDecoder().decode(parsed.body)) as T,
        });
      } catch (err) {
        reject(err instanceof Error ? err : new IdrError("protocol_error", String(err)));
      }
    });

    stream.write(reqBytes);
    if (body) {
      /* body already in request */
    }
  });
}

export class IdrResponse {
  constructor(
    readonly status: number,
    readonly headers: Record<string, string>,
    private readonly bodyBytes: Uint8Array,
  ) {}

  async text(): Promise<string> {
    return new TextDecoder().decode(this.bodyBytes);
  }

  async json<T = unknown>(): Promise<T> {
    return JSON.parse(await this.text()) as T;
  }

  get ok(): boolean {
    return this.status >= 200 && this.status < 300;
  }
}
