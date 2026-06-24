# @idrto/idr_browser_sdk examples

Each example hardcodes `IdrClient.forService("ollama")`. End-users only enter the target host; auth stays in the SDK panel.

| Framework | Directory | Dev port |
|-----------|-----------|----------|
| Vanilla (Vite) | [vanilla-vite](./vanilla-vite/) | 5173 |
| React | [react-vite](./react-vite/) | 5174 |
| Vue | [vue-vite](./vue-vite/) | 5175 |
| Svelte | [svelte-vite](./svelte-vite/) | 5176 |
| Angular | [angular-vite](./angular-vite/) | 5177 |

```bash
# From repo root
npm run build

cd examples/react-vite
npm install
npm run dev
```

Point at a local API during development:

```js
localStorage.setItem("idr.sdk.devApiBase", "http://localhost:3000");
```
