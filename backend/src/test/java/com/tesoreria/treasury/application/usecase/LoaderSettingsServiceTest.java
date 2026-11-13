package com.tesoreria.treasury.application.usecase;

import com.tesoreria.organization.application.CurrentOrganizationService;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.TreasurySettingEntity;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository.TreasurySettingJpaRepository;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class LoaderSettingsServiceTest {
    private final TreasurySettingJpaRepository settings = mock(TreasurySettingJpaRepository.class);
    private final CurrentOrganizationService organization = mock(CurrentOrganizationService.class);
    private final LoaderSettingsService service = new LoaderSettingsService(settings, organization, JsonMapper.builder().build());

    @Test
    void returnsOriginalDefaultsWithoutChangingExistingLoaders() {
        when(organization.getId()).thenReturn(12L);
        assertEquals("video", service.get().startup().variant());
        assertEquals("cinematic", service.get().pageTransition().variant());
        verify(settings, never()).save(any());
    }

    @Test
    void savesOneSectionAndReadsTheSameSelectionForOtherUsersInTheCourse() {
        when(organization.getId()).thenReturn(12L);
        var preference = new LoaderSettingsService.Preference("nneo-rising-fill", 0, 800, true);
        var saved = org.mockito.ArgumentCaptor.forClass(TreasurySettingEntity.class);
        service.save(false, preference);
        verify(settings).save(saved.capture());
        assertEquals("LOADER_PAGE_12", saved.getValue().getKey());
        when(settings.findById("LOADER_PAGE_12")).thenReturn(Optional.of(saved.getValue()));
        assertEquals(preference, service.get().pageTransition());
        assertEquals("video", service.get().startup().variant());
        when(organization.getId()).thenReturn(24L);
        assertEquals("cinematic", service.get().pageTransition().variant());
        verify(settings).findById("LOADER_PAGE_24");
    }
}
