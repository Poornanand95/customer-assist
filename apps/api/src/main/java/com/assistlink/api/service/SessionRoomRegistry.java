package com.assistlink.api.service;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class SessionRoomRegistry {

  private final ConcurrentHashMap<String, SessionRoom> sessions = new ConcurrentHashMap<>();

  public String createSession() {
    String id = UUID.randomUUID().toString();
    sessions.put(id, new SessionRoom(id));
    return id;
  }

  public boolean exists(String sessionId) {
    return sessions.containsKey(sessionId);
  }

  public SessionRoom getRoom(String sessionId) {
    return sessions.get(sessionId);
  }
}
