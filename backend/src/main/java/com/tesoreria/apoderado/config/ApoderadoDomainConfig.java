package com.tesoreria.apoderado.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.tesoreria.apoderado.application.usecase.ApoderadoService;
import com.tesoreria.apoderado.core.port.out.ApoderadoRepositoryOutPort;

@Configuration
public class ApoderadoDomainConfig {
  @Bean
  public ApoderadoService apoderadoService(ApoderadoRepositoryOutPort repository) {
    return new ApoderadoService(repository);
  }
}
