package com.tesoreria.user.config.security;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Date;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TokenRevocationService {
    private final ConcurrentHashMap<String, Instant> revokedTokens = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Instant> revokedUsers = new ConcurrentHashMap<>();

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

    public void revokeAllForUser(String username) {
        revokedUsers.put(username.toLowerCase(java.util.Locale.ROOT), Instant.now());
    }

    public boolean isUserRevokedAfter(String username, Date issuedAt) {
        Instant revokedAt = revokedUsers.get(username.toLowerCase(java.util.Locale.ROOT));
        return revokedAt != null && !issuedAt.toInstant().isAfter(revokedAt);
    }

    private void removeExpired() {
        Instant now = Instant.now();
        revokedTokens.entrySet().removeIf(entry -> !entry.getValue().isAfter(now));
    }
}
