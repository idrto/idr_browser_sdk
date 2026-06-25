# End-user guide

## Sign in with idr.to account

1. Open the ISV app
2. Use **Sign in** in the SDK panel (entity ID + password)
3. Enter your target host (e.g. `laptop.you@company.idr`)
4. Connect

You need an active idr.to product bundle (Personal or Enterprise) on your entity.

The SDK registers this browser as a source device and uses Signed Host-Identity to connect securely.

## Target host format

- `hostname.entity-id.idr` — direct hostname
- Full `idrto:…` URI — advanced

Service (Ollama, etc.) is chosen by the app vendor, not you.
