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
import com.tesoreria.familia.core.model.AlumnoVinculado;
import com.tesoreria.familia.core.model.Familia;
import com.tesoreria.familia.core.model.FamiliaDetalle;
import com.tesoreria.familia.core.port.out.FamiliaRepositoryOutPort;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;

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
  void listar_deberiaRetornarVinculosPaginados() {
    PageRequest pageRequest = new PageRequest(0, 5, null, null);
    FamiliaDetalle detalle = new FamiliaDetalle(
        10L, ALUMNO_ID, "AL-123", "JUAN", "4A", APODERADO_ID, "AP-123", "MARIA", "Madre", true, null);
    when(repository.findAll(pageRequest)).thenReturn(new PageResponse<>(List.of(detalle), 0, 5, 1, 1));

    PageResponse<FamiliaDetalle> resultado = service.listar(pageRequest);

    assertEquals(1, resultado.totalElements());
    assertEquals("AL-123", resultado.content().get(0).getAlumnoCodigo());
  }

  @Test
  void obtenerPorId_deberiaRetornarDetalleCuandoExiste() {
    FamiliaDetalle detalle = new FamiliaDetalle(
        10L, ALUMNO_ID, "AL-123", "JUAN", "4A", APODERADO_ID, "AP-123", "MARIA", "Madre", true, null);
    when(repository.findDetalleById(10L)).thenReturn(Optional.of(detalle));

    FamiliaDetalle resultado = service.obtenerPorId(10L);

    assertEquals("AP-123", resultado.getApoderadoCodigo());
  }

  @Test
  void listarAlumnosPorApoderado_deberiaRetornarAlumnosCuandoApoderadoExiste() {
    AlumnoVinculado vinculado = new AlumnoVinculado(ALUMNO_ID, "AL-123", "JUAN", "4A", "Padre", true);
    when(repository.existsApoderadoById(APODERADO_ID)).thenReturn(true);
    when(repository.findAlumnosByApoderadoId(APODERADO_ID)).thenReturn(List.of(vinculado));

    List<AlumnoVinculado> resultado = service.listarAlumnosPorApoderado(APODERADO_ID);

    assertEquals(1, resultado.size());
    assertEquals("AL-123", resultado.get(0).getCodigo());
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
  void actualizarPorId_deberiaActualizarVinculoExistente() {
    Familia existente = new Familia(10L, ALUMNO_ID, APODERADO_ID, "Padre", false, null);
    Familia cambios = new Familia();
    cambios.setParentesco("Tutor");
    cambios.setPrincipal(true);
    cambios.setObservaciones("Contacto");
    when(repository.findById(10L)).thenReturn(Optional.of(existente));
    when(repository.existsPrincipalByAlumnoIdAndApoderadoIdNot(ALUMNO_ID, APODERADO_ID)).thenReturn(false);
    when(repository.save(existente)).thenReturn(existente);

    Familia resultado = service.actualizar(10L, cambios);

    assertEquals("Tutor", resultado.getParentesco());
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

  @Test
  void eliminarPorId_deberiaEliminarVinculoExistente() {
    when(repository.existsById(10L)).thenReturn(true);

    service.eliminar(10L);

    verify(repository).deleteById(10L);
  }
}
