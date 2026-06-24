# Edge AI (Ollama) flows

## Owner (runs GPU + agent)

1. Subscribe to idr.to signaling
2. Run `idr agent` and Ollama on port 11434
3. Register host on idr.to
4. Optionally create access keys for teammates

## ISV app (hardcoded `ollama`)

```ts
const client = IdrClient.forService("ollama");
await client.ensureSession({ interactive: true, mount: authEl });
await client.connect({ host: userHost });
await client.fetch("/api/chat", { method: "POST", body: JSON.stringify({ model, messages }) });
```

## Delegate with access key

Same as above, but auth panel → **Access key** tab. No ISV code changes.

## Protocol

WebRTC `idr-tunnel` + HTTP/1.1 raw bytes to `127.0.0.1:11434` on the target agent.
