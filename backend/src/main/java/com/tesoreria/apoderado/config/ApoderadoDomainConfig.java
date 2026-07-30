package com.tesoreria.apoderado.config;

import com.tesoreria.apoderado.application.usecase.ApoderadoService;
import com.tesoreria.apoderado.core.port.out.ApoderadoRepositoryOutPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ApoderadoDomainConfig {
    @Bean
    public ApoderadoService apoderadoService(ApoderadoRepositoryOutPort repository) {
        return new ApoderadoService(repository);
    }
}
