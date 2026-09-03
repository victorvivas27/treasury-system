package com.tesoreria.user.config;

import com.tesoreria.user.application.usecase.AuthService;
import com.tesoreria.user.application.usecase.CustomUserDetailsService;
import com.tesoreria.user.application.usecase.LoginRateLimiter;
import com.tesoreria.user.config.security.JwtService;
import com.tesoreria.user.core.port.out.UserRepositoryOutPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AuthDomainConfig {
    @Bean
    AuthService authService(
            UserRepositoryOutPort users,
            CustomUserDetailsService userDetailsService,
            JwtService jwtService,
            LoginRateLimiter rateLimiter,
            PasswordEncoder passwordEncoder) {
        return new AuthService(users, userDetailsService, jwtService, rateLimiter, passwordEncoder);
    }
}
