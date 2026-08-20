package com.tesoreria.community.config;

import com.tesoreria.community.application.usecase.AboutSectionService;
import com.tesoreria.community.core.port.out.AboutSectionRepositoryOutPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CommunityDomainConfig {
    @Bean
    AboutSectionService aboutSectionService(AboutSectionRepositoryOutPort repository) {
        return new AboutSectionService(repository);
    }
}
