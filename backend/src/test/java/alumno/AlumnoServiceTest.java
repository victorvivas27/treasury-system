package alumno;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.tesoreria.alumno.application.usecase.AlumnoService;
import com.tesoreria.alumno.core.exception.AlumnoErrorCode;
import com.tesoreria.alumno.core.model.Alumno;
import com.tesoreria.alumno.core.port.out.AlumnoRepositoryOutPort;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;

@ExtendWith(MockitoExtension.class)
public class AlumnoServiceTest {

  @Mock
  private AlumnoRepositoryOutPort repository;

  @InjectMocks
  private AlumnoService service;
  private Alumno mockAlumno;
  private static final Long ALUMNO_ID = 1L;

  @BeforeEach
  void setUp() {
    mockAlumno = new Alumno();
    mockAlumno.setAlumnoId(ALUMNO_ID);
    mockAlumno.setNombre("JUAN PEREZ");
    mockAlumno.setCurso("4A");
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
    void findById_deberiaRetornarAlumnoCuandoExiste() {
      when(repository.findById(ALUMNO_ID)).thenReturn(Optional.of(mockAlumno));
      Alumno result = service.findById(ALUMNO_ID);
      assertNotNull(result);
      verify(repository).findById(ALUMNO_ID);
    }

    @Test
    void findById_deberiaLanzarExcepcionCuandoNoExiste() {
      when(repository.findById(ALUMNO_ID)).thenReturn(Optional.empty());
      DomainException ex = assertThrows(DomainException.class, () -> service.findById(ALUMNO_ID));
      assertEquals(AlumnoErrorCode.NOT_FOUND.getCodigo(), ex.getErrorCode());
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
      when(repository.existsById(ALUMNO_ID)).thenReturn(false);
      DomainException ex = assertThrows(DomainException.class, () -> service.update(mockAlumno));
      assertEquals(AlumnoErrorCode.NOT_FOUND.getCodigo(), ex.getErrorCode());
      verify(repository, never()).save(any(Alumno.class));
    }

    @Test
    void update_deberiaActualizarCuandoAlumnoExiste() {
      mockAlumno.setAlumnoId(ALUMNO_ID);
      when(repository.existsById(ALUMNO_ID)).thenReturn(true);
      when(repository.save(mockAlumno)).thenReturn(mockAlumno);
      Alumno resultado = service.update(mockAlumno);
      assertNotNull(resultado);
      assertEquals(mockAlumno, resultado);
      verify(repository).save(mockAlumno);
    }
  }

  @Nested
  class DeleteTests {
    @Test
    void deleteById_deberiaEliminarCuandoExiste() {
      when(repository.existsById(ALUMNO_ID)).thenReturn(true);
      service.deleteById(ALUMNO_ID);
      verify(repository).deleteById(ALUMNO_ID);
    }

    @Test
    void deleteById_deberiaLanzarExcepcionCuandoNoExiste() {
      when(repository.existsById(ALUMNO_ID)).thenReturn(false);
      DomainException ex = assertThrows(DomainException.class, () -> service.deleteById(ALUMNO_ID));
      assertNotNull(ex);
    }
  }
}
