package com.assistlink.api.service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

/** In-memory participants for one collaboration session (POC: no persistence). */
public final class SessionRoom {

  public record PeerInfo(String peerId, String displayName) {}

  private final String sessionId;
  private final Map<String, Peer> peers = new ConcurrentHashMap<>();

  public SessionRoom(String sessionId) {
    this.sessionId = sessionId;
  }

  public String sessionId() {
    return sessionId;
  }

  public synchronized List<PeerInfo> listPeers() {
    List<PeerInfo> list = new ArrayList<>();
    peers.forEach((id, p) -> list.add(new PeerInfo(id, p.displayName)));
    return List.copyOf(list);
  }

  public synchronized void register(String peerId, String displayName, WebSocketSession ws) {
    peers.put(peerId, new Peer(displayName, ws));
  }

  public synchronized void remove(String peerId) {
    peers.remove(peerId);
  }

  public synchronized WebSocketSession getSocket(String peerId) {
    Peer p = peers.get(peerId);
    return p == null ? null : p.ws;
  }

  public synchronized boolean isEmpty() {
    return peers.isEmpty();
  }

  public void sendToPeer(String peerId, String json) throws IOException {
    WebSocketSession socket = getSocket(peerId);
    if (socket != null && socket.isOpen()) {
      socket.sendMessage(new TextMessage(json));
    }
  }

  public void broadcastExcept(String fromPeerId, String json) throws IOException {
    for (Map.Entry<String, Peer> e : peers.entrySet()) {
      if (e.getKey().equals(fromPeerId)) {
        continue;
      }
      WebSocketSession ws = e.getValue().ws;
      if (ws.isOpen()) {
        ws.sendMessage(new TextMessage(json));
      }
    }
  }

  private static final class Peer {
    final String displayName;
    final WebSocketSession ws;

    Peer(String displayName, WebSocketSession ws) {
      this.displayName = displayName;
      this.ws = ws;
    }
  }
}
