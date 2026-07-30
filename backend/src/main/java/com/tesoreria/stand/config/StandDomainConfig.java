package com.tesoreria.stand.config;

import com.tesoreria.stand.application.usecase.StandService;
import com.tesoreria.stand.infrastructure.adapter.out.persistence.repository.*;
import com.tesoreria.treasury.application.usecase.SchoolEventService;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository.SchoolEventJpaRepository;
import org.springframework.context.annotation.*;

@Configuration
public class StandDomainConfig {
  @Bean
  StandService standService(StandJpaRepository stands, StandProductJpaRepository products,
      StandSaleJpaRepository sales, SchoolEventJpaRepository events,
      SchoolEventService schoolEvents) {
    return new StandService(stands, products, sales, events, schoolEvents);
  }
}
