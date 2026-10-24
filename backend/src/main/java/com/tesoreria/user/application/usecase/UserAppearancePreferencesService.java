package com.tesoreria.user.application.usecase;

import com.tesoreria.user.infrastructure.adapter.in.web.dto.UserAppearancePreferencesRequest;
import com.tesoreria.user.infrastructure.adapter.in.web.dto.UserAppearancePreferencesResponse;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserAppearancePreferencesEntity;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserAppearancePreferencesJpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserAppearancePreferencesService {
    private final UserAppearancePreferencesJpaRepository repository;

    public UserAppearancePreferencesService(UserAppearancePreferencesJpaRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public UserAppearancePreferencesResponse find(Long userId) {
        return repository.findById(userId).map(this::toResponse)
                .orElseGet(() -> new UserAppearancePreferencesResponse(null, null, null));
    }

    @Transactional
    public UserAppearancePreferencesResponse save(Long userId, UserAppearancePreferencesRequest request) {
        UserAppearancePreferencesEntity entity = repository.findById(userId)
                .orElseGet(() -> {
                    UserAppearancePreferencesEntity created = new UserAppearancePreferencesEntity();
                    created.setUserId(userId);
                    return created;
                });
        entity.setThemePreference(request.themePreference());
        entity.setPalette(request.palette());
        entity.setFontFamily(request.fontFamily());
        return toResponse(repository.save(entity));
    }

    private UserAppearancePreferencesResponse toResponse(UserAppearancePreferencesEntity entity) {
        return new UserAppearancePreferencesResponse(
                entity.getThemePreference(), entity.getPalette(), entity.getFontFamily());
    }
}
