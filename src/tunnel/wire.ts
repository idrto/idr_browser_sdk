export const FRAME_HEADER_SIZE = 8;
export const MAX_FRAME_PAYLOAD = 64 * 1024;
export const CONTROL_STREAM_ID = 0;

export enum ControlOp {
  Open = 1,
  Close = 2,
  Reset = 3,
}

export type WireTransport = "tcp" | "udp";

export type DecodedFrame = {
  streamId: number;
  payload: Uint8Array;
};

export type RemoteOpen = {
  streamId: number;
  host: string;
  port: number;
  transport: WireTransport;
};

function readU32Be(data: Uint8Array, offset = 0): number {
  return (
    (data[offset]! << 24) |
    (data[offset + 1]! << 16) |
    (data[offset + 2]! << 8) |
    data[offset + 3]!
  );
}

function readU16Be(data: Uint8Array, offset = 0): number {
  return (data[offset]! << 8) | data[offset + 1]!;
}

export function encodeDataFrame(streamId: number, data: Uint8Array): Uint8Array {
  if (data.length > MAX_FRAME_PAYLOAD) {
    throw new Error("tunnel frame payload exceeds max size");
  }
  const frame = new Uint8Array(FRAME_HEADER_SIZE + data.length);
  const view = new DataView(frame.buffer);
  view.setUint32(0, data.length, false);
  view.setUint32(4, streamId, false);
  frame.set(data, FRAME_HEADER_SIZE);
  return frame;
}

export function encodeOpen(
  streamId: number,
  host: string,
  port: number,
  transport: WireTransport = "tcp",
): Uint8Array {
  const hostBytes = new TextEncoder().encode(host);
  if (hostBytes.length > 0xffff) throw new Error("tunnel OPEN host too long");
  const transportByte = transport === "udp" ? 1 : 0;
  const payloadLen = 1 + 4 + 2 + hostBytes.length + 2 + 1;
  const payload = new Uint8Array(payloadLen);
  let off = 0;
  payload[off++] = ControlOp.Open;
  new DataView(payload.buffer).setUint32(off, streamId, false);
  off += 4;
  new DataView(payload.buffer).setUint16(off, hostBytes.length, false);
  off += 2;
  payload.set(hostBytes, off);
  off += hostBytes.length;
  new DataView(payload.buffer).setUint16(off, port, false);
  off += 2;
  payload[off] = transportByte;
  return encodeDataFrame(CONTROL_STREAM_ID, payload);
}

export function encodeClose(streamId: number): Uint8Array {
  const payload = new Uint8Array(5);
  payload[0] = ControlOp.Close;
  new DataView(payload.buffer).setUint32(1, streamId, false);
  return encodeDataFrame(CONTROL_STREAM_ID, payload);
}

export function tryDecodeFrame(
  buffer: Uint8Array,
  offset = 0,
): { frame: DecodedFrame; consumed: number } | null {
  if (buffer.length < offset + FRAME_HEADER_SIZE) return null;
  const payloadLen = readU32Be(buffer, offset);
  const streamId = readU32Be(buffer, offset + 4);
  if (payloadLen > MAX_FRAME_PAYLOAD) throw new Error("tunnel frame payload exceeds max size");
  const total = FRAME_HEADER_SIZE + payloadLen;
  if (buffer.length < offset + total) return null;
  const payload = buffer.slice(offset + FRAME_HEADER_SIZE, offset + total);
  return {
    frame: { streamId, payload },
    consumed: total,
  };
}

export function parseOpenControl(payload: Uint8Array): RemoteOpen | null {
  if (payload.length < 1 + 4 + 2 + 2 + 1 || payload[0] !== ControlOp.Open) return null;
  const streamId = readU32Be(payload, 1);
  const hostLen = readU16Be(payload, 5);
  if (payload.length < 7 + hostLen + 2 + 1) return null;
  const host = new TextDecoder().decode(payload.slice(7, 7 + hostLen));
  const port = readU16Be(payload, 7 + hostLen);
  const transportByte = payload[7 + hostLen + 2]!;
  const transport: WireTransport = transportByte === 1 ? "udp" : "tcp";
  return { streamId, host, port, transport };
}

export function parseCloseOrReset(payload: Uint8Array): { op: ControlOp; streamId: number } | null {
  if (payload.length < 5) return null;
  const opByte = payload[0]!;
  if (opByte !== ControlOp.Close && opByte !== ControlOp.Reset) return null;
  return { op: opByte as ControlOp, streamId: readU32Be(payload, 1) };
}
