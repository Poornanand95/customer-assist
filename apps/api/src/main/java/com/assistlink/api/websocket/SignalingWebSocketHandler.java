package com.assistlink.api.websocket;

import com.assistlink.api.service.SessionRoom;
import com.assistlink.api.service.SessionRoomRegistry;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.IOException;
import java.net.URI;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class SignalingWebSocketHandler extends TextWebSocketHandler {

  private static final Pattern SESSION_PATH =
      Pattern.compile(".*/ws/session/([^/]+)/?$");

  private final SessionRoomRegistry registry;
  private final ObjectMapper objectMapper;

  public SignalingWebSocketHandler(SessionRoomRegistry registry, ObjectMapper objectMapper) {
    this.registry = registry;
    this.objectMapper = objectMapper;
  }

  @Override
  public void afterConnectionEstablished(WebSocketSession session) throws Exception {
    String sessionId = extractSessionId(session);
    if (sessionId == null || !registry.exists(sessionId)) {
      session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Unknown session"));
      return;
    }
    session.getAttributes().put("collabSessionId", sessionId);
  }

  @Override
  protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
    JsonNode root = objectMapper.readTree(message.getPayload());
    String type = root.path("type").asText("");
    String collabSessionId = (String) session.getAttributes().get("collabSessionId");
    if (collabSessionId == null) {
      return;
    }

    SessionRoom room = registry.getRoom(collabSessionId);
    if (room == null) {
      session.close(CloseStatus.NOT_ACCEPTABLE);
      return;
    }

    if ("register".equals(type)) {
      handleRegister(session, room, root);
      return;
    }

    String fromPeerId = (String) session.getAttributes().get("peerId");
    if (fromPeerId == null) {
      return;
    }

    if (root.has("to") && !root.get("to").isNull()) {
      if (!root.isObject()) {
        return;
      }
      String to = root.get("to").asText();
      ObjectNode forward = (ObjectNode) root.deepCopy();
      forward.put("from", fromPeerId);
      room.sendToPeer(to, objectMapper.writeValueAsString(forward));
    }
  }

  private void handleRegister(WebSocketSession session, SessionRoom room, JsonNode root)
      throws IOException {
    String peerId = root.path("peerId").asText(null);
    String displayName = root.path("displayName").asText("Guest").trim();
    if (peerId == null || peerId.isBlank()) {
      return;
    }
    if (displayName.length() > 64) {
      displayName = displayName.substring(0, 64);
    }

    session.getAttributes().put("peerId", peerId);

    List<SessionRoom.PeerInfo> existing = room.listPeers();
    room.register(peerId, displayName, session);

    ObjectNode listMsg = objectMapper.createObjectNode();
    listMsg.put("type", "peer-list");
    ArrayNode peers = listMsg.putArray("peers");
    for (SessionRoom.PeerInfo p : existing) {
      ObjectNode o = peers.addObject();
      o.put("peerId", p.peerId());
      o.put("displayName", p.displayName());
    }

    session.sendMessage(new TextMessage(objectMapper.writeValueAsString(listMsg)));

    ObjectNode joined = objectMapper.createObjectNode();
    joined.put("type", "peer-joined");
    joined.put("peerId", peerId);
    joined.put("displayName", displayName);
    room.broadcastExcept(peerId, objectMapper.writeValueAsString(joined));
  }

  @Override
  public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
    String collabSessionId = (String) session.getAttributes().get("collabSessionId");
    String peerId = (String) session.getAttributes().get("peerId");
    if (collabSessionId == null || peerId == null) {
      return;
    }
    SessionRoom room = registry.getRoom(collabSessionId);
    if (room == null) {
      return;
    }
    room.remove(peerId);

    ObjectNode left = objectMapper.createObjectNode();
    left.put("type", "peer-left");
    left.put("peerId", peerId);
    room.broadcastExcept(peerId, objectMapper.writeValueAsString(left));
  }

  private static String extractSessionId(WebSocketSession session) {
    URI uri = session.getUri();
    if (uri == null) {
      return null;
    }
    Matcher m = SESSION_PATH.matcher(uri.getPath());
    return m.matches() ? m.group(1) : null;
  }
}
