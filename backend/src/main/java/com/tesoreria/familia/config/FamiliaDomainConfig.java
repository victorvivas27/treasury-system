package com.tesoreria.familia.config;

import com.tesoreria.familia.application.usecase.FamiliaService;
import com.tesoreria.familia.core.port.out.FamiliaRepositoryOutPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FamiliaDomainConfig {

    @Bean
    public FamiliaService familiaService(FamiliaRepositoryOutPort repository) {
        return new FamiliaService(repository);
    }
}
