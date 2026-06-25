import {
  CONTROL_STREAM_ID,
  encodeClose,
  encodeDataFrame,
  encodeOpen,
  parseCloseOrReset,
  parseOpenControl,
  tryDecodeFrame,
} from "./wire";
import type { TargetRef } from "../addressing/targetRef";
import { encodeTargetRefOpen } from "../addressing/targetRef";

export type TunnelStream = {
  streamId: number;
  write: (data: Uint8Array) => void;
  close: () => void;
  onData: (handler: (data: Uint8Array) => void) => void;
  onClose: (handler: () => void) => void;
};

type StreamState = {
  dataHandlers: Array<(data: Uint8Array) => void>;
  closeHandlers: Array<() => void>;
  closed: boolean;
};

export class TunnelMultiplexer {
  private buffer = new Uint8Array(0);
  private nextStreamId = 1;
  private streams = new Map<number, StreamState>();
  private send: (frame: Uint8Array) => void;

  constructor(send: (frame: Uint8Array) => void) {
    this.send = send;
  }

  ingest(data: Uint8Array): void {
    const merged = new Uint8Array(this.buffer.length + data.length);
    merged.set(this.buffer);
    merged.set(data, this.buffer.length);
    this.buffer = merged;

    let offset = 0;
    while (offset < this.buffer.length) {
      const decoded = tryDecodeFrame(this.buffer, offset);
      if (!decoded) break;
      offset += decoded.consumed;
      this.dispatch(decoded.frame.streamId, decoded.frame.payload);
    }
    this.buffer = this.buffer.slice(offset);
  }

  openTargetRef(target: TargetRef): TunnelStream {
    const { host, port, transport } = encodeTargetRefOpen(target);
    const streamId = this.nextStreamId++;
    const state: StreamState = { dataHandlers: [], closeHandlers: [], closed: false };
    this.streams.set(streamId, state);
    this.send(encodeOpen(streamId, host, port, transport));

    return {
      streamId,
      write: (data) => {
        if (state.closed) return;
        this.send(encodeDataFrame(streamId, data));
      },
      close: () => this.closeStream(streamId),
      onData: (handler) => state.dataHandlers.push(handler),
      onClose: (handler) => state.closeHandlers.push(handler),
    };
  }

  openStream(host: string, port: number): TunnelStream {
    const streamId = this.nextStreamId++;
    const state: StreamState = { dataHandlers: [], closeHandlers: [], closed: false };
    this.streams.set(streamId, state);
    this.send(encodeOpen(streamId, host, port));

    return {
      streamId,
      write: (data) => {
        if (state.closed) return;
        this.send(encodeDataFrame(streamId, data));
      },
      close: () => this.closeStream(streamId),
      onData: (handler) => state.dataHandlers.push(handler),
      onClose: (handler) => state.closeHandlers.push(handler),
    };
  }

  closeStream(streamId: number): void {
    const state = this.streams.get(streamId);
    if (!state || state.closed) return;
    state.closed = true;
    this.send(encodeClose(streamId));
    for (const h of state.closeHandlers) h();
    this.streams.delete(streamId);
  }

  private dispatch(streamId: number, payload: Uint8Array): void {
    if (streamId === CONTROL_STREAM_ID) {
      const open = parseOpenControl(payload);
      if (open) return;
      const cr = parseCloseOrReset(payload);
      if (cr) {
        const state = this.streams.get(cr.streamId);
        if (state && !state.closed) {
          state.closed = true;
          for (const h of state.closeHandlers) h();
          this.streams.delete(cr.streamId);
        }
      }
      return;
    }

    const state = this.streams.get(streamId);
    if (!state || state.closed) return;
    for (const h of state.dataHandlers) h(payload);
  }
}
