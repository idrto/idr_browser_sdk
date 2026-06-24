# Access keys

Access keys let target **owners** delegate browser access without sharing passwords.

## Owner flow (idr.to portal or CLI)

```bash
curl -X POST https://idr.to/v1/access-keys \
  -H "Authorization: Bearer $CLI_TOKEN" \
  -H "Accept-Version: 1" \
  -H "Content-Type: application/json" \
  -d '{"target_entity_id":"you@example.com","target_host":"edge-gpu-1","label":"team"}'
```

Response includes `access_key` (`idr_ak_…`) **once**. List/revoke via `GET` / `DELETE /v1/access-keys/{id}`.

## Delegate flow (browser)

1. ISV app embeds SDK auth panel
2. Delegate selects **Access key** tab, pastes key
3. Enters target host as `.idr` synthetic hostname or `idrto:` URI
4. Connects

## Platform API

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /v1/access-keys` | CLI write | Create key |
| `GET /v1/access-keys` | Bearer | List prefixes |
| `DELETE /v1/access-keys/{id}` | CLI write | Revoke |
| `POST /v1/auth/access-key/exchange` | None (rate limited) | `{ access_key }` → `browser:write` bearer |
| `POST /v1/auth/browser/login` | None (rate limited) | Account login → `browser:write` bearer |
| `POST /resolve` | `browser:write` or `cli:write` | WebRTC session setup |

Exchange returns `{ access_token, entity_id, host, target_entity_id, target_host, expires_in }`.

Keys are SHA-256 hashed at rest. Billing meters to the **key owner**.

## Hostname formats

- **`.idr` synthetic** — `laptop.user-40example-2Ecom.idr` (entity id recovered via idr-escape)
- **`idrto:` URI** — canonical machine form
- **`*.idr.to`** — opaque routing labels (may be SHA-256); **not parsed client-side**

Use `buildIdrHostname(entityId, host)` to encode synthetic hostnames.
