package community;

import com.tesoreria.community.application.usecase.AboutSectionService;
import com.tesoreria.community.core.model.AboutSection;
import com.tesoreria.community.core.port.out.AboutSectionRepositoryOutPort;
import com.tesoreria.shared.domain.exception.DomainException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AboutSectionServiceTest {
    @Mock private AboutSectionRepositoryOutPort repository;
    private AboutSectionService service;

    @BeforeEach
    void setUp() { service = new AboutSectionService(repository); }

    @Test
    void createDeberiaNormalizarYGuardarContenido() {
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        AboutSection result = service.create("  Nuestro curso ", " Comunidad unida ", 2, true,
                "HEART", "PINK", " Juntos somos mejores ", true);
        assertAll(() -> assertEquals("Nuestro curso", result.title()),
                () -> assertEquals("Comunidad unida", result.description()),
                () -> assertEquals(2, result.displayOrder()), () -> assertTrue(result.visible()),
                () -> assertEquals("Juntos somos mejores", result.highlightedPhrase()));
    }

    @Test
    void updateDeberiaConservarFechaDeCreacion() {
        AboutSection current = section();
        when(repository.findById(1L)).thenReturn(Optional.of(current));
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        AboutSection result = service.update(1L, "Nuevo", "Texto", 3, false,
                "STAR", "BLUE", "", false);
        assertAll(() -> assertEquals(current.createdAt(), result.createdAt()),
                () -> assertEquals("Nuevo", result.title()), () -> assertFalse(result.visible()));
    }

    @Test
    void deleteDeberiaValidarExistencia() {
        when(repository.findById(1L)).thenReturn(Optional.of(section()));
        service.delete(1L);
        verify(repository).deleteById(1L);
    }

    @Test
    void updateYDeleteDeberianRechazarIdInexistente() {
        when(repository.findById(9L)).thenReturn(Optional.empty());
        assertAll(
                () -> assertThrows(DomainException.class,
                        () -> service.update(9L, "Título", "Texto", 0, true,
                                "USERS", "GREEN", null, false)),
                () -> assertThrows(DomainException.class, () -> service.delete(9L)));
    }

    @Test
    void listadosDeberianDelegarAlRepositorio() {
        when(repository.findAll()).thenReturn(List.of(section()));
        when(repository.findVisible()).thenReturn(List.of(section()));
        assertAll(() -> assertEquals(1, service.all().size()),
                () -> assertEquals(1, service.publicSections().size()));
    }

    private AboutSection section() {
        LocalDateTime now = LocalDateTime.now();
        return new AboutSection(1L, "Título", "Texto", 0, true, "USERS", "TURQUOISE",
                null, false, now, now);
    }
}
