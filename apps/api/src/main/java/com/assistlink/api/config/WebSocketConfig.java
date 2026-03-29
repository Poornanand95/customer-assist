package com.assistlink.api.config;

import com.assistlink.api.websocket.SignalingWebSocketHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

  private final SignalingWebSocketHandler signalingWebSocketHandler;

  @Value("${assistlink.cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000}")
  private String allowedOriginsCsv;

  public WebSocketConfig(SignalingWebSocketHandler signalingWebSocketHandler) {
    this.signalingWebSocketHandler = signalingWebSocketHandler;
  }

  private String[] allowedOrigins() {
    return allowedOriginsCsv.trim().split("\\s*,\\s*");
  }

  @Override
  public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
    registry
        .addHandler(signalingWebSocketHandler, "/ws/session/{sessionId}")
        .setAllowedOrigins(allowedOrigins());
  }
}
