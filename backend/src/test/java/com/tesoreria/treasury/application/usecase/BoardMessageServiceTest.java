package com.tesoreria.treasury.application.usecase;

import com.tesoreria.organization.application.CurrentOrganizationService;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.TreasurySettingEntity;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository.TreasurySettingJpaRepository;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class BoardMessageServiceTest {
    private final TreasurySettingJpaRepository settings = mock(TreasurySettingJpaRepository.class);
    private final CurrentOrganizationService organization = mock(CurrentOrganizationService.class);
    private final BoardMessageService service = new BoardMessageService(settings, organization);

    @Test
    void preservesExistingPhraseAndDefaultsForNewFields() {
        when(organization.getId()).thenReturn(12L);
        var value = new TreasurySettingEntity();
        value.setValue("Frase anterior");
        when(settings.findById("BOARD_MESSAGE_12")).thenReturn(Optional.of(value));
        var content = service.getContent();
        assertEquals("Frase anterior", content.message());
        assertEquals("De parte de la directiva", content.heading());
        assertEquals("Gracias por hacer equipo.", content.title());
        assertEquals("Con cariño,\nLa directiva del curso", content.signature());
    }

    @Test
    void savesAllFourFieldsForCurrentOrganization() {
        when(organization.getId()).thenReturn(12L);
        when(settings.save(any())).thenAnswer(call -> call.getArgument(0));
        service.saveContent(new BoardMessageService.Content(" Encabezado ", " Título ",
                " Frase ", " Saludo,\nFirma "));
        var captor = org.mockito.ArgumentCaptor.forClass(TreasurySettingEntity.class);
        verify(settings, times(4)).save(captor.capture());
        assertEquals(java.util.List.of("BOARD_MESSAGE_12_HEADING", "BOARD_MESSAGE_12_TITLE",
                "BOARD_MESSAGE_12", "BOARD_MESSAGE_12_SIGNATURE"),
                captor.getAllValues().stream().map(TreasurySettingEntity::getKey).toList());
        assertEquals(java.util.List.of("Encabezado", "Título", "Frase", "Saludo,\nFirma"),
                captor.getAllValues().stream().map(TreasurySettingEntity::getValue).toList());
    }

    @Test
    void returnsDefaultWithoutStoredMessage() {
        when(organization.getId()).thenReturn(12L);
        when(settings.findById("BOARD_MESSAGE_12")).thenReturn(Optional.empty());
        assertEquals(BoardMessageService.DEFAULT_MESSAGE, service.get());
    }

    @Test
    void savesTrimmedMessageForCurrentOrganization() {
        when(organization.getId()).thenReturn(12L);
        when(settings.findById("BOARD_MESSAGE_12")).thenReturn(Optional.empty());
        when(settings.save(any())).thenAnswer(call -> call.getArgument(0));
        assertEquals("Gracias", service.save("  Gracias  "));
        var captor = org.mockito.ArgumentCaptor.forClass(TreasurySettingEntity.class);
        verify(settings).save(captor.capture());
        assertEquals("BOARD_MESSAGE_12", captor.getValue().getKey());
    }

    @Test
    void readsEachOrganizationsOwnMessage() {
        var value = new TreasurySettingEntity();
        value.setValue("Mensaje del curso");
        when(organization.getId()).thenReturn(12L, 24L);
        when(settings.findById("BOARD_MESSAGE_12")).thenReturn(Optional.of(value));
        when(settings.findById("BOARD_MESSAGE_24")).thenReturn(Optional.empty());
        assertEquals("Mensaje del curso", service.get());
        assertEquals(BoardMessageService.DEFAULT_MESSAGE, service.get());
    }
}
