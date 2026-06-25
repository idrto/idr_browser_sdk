# Signed Host-Identity (browser SDK)

The browser SDK authenticates **resolve** with a platform-signed **Host-Identity** document and Ed25519 proof of possession. Access keys are not supported.

## Sign-in flow

1. User signs in with entity ID + password (`POST /auth/cli/login`).
2. SDK registers this browser as a source device (`POST /entities/:id/source-identities` with host `browser`).
3. API returns a signed `host_identity` document stored in the SDK credential vault.

## Connect flow

1. `GET /v1/resolve/challenge` — one-time nonce
2. SDK signs the nonce with the browser device key (session-scoped Ed25519 seed)
3. `POST /resolve` with `host_identity`, `challenge_id`, `nonce`, `pop_signature`

WebSocket signaling still uses the same device key for `auth.challenge_response`.

## ISV responsibilities

- Use `mountAuthPanel()` or `<idr-auth-panel>` — never collect passwords or keys in app code.
- Call `ensureSession({ interactive: true })` before `connect()`.
- Do not pass tokens or credentials to `connect()`.

See [idr.to API Signed Host-Identity](https://github.com/idrto/api/blob/main/docs/SIGNED_HOST_IDENTITY.md).
