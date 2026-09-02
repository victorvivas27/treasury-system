package com.tesoreria.treasury.config;

import com.tesoreria.treasury.application.usecase.TreasuryService;
import com.tesoreria.treasury.core.port.out.TreasuryRepositoryOutPort;
import com.tesoreria.shared.infrastructure.performance.DashboardPerformanceProbe;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TreasuryDomainConfig {
    @Bean
    TreasuryService treasuryService(TreasuryRepositoryOutPort repository,
                                    DashboardPerformanceProbe performanceProbe) {
        return new TreasuryService(repository, performanceProbe);
    }
}
