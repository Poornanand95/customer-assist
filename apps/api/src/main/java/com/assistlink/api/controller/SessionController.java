package com.assistlink.api.controller;

import com.assistlink.api.dto.CreateSessionResponse;
import com.assistlink.api.dto.SessionInfoResponse;
import com.assistlink.api.service.SessionRoomRegistry;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/sessions")
public class SessionController {

  private final SessionRoomRegistry registry;

  public SessionController(SessionRoomRegistry registry) {
    this.registry = registry;
  }

  @PostMapping
  public CreateSessionResponse createSession() {
    String sessionId = registry.createSession();
    return new CreateSessionResponse(sessionId, "/join/" + sessionId);
  }

  @GetMapping("/{sessionId}")
  public ResponseEntity<SessionInfoResponse> getSession(@PathVariable String sessionId) {
    if (!registry.exists(sessionId)) {
      return ResponseEntity.notFound().build();
    }
    return ResponseEntity.ok(new SessionInfoResponse(sessionId, true));
  }
}
