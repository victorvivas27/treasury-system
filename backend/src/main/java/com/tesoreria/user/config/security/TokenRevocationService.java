package com.tesoreria.user.config.security;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Date;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TokenRevocationService {
    private final ConcurrentHashMap<String, Instant> revokedTokens = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, Instant> revokedUsers = new ConcurrentHashMap<>();

    public void revoke(String token, Date expiresAt) {
        removeExpired();
        revokedTokens.put(token, expiresAt.toInstant());
    }

    public boolean isRevoked(String token) {
        Instant expiration = revokedTokens.get(token);
        if (expiration == null) {
            return false;
        }
        if (!expiration.isAfter(Instant.now())) {
            revokedTokens.remove(token);
            return false;
        }
        return true;
    }

    public void revokeAllForUser(Long userId) {
        revokedUsers.put(userId, Instant.now());
    }

    public boolean isUserRevokedAfter(Long userId, Date issuedAt) {
        if (userId == null || issuedAt == null) return true;
        Instant revokedAt = revokedUsers.get(userId);
        return revokedAt != null && !issuedAt.toInstant().isAfter(revokedAt);
    }

    private void removeExpired() {
        Instant now = Instant.now();
        revokedTokens.entrySet().removeIf(entry -> !entry.getValue().isAfter(now));
    }
}
