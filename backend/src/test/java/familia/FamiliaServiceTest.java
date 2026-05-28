package familia;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.tesoreria.familia.application.usecase.FamiliaService;
import com.tesoreria.familia.core.exception.FamiliaErrorCode;
import com.tesoreria.familia.core.model.AlumnoApoderadoVinculado;
import com.tesoreria.familia.core.model.Familia;
import com.tesoreria.familia.core.port.out.FamiliaRepositoryOutPort;
import com.tesoreria.shared.domain.exception.DomainException;

@SuppressWarnings({
    "PMD.JUnitAssertionsShouldIncludeMessage",
    "PMD.JUnitTestContainsTooManyAsserts",
    "PMD.AvoidDuplicateLiterals"
})
@ExtendWith(MockitoExtension.class)
class FamiliaServiceTest {

  private static final Long ALUMNO_ID = 1L;
  private static final Long APODERADO_ID = 2L;

  @Mock
  private FamiliaRepositoryOutPort repository;

  @InjectMocks
  private FamiliaService service;

  private Familia familia;

  @BeforeEach
  void setUp() {
    familia = new Familia(null, ALUMNO_ID, APODERADO_ID, "Padre", true, "Principal");
  }

  @Test
  void vincular_deberiaGuardarCuandoDatosSonValidos() {
    when(repository.existsAlumnoById(ALUMNO_ID)).thenReturn(true);
    when(repository.existsApoderadoById(APODERADO_ID)).thenReturn(true);
    when(repository.existsByAlumnoIdAndApoderadoId(ALUMNO_ID, APODERADO_ID)).thenReturn(false);
    when(repository.existsPrincipalByAlumnoId(ALUMNO_ID)).thenReturn(false);
    when(repository.save(familia)).thenReturn(familia);

    Familia resultado = service.vincular(familia);

    assertNotNull(resultado);
    verify(repository).save(familia);
  }

  @Test
  void vincular_deberiaLanzarExcepcionCuandoAlumnoNoExiste() {
    when(repository.existsAlumnoById(ALUMNO_ID)).thenReturn(false);

    DomainException ex = assertThrows(DomainException.class, () -> service.vincular(familia));

    assertEquals(FamiliaErrorCode.ALUMNO_NOT_FOUND.getCodigo(), ex.getErrorCode());
    verify(repository, never()).save(familia);
  }

  @Test
  void vincular_deberiaLanzarExcepcionCuandoApoderadoNoExiste() {
    when(repository.existsAlumnoById(ALUMNO_ID)).thenReturn(true);
    when(repository.existsApoderadoById(APODERADO_ID)).thenReturn(false);

    DomainException ex = assertThrows(DomainException.class, () -> service.vincular(familia));

    assertEquals(FamiliaErrorCode.APODERADO_NOT_FOUND.getCodigo(), ex.getErrorCode());
    verify(repository, never()).save(familia);
  }

  @Test
  void vincular_deberiaLanzarExcepcionCuandoVinculoExiste() {
    when(repository.existsAlumnoById(ALUMNO_ID)).thenReturn(true);
    when(repository.existsApoderadoById(APODERADO_ID)).thenReturn(true);
    when(repository.existsByAlumnoIdAndApoderadoId(ALUMNO_ID, APODERADO_ID)).thenReturn(true);

    DomainException ex = assertThrows(DomainException.class, () -> service.vincular(familia));

    assertEquals(FamiliaErrorCode.DUPLICADO.getCodigo(), ex.getErrorCode());
    verify(repository, never()).save(familia);
  }

  @Test
  void vincular_deberiaLanzarExcepcionCuandoYaExistePrincipal() {
    when(repository.existsAlumnoById(ALUMNO_ID)).thenReturn(true);
    when(repository.existsApoderadoById(APODERADO_ID)).thenReturn(true);
    when(repository.existsByAlumnoIdAndApoderadoId(ALUMNO_ID, APODERADO_ID)).thenReturn(false);
    when(repository.existsPrincipalByAlumnoId(ALUMNO_ID)).thenReturn(true);

    DomainException ex = assertThrows(DomainException.class, () -> service.vincular(familia));

    assertEquals(FamiliaErrorCode.PRINCIPAL_DUPLICADO.getCodigo(), ex.getErrorCode());
  }

  @Test
  void listarApoderadosPorAlumno_deberiaRetornarVinculosCuandoAlumnoExiste() {
    AlumnoApoderadoVinculado vinculado = new AlumnoApoderadoVinculado(
        APODERADO_ID, "AP-123", "JUAN", "juan@test.cl", "987654321", "Padre", true, null);
    when(repository.existsAlumnoById(ALUMNO_ID)).thenReturn(true);
    when(repository.findApoderadosByAlumnoId(ALUMNO_ID)).thenReturn(List.of(vinculado));

    List<AlumnoApoderadoVinculado> resultado = service.listarApoderadosPorAlumno(ALUMNO_ID);

    assertEquals(1, resultado.size());
    assertEquals("AP-123", resultado.get(0).getCodigo());
  }

  @Test
  void actualizar_deberiaActualizarVinculoExistente() {
    Familia existente = new Familia(10L, ALUMNO_ID, APODERADO_ID, "Padre", false, null);
    Familia cambios = new Familia(null, ALUMNO_ID, APODERADO_ID, "Madre", true, "Contacto");
    when(repository.existsAlumnoById(ALUMNO_ID)).thenReturn(true);
    when(repository.existsApoderadoById(APODERADO_ID)).thenReturn(true);
    when(repository.findByAlumnoIdAndApoderadoId(ALUMNO_ID, APODERADO_ID)).thenReturn(Optional.of(existente));
    when(repository.existsPrincipalByAlumnoIdAndApoderadoIdNot(ALUMNO_ID, APODERADO_ID)).thenReturn(false);
    when(repository.save(existente)).thenReturn(existente);

    Familia resultado = service.actualizar(cambios);

    assertEquals("Madre", resultado.getParentesco());
    assertEquals(true, resultado.getPrincipal());
    verify(repository).save(existente);
  }

  @Test
  void eliminar_deberiaEliminarVinculoExistente() {
    Familia existente = new Familia(10L, ALUMNO_ID, APODERADO_ID, "Padre", false, null);
    when(repository.existsAlumnoById(ALUMNO_ID)).thenReturn(true);
    when(repository.existsApoderadoById(APODERADO_ID)).thenReturn(true);
    when(repository.findByAlumnoIdAndApoderadoId(ALUMNO_ID, APODERADO_ID)).thenReturn(Optional.of(existente));

    service.eliminar(ALUMNO_ID, APODERADO_ID);

    verify(repository).delete(existente);
  }
}
