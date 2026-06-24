# ISV integration guide

## What you configure (dev time only)

```ts
const client = IdrClient.forService("ollama");
```

Service name maps to target port (e.g. `ollama` → 11434). End-users never choose the service.

## What end-users provide

- **Target host** — e.g. `edge-gpu-1.user@example.com.idr` (your UI)
- **Credentials** — via SDK auth panel only (account or access key)

## Required integration pattern

```ts
await client.ensureSession({ interactive: true, mount: authElement });
await client.connect({ host: userHost });
const res = await client.fetch("/api/tags");
```

## Forbidden

| Do not | Why |
|--------|-----|
| Add your own access-key input | Keys must not touch ISV JS state or DOM outside SDK shadow root |
| POST keys/tokens to your API | ISV servers must never see secrets |
| Pass `accessKey` to `connect()` | SDK throws `forbidden` |
| Override `idr.to` URLs | Platform endpoints are hardcoded |

## CSP

Allow:

- `connect-src https://idr.to wss://idr.to`
- WebRTC (no extra directive in most browsers)

## Frameworks

See [FRAMEWORKS.md](./FRAMEWORKS.md).
