package com.assistlink.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record CreateSessionResponse(
    @JsonProperty("sessionId") String sessionId,
    @JsonProperty("joinPath") String joinPath) {}
