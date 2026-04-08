package com.tesoreria.app.apoderado.config;

import com.tesoreria.app.apoderado.application.usecase.ApoderadoService;
import com.tesoreria.app.apoderado.domain.port.out.ApoderadoRepositoryOutPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DomainConfig {
    @Bean
    public ApoderadoService apoderadoService(ApoderadoRepositoryOutPort repository) {
        return new ApoderadoService(repository);
    }
}
