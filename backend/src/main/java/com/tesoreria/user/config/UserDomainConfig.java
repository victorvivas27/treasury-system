package com.tesoreria.user.config;

import com.tesoreria.user.application.usecase.UserService;
import com.tesoreria.user.core.port.out.UserRepositoryOutPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class UserDomainConfig {
    @Bean
    UserService userService(UserRepositoryOutPort repository, PasswordEncoder passwordEncoder) {
        return new UserService(repository, passwordEncoder);
    }
}
