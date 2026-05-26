package com.tesoreria.app.apoderado.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.tesoreria.app.apoderado.A_domain.port.out.ApoderadoRepositoryOutPort;
import com.tesoreria.app.apoderado.B_application.usecase.ApoderadoService;

@Configuration
public class DomainConfig {
  @Bean
  public ApoderadoService apoderadoService(ApoderadoRepositoryOutPort repository) {
    return new ApoderadoService(repository);
  }
}
