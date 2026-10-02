package com.tesoreria.shared.infrastructure.cache;

import com.github.benmanes.caffeine.cache.Cache;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.concurrent.Callable;

/** Keeps organization-wide eviction compatible with transaction-aware caching. */
final class TenantCaffeineCache extends CaffeineCache {
    TenantCaffeineCache(String name, Cache<Object, Object> cache) {
        super(name, cache);
    }

    @Override
    public <T> T get(Object key, Callable<T> valueLoader) {
        // A transaction must read its own database state without publishing it.
        // Spring's transaction-aware decorator delegates this sync loading path
        // directly, so its deferred put/evict handling cannot protect these loads.
        // Do not retain a snapshot for afterCommit: concurrent commits could make
        // that snapshot obsolete before it is published. Ordinary reads after
        // completion retain Caffeine's atomic loading and existing TTL.
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            try {
                return valueLoader.call();
            } catch (Exception exception) {
                throw new ValueRetrievalException(key, valueLoader, exception);
            }
        }
        return super.get(key, valueLoader);
    }

    @Override
    public void evict(Object key) {
        if (key instanceof TenantCacheKeys.Scope scope) {
            getNativeCache().asMap().keySet().removeIf(candidate ->
                    candidate instanceof TenantCacheKeys.Key tenantKey
                            && scope.organizationId().equals(tenantKey.organizationId()));
        } else {
            super.evict(key);
        }
    }
}
