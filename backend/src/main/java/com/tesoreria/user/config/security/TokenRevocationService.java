package com.tesoreria.user.config.security;

import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserJpaRepository;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;

import java.time.Instant;
import java.util.Date;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TokenRevocationService {
    private final UserJpaRepository users;
    private final ConcurrentHashMap<String, Instant> revokedTokens = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, Instant> revokedUsers = new ConcurrentHashMap<>();

    @Autowired
    public TokenRevocationService(UserJpaRepository users) {
        this.users = users;
    }

    // Retained for isolated tests; Spring always uses the repository-backed constructor.
    public TokenRevocationService() {
        this(null);
    }

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

    public boolean isUserRevokedAfter(JwtService.ParsedToken token) {
        // Family-backed access is invalidated by the durable family check. Its second-resolution
        // JWT issue time must not reject a new login in the same second as a password change.
        return isUserRevokedAfter(token.userId(), token.issuedAt(), token.tokenFamilyId() == null);
    }

    public boolean isUserRevokedAfter(Long userId, Date issuedAt) {
        return isUserRevokedAfter(userId, issuedAt, true);
    }

    private boolean isUserRevokedAfter(Long userId, Date issuedAt, boolean checkPersisted) {
        if (userId == null || issuedAt == null) return true;
        Instant revokedAt = revokedUsers.get(userId);
        if (checkPersisted && users != null) {
            Instant persisted = users.findById(userId)
                    .map(UserEntity::getSessionsRevokedAt)
                    .orElse(null);
            if (persisted != null && (revokedAt == null || persisted.isAfter(revokedAt))) revokedAt = persisted;
        }
        return revokedAt != null && !issuedAt.toInstant().isAfter(revokedAt);
    }

    private void removeExpired() {
        Instant now = Instant.now();
        revokedTokens.entrySet().removeIf(entry -> !entry.getValue().isAfter(now));
    }
}
