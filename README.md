# @idrto/idr_browser_sdk

Browser SDK for idr.to — WebRTC access to on-prem target agents (Ollama, HTTP services, etc.).

ISVs hardcode **service** at dev time; end-users enter **target host** only. Auth, billing, and platform URLs are built into the SDK.

## Bring Your Own Machine (BYOM)

Users run workloads on **their own hardware** (Mac Mini, GPU server, etc.) — you do not host inference. They install a target agent + local service (e.g. Ollama on port 11434); your app connects with `IdrClient.forService("ollama")` and the host they provide. Ideal for on-device AI without shipping GPU infrastructure.

## Bundle size

Production build (`npm run build`, minified + gzip). WebRTC is browser-native — not counted.

| Artifact | Gzip |
|----------|------|
| ESM entry (`dist/index.js`) | **~11 KB** |
| CJS entry (`dist/index.cjs`) | ~13 KB |
| Auth panel chunk (lazy) | ~1.3 KB |

Typical impact when bundling into an SPA: **~11–12 KB gzip** for core SDK + sign-in UI.

## Install

```bash
npm install @idrto/idr_browser_sdk
```

## Quick start (ISV)

```html
<input id="host" placeholder="edge-gpu-1.your-entity.idr" />
<div id="auth"></div>
<button id="go">Connect</button>
<script type="module">
  import { IdrClient, mountAuthPanel } from "@idrto/idr_browser_sdk";

  const client = IdrClient.forService("ollama");
  mountAuthPanel(document.getElementById("auth"), { client });

  document.getElementById("go").onclick = async () => {
    await client.ensureSession({ interactive: true, mount: document.getElementById("auth") });
    await client.connect({ host: document.getElementById("host").value.trim() });
    const tags = await (await client.fetch("/api/tags")).json();
    console.log(tags);
  };
</script>
```

## Security

- Never collect access keys in ISV code or send them to your backend.
- Use `mountAuthPanel()` or `<idr-auth-panel>` for credentials.
- Do **not** pass `accessKey` to `connect()` — the SDK rejects it.

See [docs/ISV_GUIDE.md](docs/ISV_GUIDE.md) and [docs/ACCESS_KEYS.md](docs/ACCESS_KEYS.md).

## Platform requirements

- Account sign-in: `POST /v1/auth/browser/login` → `browser:write` scope
- Access keys: `POST /v1/auth/access-key/exchange`
- Resolve: `POST /resolve` with `source_host: "browser"` (or key-scoped host)
- Signaling: `wss://idr.to/v1/signal` with Ed25519 device auth
- Transport: WebRTC data channel `idr-tunnel` + **idr-tunnel-v1** binary mux

Target hosts: use `.idr` synthetic names (`buildIdrHostname`) or `idrto:` URIs (`idrto:<host>~<entity>/<service>`). Do not parse `*.idr.to` labels locally — they may be opaque hashes. Port segments ending in `UDP` use an unordered WebRTC data channel.

## Examples

| Framework | Directory |
|-----------|-------------|
| Vanilla | [examples/vanilla-vite/](examples/vanilla-vite/) |
| React | [examples/react-vite/](examples/react-vite/) |
| Vue | [examples/vue-vite/](examples/vue-vite/) |
| Svelte | [examples/svelte-vite/](examples/svelte-vite/) |
| Angular | [examples/angular-vite/](examples/angular-vite/) |

```bash
npm run build
cd examples/react-vite && npm install && npm run dev
```

## Development

```bash
npm install
npm test
npm run build
```

For local API testing: `localStorage.setItem("idr.sdk.devApiBase", "http://localhost:3000")`.

## License

MIT
