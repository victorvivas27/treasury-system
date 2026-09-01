package improvement;

import com.tesoreria.improvement.application.ImprovementSuggestionService;
import com.tesoreria.improvement.infrastructure.persistence.*;
import com.tesoreria.improvement.infrastructure.web.ImprovementSuggestionRequest;
import com.tesoreria.organization.infrastructure.persistence.OrganizationJpaRepository;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.treasury.core.port.out.FileStorageService;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.mock.web.MockMultipartFile;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ImprovementSuggestionServiceTest {
    private ImprovementSuggestionJpaRepository suggestions;
    private ImprovementSuggestionNoteJpaRepository notes;
    private ImprovementSuggestionHistoryJpaRepository history;
    private ImprovementSuggestionRelationJpaRepository relations;
    private UserJpaRepository users;
    private FileStorageService storage;
    private ImprovementSuggestionService service;

    @BeforeEach
    void setUp() {
        suggestions = mock(ImprovementSuggestionJpaRepository.class);
        notes = mock(ImprovementSuggestionNoteJpaRepository.class);
        history = mock(ImprovementSuggestionHistoryJpaRepository.class);
        relations = mock(ImprovementSuggestionRelationJpaRepository.class);
        users = mock(UserJpaRepository.class);
        OrganizationJpaRepository organizations = mock(OrganizationJpaRepository.class);
        storage = mock(FileStorageService.class);
        @SuppressWarnings("unchecked")
        ObjectProvider<FileStorageService> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(storage);
        service = new ImprovementSuggestionService(suggestions, notes, history, relations,
                users, organizations, provider);
        when(users.findByCorreo("user@test.cl")).thenReturn(Optional.of(user(10L, 3L, RoleEnum.USER)));
        when(users.findByCorreo("admin@test.cl")).thenReturn(Optional.of(user(20L, 3L, RoleEnum.ADMIN)));
        when(suggestions.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(notes.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(relations.findBySuggestionIdOrderByCreatedAtDesc(anyLong())).thenReturn(List.of());
    }

    @Test
    void creaSugerenciaValidaConContextoDelUsuario() {
        var response = service.create(request(), png(), "user@test.cl");

        assertEquals(ImprovementCategory.PAYMENTS, response.category());
        assertEquals(List.of("Mas filtros"), response.selectedItems());
        verify(storage).upload(matches("mejoras/captura/usuario-test-us-10/[0-9a-f-]{36}\\.png"),
                any(byte[].class), eq("image/png"));
        verify(suggestions).saveAndFlush(argThat(saved ->
                saved.getUser().getId().equals(10L)
                        && saved.getOrganizationId().equals(3L)
                        && saved.getStatus() == ImprovementStatus.RECEIVED
                        && saved.getInternalPriority() == ImprovementPriority.MEDIUM));
    }

    @Test
    void rechazaCamposInvalidos() {
        assertAll(
                () -> assertThrows(DomainException.class, () -> service.create(
                        new ImprovementSuggestionRequest(ImprovementCategory.UX, List.of(), "", "detalle",
                                UserImpact.USEFUL, "/dashboard"), null, "user@test.cl")),
                () -> assertThrows(DomainException.class, () -> service.create(
                        new ImprovementSuggestionRequest(ImprovementCategory.UX, List.of(), "titulo", "detalle",
                                UserImpact.USEFUL, "dashboard"), null, "user@test.cl")),
                () -> assertThrows(DomainException.class, () -> service.create(
                        new ImprovementSuggestionRequest(ImprovementCategory.UX, List.of("x".repeat(61)),
                                "titulo", "detalle", UserImpact.USEFUL, "/dashboard"), null, "user@test.cl"))
        );
    }

    @Test
    void rechazaCapturaInvalida() {
        MockMultipartFile invalid = new MockMultipartFile("screenshot", "captura.png",
                "image/png", "texto".getBytes());

        assertThrows(DomainException.class, () -> service.create(request(), invalid, "user@test.cl"));
        verify(storage, never()).upload(anyString(), any(), anyString());
    }

    @Test
    void misSugerenciasSoloLeeUsuarioYOrganizacionActual() {
        when(suggestions.findByUserIdAndOrganizationIdOrderByCreatedAtDesc(10L, 3L))
                .thenReturn(List.of(entity(user(10L, 3L, RoleEnum.USER), 3L)));

        assertEquals(1, service.mine("user@test.cl").size());
        verify(suggestions).findByUserIdAndOrganizationIdOrderByCreatedAtDesc(10L, 3L);
        verify(suggestions, never()).findAll();
    }

    @Test
    void limpiaStorageSiFallaPersistencia() {
        when(suggestions.saveAndFlush(any())).thenThrow(new IllegalStateException("db"));

        assertThrows(IllegalStateException.class, () -> service.create(request(), png(), "user@test.cl"));
        verify(storage).delete(matches("mejoras/captura/usuario-test-us-10/[0-9a-f-]{36}\\.png"));
    }

    @Test
    void usuarioComunNoPuedeUsarApiAdministrativa() {
        assertThrows(DomainException.class, () -> service.adminSummary("user@test.cl"));
    }

    @Test
    void administradorListaSugerenciasConPaginacionYScope() {
        ImprovementSuggestionEntity row = entity(user(10L, 3L, RoleEnum.USER), 3L);
        when(suggestions.findAll(any(Specification.class), any(org.springframework.data.domain.PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(row)));

        var page = service.adminList(new ImprovementSuggestionService.AdminQuery(
                0, 10, "Idea", ImprovementStatus.RECEIVED, null, null, null,
                null, null, null, "createdAt", "desc"), "admin@test.cl");

        assertEquals(1, page.content().size());
        assertEquals("Usuario Test", page.content().get(0).userName());
        verify(suggestions).findAll(any(Specification.class), any(org.springframework.data.domain.PageRequest.class));
    }

    @Test
    void administradorPuedeCambiarEstadoYPrioridadConHistorial() {
        ImprovementSuggestionEntity row = entity(user(10L, 3L, RoleEnum.USER), 3L);
        when(suggestions.findById(9L)).thenReturn(Optional.of(row));

        service.updateStatus(9L, ImprovementStatus.UNDER_REVIEW, "admin@test.cl");
        service.updatePriority(9L, ImprovementPriority.HIGH, "admin@test.cl");

        assertEquals(ImprovementStatus.UNDER_REVIEW, row.getStatus());
        assertEquals(ImprovementPriority.HIGH, row.getInternalPriority());
        verify(history, times(2)).save(any());
    }

    @Test
    void administradorPuedeAgregarNotaInterna() {
        ImprovementSuggestionEntity row = entity(user(10L, 3L, RoleEnum.USER), 3L);
        when(suggestions.findById(9L)).thenReturn(Optional.of(row));

        var response = service.addNote(9L, "Revisar con tesoreria.", "admin@test.cl");

        assertEquals("Revisar con tesoreria.", response.content());
        verify(notes).saveAndFlush(argThat(note -> note.getSuggestion() == row
                && note.getAuthor().getId().equals(20L)));
    }

    @Test
    void administradorPuedeEliminarDefinitivamenteSugerenciaEnSuAlcance() {
        ImprovementSuggestionEntity row = entity(user(10L, 3L, RoleEnum.USER), 3L);
        row.setScreenshotObjectName("mejoras/capturas/10/captura.png");
        when(suggestions.findById(9L)).thenReturn(Optional.of(row));

        service.deleteAdmin(9L, "admin@test.cl");

        verify(relations).deleteAllForSuggestion(9L);
        verify(notes).deleteBySuggestionId(9L);
        verify(history).deleteBySuggestionId(9L);
        verify(suggestions).delete(row);
        verify(suggestions).flush();
        verify(storage).delete("mejoras/capturas/10/captura.png");
    }

    private ImprovementSuggestionRequest request() {
        return new ImprovementSuggestionRequest(ImprovementCategory.PAYMENTS, List.of("Mas filtros"),
                "Filtrar pagos", "Necesito filtrar pagos por fecha.", UserImpact.USEFUL, "/tesoreria/pagos");
    }

    private UserEntity user(Long id, Long organizationId, RoleEnum role) {
        UserEntity entity = new UserEntity();
        entity.setId(id);
        entity.setCode((role == RoleEnum.ADMIN ? "ADM-" : "US-") + id);
        entity.setCorreo(role == RoleEnum.ADMIN ? "admin@test.cl" : "user@test.cl");
        entity.setNombre(role == RoleEnum.ADMIN ? "Admin Test" : "Usuario Test");
        entity.setRol(role);
        entity.setOrganizationId(organizationId);
        return entity;
    }

    private ImprovementSuggestionEntity entity(UserEntity user, Long organizationId) {
        ImprovementSuggestionEntity entity = new ImprovementSuggestionEntity();
        entity.setUser(user);
        entity.setOrganizationId(organizationId);
        entity.setCategory(ImprovementCategory.UX);
        entity.setTitle("Idea");
        entity.setDescription("Detalle");
        entity.setUserImpact(UserImpact.USEFUL);
        entity.setInternalPriority(ImprovementPriority.MEDIUM);
        entity.setSourceRoute("/dashboard");
        entity.setStatus(ImprovementStatus.RECEIVED);
        return entity;
    }

    private MockMultipartFile png() {
        return new MockMultipartFile("screenshot", "captura.png", "image/png",
                new byte[]{(byte) 0x89, 'P', 'N', 'G', 1});
    }
}
