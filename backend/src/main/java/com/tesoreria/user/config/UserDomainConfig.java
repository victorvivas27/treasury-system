package com.tesoreria.user.config;

import com.tesoreria.organization.application.DefaultOrganizationProvider;
import com.tesoreria.organization.application.CurrentOrganizationService;
import com.tesoreria.user.application.usecase.UserService;
import com.tesoreria.user.application.usecase.ProfileImageService;
import com.tesoreria.treasury.core.port.out.FileStorageService;
import com.tesoreria.user.core.port.out.UserRepositoryOutPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.beans.factory.ObjectProvider;

@Configuration
public class UserDomainConfig {
    @Bean
    UserService userService(UserRepositoryOutPort repository, PasswordEncoder passwordEncoder,
                            DefaultOrganizationProvider defaultOrganization,
                            CurrentOrganizationService currentOrganization) {
        return new UserService(repository, passwordEncoder, defaultOrganization, currentOrganization);
    }

    @Bean
    ProfileImageService profileImageService(UserRepositoryOutPort repository,
            ObjectProvider<FileStorageService> storage, CurrentOrganizationService currentOrganization) {
        return new ProfileImageService(repository, storage.getIfAvailable(), currentOrganization);
    }
}
