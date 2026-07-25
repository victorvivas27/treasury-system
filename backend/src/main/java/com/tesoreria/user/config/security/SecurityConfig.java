package com.tesoreria.user.config.security;

import java.time.LocalDateTime;
import java.util.Map;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;

import com.tesoreria.shared.infrastructure.exception.StandardErrorResponse;

import tools.jackson.databind.ObjectMapper;

@Configuration
@EnableMethodSecurity
@SuppressWarnings("PMD.AvoidDuplicateLiterals")
public class SecurityConfig {
  private final JwtAuthenticationFilter jwtFilter;
  private final ObjectMapper objectMapper;

  public SecurityConfig(JwtAuthenticationFilter jwtFilter, ObjectMapper objectMapper) {
    this.jwtFilter = jwtFilter;
    this.objectMapper = objectMapper;
  }

  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    return http
        .csrf(csrf -> csrf.disable())
        .cors(cors -> {
        })
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers(
                "/api/v1/auth/login",
                "/api/v1/auth/register",
                "/api/v1/auth/refresh")
            .permitAll()
            .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html")
            .hasRole("ADMIN")
            .requestMatchers(
                "/api/v1/alumnos/**",
                "/api/v1/apoderados/**",
                "/api/v1/familias/**")
            .hasRole("ADMIN")
            .requestMatchers("/api/v1/users/**").hasRole("ADMIN")
            .requestMatchers("/api/v1/auth/me", "/api/v1/auth/logout")
            .hasAnyRole("ADMIN", "USER")
            .anyRequest().denyAll())
        .headers(headers -> headers
            .contentSecurityPolicy(csp -> csp.policyDirectives(
                "default-src 'self'; object-src 'none'; frame-ancestors 'none'; "
                    + "base-uri 'self'; form-action 'self'"))
            .referrerPolicy(referrer -> referrer.policy(ReferrerPolicy.NO_REFERRER))
            .permissionsPolicyHeader(permissions -> permissions.policy(
                "camera=(), microphone=(), geolocation=()")))
        .exceptionHandling(exceptions -> exceptions
            .authenticationEntryPoint((request, response, exception) ->
                writeSecurityError(response, 401, "auth", "Autenticación requerida"))
            .accessDeniedHandler((request, response, exception) ->
                writeSecurityError(response, 403, "auth", "Acceso denegado")))
        .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
        .build();
  }

  @Bean
  AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
    return configuration.getAuthenticationManager();
  }

  private void writeSecurityError(
      jakarta.servlet.http.HttpServletResponse response,
      int status,
      String field,
      String message) throws java.io.IOException {
    response.setStatus(status);
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    objectMapper.writeValue(
        response.getOutputStream(),
        new StandardErrorResponse(status, Map.of(field, message), LocalDateTime.now()));
  }
}
