package com.tesoreria.treasury.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.tesoreria.treasury.application.usecase.TreasuryService;
import com.tesoreria.treasury.core.port.out.TreasuryRepositoryOutPort;

@Configuration
public class TreasuryDomainConfig {
  @Bean
  TreasuryService treasuryService(TreasuryRepositoryOutPort repository) {
    return new TreasuryService(repository);
  }
}
