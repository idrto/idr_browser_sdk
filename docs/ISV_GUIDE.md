# ISV integration guide

## What you configure (dev time only)

```ts
const client = IdrClient.forService("ollama");
```

`"ollama"` is an application-chosen URI segment. The SDK forwards it opaquely; only the target agent's `[services.ollama]` config resolves the local dial address. End-users never choose the service.

## BYOM (Bring Your Own Machine)

Users run the workload on their hardware — Mac Mini, Linux GPU box, etc. They install Ollama (or your target service) plus an idr.to target agent. Your app only supplies connectivity via the SDK. You do not pay for or host inference GPUs.

## Bundle size

~**11 KB gzip** (ESM entry, minified). Auth panel chunk ~1.3 KB gzip when loaded. WebRTC is built into the browser.

## What end-users provide

- **Target host** — e.g. `edge-gpu-1.user@example.com.idr` (your UI)
- **Credentials** — via SDK auth panel only (entity ID + password)

## Required integration pattern

```ts
await client.ensureSession({ interactive: true, mount: authElement });
await client.connect({ host: userHost });
const res = await client.fetch("/api/tags");
```

## Forbidden

| Do not | Why |
|--------|-----|
| Add your own password or token inputs | Credentials must not touch ISV JS state outside SDK UI |
| POST tokens to your API | ISV servers must never see idr.to secrets |
| Pass tokens to `connect()` | Auth is handled internally via Signed Host-Identity |
| Override `idr.to` URLs | Platform endpoints are hardcoded |

## CSP

Allow:

- `connect-src https://idr.to wss://idr.to`
- WebRTC (no extra directive in most browsers)

## Frameworks

See [FRAMEWORKS.md](./FRAMEWORKS.md).
