package treasury;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

import com.tesoreria.shared.infrastructure.cache.CacheConfig;
import com.tesoreria.treasury.application.usecase.TreasuryService;
import com.tesoreria.treasury.config.TreasuryDomainConfig;
import com.tesoreria.treasury.core.model.AllowedPaymentMode;
import com.tesoreria.treasury.core.model.AnnualFeeConfig;
import com.tesoreria.treasury.core.port.in.TreasuryUseCase;
import com.tesoreria.treasury.core.port.out.TreasuryRepositoryOutPort;

@SpringJUnitConfig(TreasuryCacheIntegrationTest.TestConfig.class)
class TreasuryCacheIntegrationTest {
  private static final int YEAR = 2026;

  @Autowired private TreasuryUseCase service;
  @Autowired private TreasuryRepositoryOutPort repository;
  @Autowired private CacheManager cacheManager;

  @BeforeEach
  void setUp() {
    cacheManager.getCacheNames().forEach(name -> cacheManager.getCache(name).clear());
    clearInvocations(repository);
  }

  @Test
  void getConfig_reutilizaResultadoParaLaMismaClave() {
    AnnualFeeConfig config = config(YEAR, "70000");
    when(repository.findConfigByYear(YEAR)).thenReturn(Optional.of(config));

    assertEquals(config, service.getConfig(YEAR));
    assertEquals(config, service.getConfig(YEAR));

    verify(repository).findConfigByYear(YEAR);
  }

  @Test
  void saveConfig_invalidaLecturasAnteriores() {
    AnnualFeeConfig initial = config(YEAR, "70000");
    AnnualFeeConfig updated = config(YEAR, "80000");
    when(repository.findConfigByYear(YEAR))
        .thenReturn(Optional.of(initial), Optional.of(initial), Optional.of(updated));
    when(repository.saveConfig(any(AnnualFeeConfig.class))).thenReturn(updated);

    assertEquals(initial, service.getConfig(YEAR));
    assertEquals(initial, service.getConfig(YEAR));
    service.saveConfig(YEAR, updated.annualAmount(), updated.allowedMode(),
        updated.annualDueDate(), updated.firstDueDate(), updated.secondDueDate(), "admin");
    assertEquals(updated, service.getConfig(YEAR));

    verify(repository, org.mockito.Mockito.times(3)).findConfigByYear(YEAR);
  }

  @Test
  void getConfig_separaResultadosPorAnio() {
    AnnualFeeConfig first = config(YEAR, "70000");
    AnnualFeeConfig second = config(YEAR + 1, "80000");
    when(repository.findConfigByYear(YEAR)).thenReturn(Optional.of(first));
    when(repository.findConfigByYear(YEAR + 1)).thenReturn(Optional.of(second));

    assertEquals(first, service.getConfig(YEAR));
    assertEquals(second, service.getConfig(YEAR + 1));

    verify(repository).findConfigByYear(YEAR);
    verify(repository).findConfigByYear(YEAR + 1);
  }

  private AnnualFeeConfig config(int year, String amount) {
    LocalDateTime now = LocalDateTime.now();
    return new AnnualFeeConfig(1L, year, new BigDecimal(amount), AllowedPaymentMode.AMBAS,
        LocalDate.of(year, 4, 15), LocalDate.of(year, 4, 15),
        LocalDate.of(year, 7, 15), now, now);
  }

  @Configuration
  @Import({CacheConfig.class, TreasuryDomainConfig.class})
  static class TestConfig {
    @Bean
    TreasuryRepositoryOutPort treasuryRepository() {
      return mock(TreasuryRepositoryOutPort.class);
    }
  }
}
