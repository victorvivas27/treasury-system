package alumno;

import com.tesoreria.alumno.application.usecase.AlumnoService;
import com.tesoreria.alumno.core.exception.AlumnoErrorCode;
import com.tesoreria.alumno.core.model.Alumno;
import com.tesoreria.alumno.core.port.out.AlumnoRepositoryOutPort;
import com.tesoreria.familia.core.port.out.FamiliaRepositoryOutPort;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SuppressWarnings("unused")
@ExtendWith(MockitoExtension.class)
public class AlumnoServiceTest {

    private static final Long ALUMNO_ID = 1L;
    @Mock
    private AlumnoRepositoryOutPort repository;
    @Mock
    private FamiliaRepositoryOutPort familiaRepository;
    @InjectMocks
    private AlumnoService service;
    private Alumno mockAlumno;

    @BeforeEach
    void setUp() {
        mockAlumno = new Alumno();
        mockAlumno.setAlumnoId(ALUMNO_ID);
        mockAlumno.setNombre("JUAN PEREZ");
        mockAlumno.setCodigo("AL-3291DF6A");
        mockAlumno.setCurso("4A");
        mockAlumno.setObservacion("Alérgico al maní");
    }

    private PageResponse<Alumno> mockPageResponse() {
        return new PageResponse<>(
                List.of(mockAlumno),
                0,
                10,
                1,
                1);
    }

    @Nested
    class FindTests {
        @Test
        void findByCodigo_deberiaRetornarAlumnoCuandoExiste() {
            when(repository.findByCodigo(mockAlumno.getCodigo())).thenReturn(Optional.of(mockAlumno));
            Alumno result = service.findByCodigo(mockAlumno.getCodigo());
            assertNotNull(result);
            verify(repository).findByCodigo(mockAlumno.getCodigo());
        }

        @Test
        void findByCodigo_deberiaLanzarExcepcionCuandoNoExiste() {
            when(repository.findByCodigo(mockAlumno.getCodigo())).thenReturn(Optional.empty());
            DomainException ex = assertThrows(DomainException.class, () -> service.findByCodigo(mockAlumno.getCodigo()));
            assertEquals(AlumnoErrorCode.NOT_FOUND.getStatus(), ex.getStatus());
        }

        @Test
        void findAll_deberiaRetornarPageResponse() {
            PageRequest pageRequest = new PageRequest(0, 10, null, null);
            PageResponse<Alumno> pageResponse = mockPageResponse();

            when(repository.findAll(pageRequest)).thenReturn(pageResponse);

            PageResponse<Alumno> resultado = service.findAll(pageRequest);

            assertNotNull(resultado);
            assertEquals(1, resultado.content().size());
            assertEquals(0, resultado.page());
            assertEquals(10, resultado.size());
            assertEquals(1, resultado.totalPages());
            assertEquals(1, resultado.totalElements());
            verify(repository).findAll(pageRequest);
        }
    }

    @Nested
    class CreateTests {

        @Test
        void create_deberiaGuardarCuandoAlumnoNoExiste() {
            when(repository.save(mockAlumno))
                    .thenReturn(mockAlumno);
            Alumno resultado = service.create(mockAlumno);
            assertNotNull(resultado);
            verify(repository).save(mockAlumno);
        }
    }

    @Nested
    class UpdateTests {
        @Test
        void update_deberiaLanzarExcepcionCuandoAlumnoNoExiste() {
            mockAlumno.setAlumnoId(ALUMNO_ID);
            when(repository.findByCodigo(mockAlumno.getCodigo())).thenReturn(Optional.empty());
            DomainException ex = assertThrows(DomainException.class, () -> service.update(mockAlumno));
            assertEquals(AlumnoErrorCode.NOT_FOUND.getStatus(), ex.getStatus());
            verify(repository, never()).save(any(Alumno.class));
        }

        @Test
        void update_deberiaActualizarCuandoAlumnoExiste() {
            mockAlumno.setAlumnoId(ALUMNO_ID);
            when(repository.findByCodigo(mockAlumno.getCodigo())).thenReturn(Optional.of(mockAlumno));
            when(repository.save(mockAlumno)).thenReturn(mockAlumno);
            Alumno resultado = service.update(mockAlumno);
            assertNotNull(resultado);
            assertEquals(mockAlumno, resultado);
            assertEquals("Alérgico al maní", resultado.getObservacion());
            verify(repository).save(mockAlumno);
        }
    }

    @Nested
    class DeleteTests {
        @Test
        void deleteByCodigo_deberiaEliminarCuandoExiste() {
            when(repository.findByCodigo(mockAlumno.getCodigo())).thenReturn(Optional.of(mockAlumno));
            when(familiaRepository.existsByAlumnoId(ALUMNO_ID)).thenReturn(false);

            service.deleteByCodigo(mockAlumno.getCodigo());

            verify(repository).deleteByCodigo(mockAlumno.getCodigo());
        }

        @Test
        void deleteByCodigo_deberiaImpedirEliminarAlumnoConFamilia() {
            when(repository.findByCodigo(mockAlumno.getCodigo())).thenReturn(Optional.of(mockAlumno));
            when(familiaRepository.existsByAlumnoId(ALUMNO_ID)).thenReturn(true);

            DomainException ex = assertThrows(DomainException.class,
                    () -> service.deleteByCodigo(mockAlumno.getCodigo()));

            assertEquals(AlumnoErrorCode.FAMILIA_ASIGNADA.getStatus(), ex.getStatus());
            assertEquals(
                    "No se puede eliminar el alumno porque pertenece a una familia. "
                            + "Primero debe desvincularlo de la familia.",
                    ex.getMessage());
            verify(repository, never()).deleteByCodigo(any(String.class));
        }

        @Test
        void deleteByCodigo_deberiaLanzarExcepcionCuandoNoExiste() {
            when(repository.findByCodigo(mockAlumno.getCodigo())).thenReturn(Optional.empty());

            DomainException ex = assertThrows(DomainException.class,
                    () -> service.deleteByCodigo(mockAlumno.getCodigo()));

            assertEquals(AlumnoErrorCode.NOT_FOUND.getStatus(), ex.getStatus());
            verify(repository, never()).deleteByCodigo(any(String.class));
        }
    }
}
