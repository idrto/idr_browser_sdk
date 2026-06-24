# End-user guide

## Sign in with idr.to account

1. Open the ISV app
2. Use **Sign in** in the SDK panel (entity ID + password)
3. Enter your target host (e.g. `laptop.you@company.idr`)
4. Connect

You need an active idr.to signaling subscription.

## Use an access key

If the machine owner gave you an `idr_ak_…` key:

1. Choose **Access key** in the SDK panel
2. Paste the key (never share it with the ISV)
3. Enter the host the owner specified
4. Connect

## Target host format

- `hostname.entity-id.idr` — direct hostname
- Full `idrto:…` URI — advanced

Service (Ollama, etc.) is chosen by the app vendor, not you.
