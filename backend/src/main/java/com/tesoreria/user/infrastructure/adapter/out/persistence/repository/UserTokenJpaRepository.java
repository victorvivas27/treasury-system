package com.tesoreria.user.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.user.core.constant.UserTokenType;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserTokenEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface UserTokenJpaRepository extends JpaRepository<UserTokenEntity, Long> {
    Optional<UserTokenEntity> findByTokenHashAndType(String tokenHash, UserTokenType type);

    @Modifying
    @Query("delete from UserTokenEntity t where t.userId = :userId and t.type = :type")
    void deleteByUserIdAndType(Long userId, UserTokenType type);

    void deleteByUserId(Long userId);
}
