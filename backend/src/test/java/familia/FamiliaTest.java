package familia;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

import com.tesoreria.familia.core.exception.FamiliaErrorCode;
import com.tesoreria.familia.core.model.Familia;
import com.tesoreria.shared.domain.exception.DomainException;

@SuppressWarnings({
    "PMD.JUnitAssertionsShouldIncludeMessage",
    "PMD.JUnitTestContainsTooManyAsserts",
    "PMD.AvoidDuplicateLiterals"
})
class FamiliaTest {

  @Test
  void constructor_deberiaNormalizarCamposOpcionales() {
    Familia familia = new Familia(1L, 1L, 2L, " Padre ", null, " Principal ");

    assertEquals("Padre", familia.getParentesco());
    assertFalse(familia.getPrincipal());
    assertEquals("Principal", familia.getObservaciones());
  }

  @Test
  void setParentesco_deberiaLanzarExcepcionCuandoEstaVacio() {
    DomainException ex = assertThrows(
        DomainException.class,
        () -> new Familia(1L, 1L, 2L, " ", false, null));

    assertEquals(FamiliaErrorCode.PARENTESCO_INVALIDO.getCodigo(), ex.getErrorCode());
  }

  @Test
  void setAlumnoId_deberiaLanzarExcepcionCuandoNoEsPositivo() {
    DomainException ex = assertThrows(
        DomainException.class,
        () -> new Familia(1L, 0L, 2L, "Padre", false, null));

    assertEquals(FamiliaErrorCode.ALUMNO_ID_INVALIDO.getCodigo(), ex.getErrorCode());
  }

  @Test
  void setApoderadoId_deberiaLanzarExcepcionCuandoNoEsPositivo() {
    DomainException ex = assertThrows(
        DomainException.class,
        () -> new Familia(1L, 1L, -1L, "Padre", false, null));

    assertEquals(FamiliaErrorCode.APODERADO_ID_INVALIDO.getCodigo(), ex.getErrorCode());
  }

  @Test
  void setObservaciones_deberiaAceptarTextoVacioComoNull() {
    Familia familia = new Familia(1L, 1L, 2L, "Padre", false, " ");

    assertNull(familia.getObservaciones());
  }
}
