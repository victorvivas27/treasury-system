package com.tesoreria.shared.infrastructure.cache;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.cache.transaction.TransactionAwareCacheManagerProxy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.List;

@Configuration
@EnableCaching
public class CacheConfig {
    private static final long CONFIGURATION_CACHE_MAXIMUM_SIZE = 100;
    private static final long SUMMARY_CACHE_MAXIMUM_SIZE = 50;

    @Bean
    CacheManager cacheManager() {
        SimpleCacheManager manager = new SimpleCacheManager();
        manager.setCaches(List.of(
                cache(CacheNames.ANNUAL_FEE_CONFIGURATIONS, Duration.ofMinutes(30),
                        CONFIGURATION_CACHE_MAXIMUM_SIZE),
                cache(CacheNames.ANNUAL_FEE_CONFIGURATION_BY_YEAR, Duration.ofMinutes(30),
                        CONFIGURATION_CACHE_MAXIMUM_SIZE),
                cache(CacheNames.CONTRIBUTION_CONFIGURATIONS, Duration.ofMinutes(30),
                        CONFIGURATION_CACHE_MAXIMUM_SIZE),
                cache(CacheNames.TREASURY_DASHBOARD_OVERVIEW, Duration.ofMinutes(1),
                        SUMMARY_CACHE_MAXIMUM_SIZE),
                cache(CacheNames.CONTRIBUTION_SUMMARY, Duration.ofMinutes(1),
                        SUMMARY_CACHE_MAXIMUM_SIZE)));
        manager.initializeCaches();
        return new TransactionAwareCacheManagerProxy(manager);
    }

    private CaffeineCache cache(String name, Duration ttl, long maximumSize) {
        return new CaffeineCache(name, Caffeine.newBuilder()
                .expireAfterWrite(ttl)
                .maximumSize(maximumSize)
                .recordStats()
                .build());
    }
}
