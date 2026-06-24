import { DATA_CHANNEL_LABEL } from "../constants";
import { IdrError } from "../errors/IdrError";
import type { ResolveResponse } from "../types";
import { randomUuid } from "../util/encoding";

export type SignalingRelay = {
  sendOffer: (sdp: RTCSessionDescriptionInit) => void;
  sendIce: (candidate: RTCIceCandidateInit) => void;
  handleEnvelope: (type: string, payload: Record<string, unknown>) => void;
  onAnswer: (handler: (sdp: RTCSessionDescriptionInit) => void) => void;
  onRemoteIce: (handler: (candidate: RTCIceCandidateInit) => void) => void;
};

export function createSignalingRelay(
  send: (type: string, id: string, payload: Record<string, unknown>) => void,
  signalSession: string,
  target: { entity_id: string; host: string },
): SignalingRelay {
  let answerHandler: ((sdp: RTCSessionDescriptionInit) => void) | null = null;
  let iceHandler: ((candidate: RTCIceCandidateInit) => void) | null = null;

  return {
    sendOffer(sdp) {
      send("signal.offer", randomUuid(), {
        signal_session: signalSession,
        target,
        sdp: { type: sdp.type, sdp: sdp.sdp },
      });
    },
    sendIce(candidate) {
      send("signal.ice", randomUuid(), {
        signal_session: signalSession,
        candidate,
      });
    },
    handleEnvelope(type, payload) {
      if (type === "signal.answer") {
        const sdp = payload.sdp as { type?: string; sdp?: string };
        answerHandler?.({ type: (sdp.type as RTCSdpType) ?? "answer", sdp: sdp.sdp ?? "" });
      } else if (type === "signal.ice") {
        iceHandler?.(payload.candidate as RTCIceCandidateInit);
      } else if (type === "signal.error") {
        throw new IdrError(
          String(payload.code ?? "signal_error"),
          String(payload.message ?? "Signaling error"),
        );
      }
    },
    onAnswer(handler) {
      answerHandler = handler;
    },
    onRemoteIce(handler) {
      iceHandler = handler;
    },
  };
}

export type PeerConnectionHandle = {
  sendBinary: (data: Uint8Array) => void;
  close: () => void;
  whenDataChannelOpen: Promise<void>;
  onBinary: (handler: (data: Uint8Array) => void) => void;
};

export async function createOutboundPeer(
  resolved: ResolveResponse,
  relay: SignalingRelay,
): Promise<PeerConnectionHandle> {
  const iceServers: RTCIceServer[] = [];
  if (resolved.stun_urls?.length) iceServers.push({ urls: resolved.stun_urls });
  if (resolved.turn_urls?.length && resolved.turn_username && resolved.turn_credential) {
    iceServers.push({
      urls: resolved.turn_urls,
      username: resolved.turn_username,
      credential: resolved.turn_credential,
    });
  }

  const pc = new RTCPeerConnection({ iceServers });
  const binaryHandlers: Array<(data: Uint8Array) => void> = [];

  let dcOpenResolve: (() => void) | null = null;
  const whenDataChannelOpen = new Promise<void>((resolve) => {
    dcOpenResolve = resolve;
  });

  const dc = pc.createDataChannel(DATA_CHANNEL_LABEL, { ordered: true });
  dc.binaryType = "arraybuffer";
  dc.onopen = () => dcOpenResolve?.();
  dc.onmessage = (ev) => {
    const data =
      ev.data instanceof ArrayBuffer
        ? new Uint8Array(ev.data)
        : new Uint8Array(new TextEncoder().encode(String(ev.data)));
    for (const h of binaryHandlers) h(data);
  };

  relay.onAnswer(async (answer) => {
    await pc.setRemoteDescription(answer);
  });

  relay.onRemoteIce(async (candidate) => {
    try {
      await pc.addIceCandidate(candidate);
    } catch {
      /* stale candidate */
    }
  });

  pc.onicecandidate = (ev) => {
    if (ev.candidate) {
      relay.sendIce({
        candidate: ev.candidate.candidate,
        sdpMid: ev.candidate.sdpMid,
        sdpMLineIndex: ev.candidate.sdpMLineIndex,
      });
    }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  relay.sendOffer({ type: offer.type, sdp: offer.sdp ?? "" });

  return {
    sendBinary(data) {
      if (dc.readyState !== "open") throw new IdrError("not_connected", "Data channel not open");
      dc.send(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
    },
    close() {
      dc.close();
      pc.close();
    },
    whenDataChannelOpen,
    onBinary(handler) {
      binaryHandlers.push(handler);
    },
  };
}
