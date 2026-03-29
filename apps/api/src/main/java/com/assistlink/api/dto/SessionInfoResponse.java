package com.assistlink.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record SessionInfoResponse(
    @JsonProperty("sessionId") String sessionId,
    @JsonProperty("created") boolean created) {}
