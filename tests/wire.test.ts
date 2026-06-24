import { describe, expect, it } from "vitest";
import {
  ControlOp,
  encodeClose,
  encodeDataFrame,
  encodeOpen,
  parseCloseOrReset,
  parseOpenControl,
  tryDecodeFrame,
} from "../src/tunnel/wire";

describe("idr-tunnel-v1 wire", () => {
  it("data frame roundtrip", () => {
    const payload = new Uint8Array([1, 2, 3, 4, 5]);
    const frame = encodeDataFrame(7, payload);
    const decoded = tryDecodeFrame(frame, 0);
    expect(decoded?.consumed).toBe(frame.length);
    expect(decoded?.frame.streamId).toBe(7);
    expect(decoded?.frame.payload).toEqual(payload);
  });

  it("open and close control", () => {
    const open = encodeOpen(42, "127.0.0.1", 22);
    const decodedOpen = tryDecodeFrame(open, 0)!;
    expect(decodedOpen.frame.streamId).toBe(0);
    const parsed = parseOpenControl(decodedOpen.frame.payload)!;
    expect(parsed.streamId).toBe(42);
    expect(parsed.host).toBe("127.0.0.1");
    expect(parsed.port).toBe(22);

    const close = encodeClose(42);
    const decodedClose = tryDecodeFrame(close, 0)!;
    const cr = parseCloseOrReset(decodedClose.frame.payload)!;
    expect(cr.op).toBe(ControlOp.Close);
    expect(cr.streamId).toBe(42);
  });
});
