package com.tesoreria.stand.config;

import com.tesoreria.stand.application.usecase.StandService;
import com.tesoreria.stand.infrastructure.adapter.out.persistence.repository.StandJpaRepository;
import com.tesoreria.stand.infrastructure.adapter.out.persistence.repository.StandProductJpaRepository;
import com.tesoreria.stand.infrastructure.adapter.out.persistence.repository.StandSaleJpaRepository;
import com.tesoreria.treasury.application.usecase.SchoolEventService;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository.SchoolEventJpaRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class StandDomainConfig {
    @Bean
    StandService standService(StandJpaRepository stands, StandProductJpaRepository products,
                              StandSaleJpaRepository sales, SchoolEventJpaRepository events,
                              SchoolEventService schoolEvents) {
        return new StandService(stands, products, sales, events, schoolEvents);
    }
}
