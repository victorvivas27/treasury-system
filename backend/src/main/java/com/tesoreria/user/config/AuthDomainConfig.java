package com.tesoreria.user.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;

import com.tesoreria.user.application.usecase.AuthService;
import com.tesoreria.user.application.usecase.CustomUserDetailsService;
import com.tesoreria.user.application.usecase.LoginRateLimiter;
import com.tesoreria.user.config.security.JwtService;

@Configuration
public class AuthDomainConfig {
  @Bean
  AuthService authService(
      AuthenticationManager authenticationManager,
      CustomUserDetailsService userDetailsService,
      JwtService jwtService,
      LoginRateLimiter rateLimiter) {
    return new AuthService(authenticationManager, userDetailsService, jwtService, rateLimiter);
  }
}
