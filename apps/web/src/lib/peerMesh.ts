/**
 * Mesh WebRTC peers: one RTCPeerConnection per remote participant.
 * Signaling is out-of-band (WebSocket). Audio/video use DTLS-SRTP (WebRTC), not WS.
 */

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export type PeerMeshHandlers = {
  onRemoteStream: (remotePeerId: string, stream: MediaStream) => void;
  onRemoteStreamEnded: (remotePeerId: string) => void;
};

export function createPeerMesh(
  localPeerId: string,
  localStream: MediaStream,
  ws: WebSocket,
  handlers: PeerMeshHandlers,
) {
  const pcs = new Map<string, RTCPeerConnection>();
  const pendingIce = new Map<string, RTCIceCandidateInit[]>();

  function isInitiator(remoteId: string): boolean {
    return localPeerId < remoteId;
  }

  function getOrCreatePc(remoteId: string): RTCPeerConnection {
    let pc = pcs.get(remoteId);
    if (pc) return pc;
    pc = new RTCPeerConnection(RTC_CONFIG);
    pcs.set(remoteId, pc);

    localStream.getTracks().forEach((t) => pc!.addTrack(t, localStream));

    pc.ontrack = (ev) => {
      const stream = ev.streams[0];
      if (stream) {
        handlers.onRemoteStream(remoteId, stream);
      }
    };

    pc.onicecandidate = (ev) => {
      if (!ev.candidate || ws.readyState !== WebSocket.OPEN) return;
      ws.send(
        JSON.stringify({
          type: "ice-candidate",
          to: remoteId,
          candidate: ev.candidate.toJSON(),
        }),
      );
    };

    return pc;
  }

  async function flushPending(remoteId: string) {
    const pc = pcs.get(remoteId);
    if (!pc) return;
    const list = pendingIce.get(remoteId) ?? [];
    pendingIce.delete(remoteId);
    for (const c of list) {
      try {
        await pc.addIceCandidate(c);
      } catch {
        /* ignore invalid late candidates */
      }
    }
  }

  async function addIce(remoteId: string, candidate: RTCIceCandidateInit) {
    const pc = pcs.get(remoteId);
    if (!pc) {
      const list = pendingIce.get(remoteId) ?? [];
      list.push(candidate);
      pendingIce.set(remoteId, list);
      return;
    }
    if (!pc.remoteDescription) {
      const list = pendingIce.get(remoteId) ?? [];
      list.push(candidate);
      pendingIce.set(remoteId, list);
      return;
    }
    try {
      await pc.addIceCandidate(candidate);
    } catch {
      /* ignore */
    }
  }

  async function connectToRemote(remoteId: string) {
    if (remoteId === localPeerId || pcs.has(remoteId)) return;
    // Lower peerId creates the offer; the other side waits for onOffer().
    if (!isInitiator(remoteId)) return;

    const pc = getOrCreatePc(remoteId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "offer",
          to: remoteId,
          sdp: offer.sdp,
        }),
      );
    }
  }

  async function onOffer(from: string, sdp: string) {
    const pc = getOrCreatePc(from);
    await pc.setRemoteDescription({ type: "offer", sdp });
    await flushPending(from);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "answer",
          to: from,
          sdp: answer.sdp,
        }),
      );
    }
  }

  async function onAnswer(from: string, sdp: string) {
    const pc = pcs.get(from);
    if (!pc) return;
    await pc.setRemoteDescription({ type: "answer", sdp });
    await flushPending(from);
  }

  function closePeer(remoteId: string) {
    const pc = pcs.get(remoteId);
    if (pc) {
      pc.close();
      pcs.delete(remoteId);
    }
    pendingIce.delete(remoteId);
    handlers.onRemoteStreamEnded(remoteId);
  }

  function dispose() {
    for (const id of [...pcs.keys()]) {
      closePeer(id);
    }
    pcs.clear();
    pendingIce.clear();
  }

  async function handleSignalMessage(data: string) {
    const msg = JSON.parse(data) as Record<string, unknown>;
    const type = msg.type as string;
    switch (type) {
      case "peer-list": {
        const peers = (msg.peers as { peerId: string }[]) ?? [];
        for (const p of peers) {
          await connectToRemote(p.peerId);
        }
        break;
      }
      case "peer-joined":
        await connectToRemote(msg.peerId as string);
        break;
      case "peer-left":
        closePeer(msg.peerId as string);
        break;
      case "offer":
        await onOffer(msg.from as string, msg.sdp as string);
        break;
      case "answer":
        await onAnswer(msg.from as string, msg.sdp as string);
        break;
      case "ice-candidate":
        await addIce(msg.from as string, msg.candidate as RTCIceCandidateInit);
        break;
      default:
        break;
    }
  }

  return { handleSignalMessage, dispose, connectToRemote };
}
