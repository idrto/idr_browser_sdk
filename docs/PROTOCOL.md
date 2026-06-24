# idr-tunnel-v1 (browser SDK)

Multiplexed TCP byte streams over a single WebRTC data channel (`idr-tunnel`).

## Data frames

```
[uint32_be payload_len][uint32_be stream_id][payload...]
```

- Max payload 64 KiB.
- `stream_id` 0 = control.

## Control (stream_id 0)

| Opcode | Body |
|--------|------|
| `0x01` OPEN | `[stream_id u32][host_len u16][host utf8][port u16]` |
| `0x02` CLOSE | `[stream_id u32]` |
| `0x03` RESET | `[stream_id u32]` |

Browser client sends OPEN to `127.0.0.1:<service_port>` on the target; the agent dials local service.

## HTTP `fetch()`

The SDK builds HTTP/1.1 on the tunnel stream (raw bytes, not JSON frames).

Reference: [client/docs/TUNNEL.md](https://github.com/idrto/client/blob/main/docs/TUNNEL.md)
