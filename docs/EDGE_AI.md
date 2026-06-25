# Edge AI (Ollama) flows

## Owner (runs GPU + agent)

1. Purchase an idr.to Personal or Enterprise bundle
2. Run `idr agent` with Ollama on the target machine (default local binding `127.0.0.1:11434` via `[services.ollama]`)
3. Register host on idr.to

## ISV app (hardcoded `ollama`)

```ts
const client = IdrClient.forService("ollama");
await client.ensureSession({ interactive: true, mount: authEl });
await client.connect({ host: userHost });
await client.fetch("/api/chat", { method: "POST", body: JSON.stringify({ model, messages }) });
```

## Teammate access

Teammates sign in with their own idr.to account in the SDK panel. ACL rules on the target entity control who can connect.

## Protocol

WebRTC `idr-tunnel` OPEN with `TargetRef { kind: service, value: ollama }`. The target agent dials the configured Ollama binding and pipes HTTP/1.1 bytes.
