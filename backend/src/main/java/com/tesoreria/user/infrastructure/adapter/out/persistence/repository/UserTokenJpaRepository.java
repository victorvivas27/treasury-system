package com.tesoreria.user.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.user.core.constant.UserTokenType;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserTokenEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.time.LocalDateTime;
import java.util.UUID;

public interface UserTokenJpaRepository extends JpaRepository<UserTokenEntity, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<UserTokenEntity> findByTokenHashAndType(String tokenHash, UserTokenType type);

    boolean existsByTokenFamilyIdAndTypeAndRevokedAtIsNullAndUsedAtIsNullAndExpiresAtAfter(
            UUID tokenFamilyId, UserTokenType type, LocalDateTime now);

    @Modifying
    @Query("delete from UserTokenEntity t where t.userId = :userId and t.type = :type")
    void deleteByUserIdAndType(Long userId, UserTokenType type);

    @Modifying
    @Query("""
            update UserTokenEntity t
            set t.revokedAt = :revokedAt
            where t.tokenFamilyId = :tokenFamilyId
              and t.type = :type
              and t.revokedAt is null
            """)
    int revokeFamily(UUID tokenFamilyId, UserTokenType type, LocalDateTime revokedAt);

    void deleteByUserId(Long userId);

    @Modifying
    @Query("delete from UserTokenEntity t where t.expiresAt < :now or t.revokedAt is not null")
    void deleteExpiredOrUsed(LocalDateTime now);
}
