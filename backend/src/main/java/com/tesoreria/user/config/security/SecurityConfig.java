package com.tesoreria.user.config.security;

import com.tesoreria.shared.infrastructure.exception.StandardErrorResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.Map;

import static jakarta.servlet.DispatcherType.ERROR;

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
                        .dispatcherTypeMatchers(ERROR).permitAll()
                        .requestMatchers(
                                "/api/v1/auth/login",
                                "/api/v1/auth/register",
                                "/api/v1/auth/bootstrap-admin",
                                "/api/v1/auth/refresh",
                                "/api/v1/auth/verify-email",
                                "/api/v1/auth/resend-verification",
                                "/api/v1/auth/forgot-password",
                                "/api/v1/auth/reset-password")
                        .permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html")
                        .hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET,
                                "/api/v1/tesoreria/dashboard",
                                "/api/v1/tesoreria/dashboard/overview",
                                "/api/v1/tesoreria/eventos/curso-administrado",
                                "/api/v1/tesoreria/eventos/consulta",
                                "/api/v1/tesoreria/stands",
                                "/api/v1/tesoreria/stands/{id}/resumen",
                                "/api/v1/tesoreria/configuracion-general/curso",
                                "/api/v1/tesoreria/perfil",
                                "/api/v1/tesoreria/aportes/resumen",
                                "/api/v1/tesoreria/resumen-financiero")
                        .hasAnyRole("ADMIN", "USER")
                        .requestMatchers("/api/v1/tesoreria/**")
                        .hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/notifications")
                        .hasRole("ADMIN")
                        .requestMatchers("/api/v1/notifications/**")
                        .hasAnyRole("ADMIN", "USER")
                        .requestMatchers(
                                "/api/v1/alumnos/**",
                                "/api/v1/apoderados/**",
                                "/api/v1/familias/**")
                        .hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/users/{id}")
                        .hasAnyRole("ADMIN", "USER")
                        .requestMatchers("/api/v1/users/**").hasRole("ADMIN")
                        .requestMatchers("/api/v1/auth/me", "/api/v1/auth/logout", "/api/v1/auth/change-password")
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
