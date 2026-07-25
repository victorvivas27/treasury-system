package com.tesoreria.user.config.security;

import java.time.Instant;
import java.util.Date;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

@Component
public class TokenRevocationService {
  private final ConcurrentHashMap<String, Instant> revokedTokens = new ConcurrentHashMap<>();

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

  private void removeExpired() {
    Instant now = Instant.now();
    revokedTokens.entrySet().removeIf(entry -> !entry.getValue().isAfter(now));
  }
}
