package com.tesoreria.user.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserAppearancePreferencesEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserAppearancePreferencesJpaRepository
        extends JpaRepository<UserAppearancePreferencesEntity, Long> {
}
