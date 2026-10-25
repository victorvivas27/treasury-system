package com.tesoreria.user.application.usecase;

import com.tesoreria.user.infrastructure.adapter.in.web.dto.UserAppearancePreferencesRequest;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserAppearancePreferencesEntity;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserAppearancePreferencesJpaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserAppearancePreferencesServiceTest {
    @Mock private UserAppearancePreferencesJpaRepository repository;
    @InjectMocks private UserAppearancePreferencesService service;

    @Test
    void returnsNullPreferencesUntilTheAccountHasSavedThem() {
        when(repository.findById(17L)).thenReturn(Optional.empty());

        var result = service.find(17L);

        assertNull(result.themePreference());
        assertNull(result.palette());
        assertNull(result.fontFamily());
    }

    @Test
    void savesAllAppearancePreferencesForTheAuthenticatedUser() {
        when(repository.findById(17L)).thenReturn(Optional.empty());
        when(repository.save(any(UserAppearancePreferencesEntity.class))).thenAnswer(invocation ->
                invocation.getArgument(0));

        var result = service.save(17L,
                new UserAppearancePreferencesRequest("light", "violet-coral", "space-mono"));

        assertEquals("light", result.themePreference());
        assertEquals("violet-coral", result.palette());
        assertEquals("space-mono", result.fontFamily());
        verify(repository).save(any(UserAppearancePreferencesEntity.class));
    }
}
