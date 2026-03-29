package com.assistlink.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

  @Value("${assistlink.cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000}")
  private String allowedOriginsCsv;

  private String[] allowedOrigins() {
    return allowedOriginsCsv.trim().split("\\s*,\\s*");
  }

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry
        .addMapping("/api/**")
        .allowedOrigins(allowedOrigins())
        .allowedMethods("GET", "POST", "OPTIONS")
        .allowedHeaders("*")
        .allowCredentials(false);
  }
}
