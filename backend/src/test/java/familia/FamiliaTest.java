package familia;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.tesoreria.familia.core.exception.FamiliaErrorCode;
import com.tesoreria.familia.core.model.Familia;
import com.tesoreria.familia.core.model.FamiliaApoderado;
import com.tesoreria.shared.domain.exception.DomainException;

@SuppressWarnings({
    "PMD.JUnitAssertionsShouldIncludeMessage",
    "PMD.JUnitTestContainsTooManyAsserts"
})
class FamiliaTest {

  @Test
  void constructor_deberiaNormalizarCamposValidos() {
    Familia familia = new Familia(
        10L,
        1L,
        "FAM-12345678",
        List.of(new FamiliaApoderado(2L, " Padre ", true)),
        " Observacion ");

    assertEquals(10L, familia.getFamiliaId());
    assertEquals(1L, familia.getAlumnoId());
    assertEquals("FAM-12345678", familia.getCodigo());
    assertEquals("Observacion", familia.getObservaciones());
    assertEquals(List.of(2L), familia.getApoderadosIds());
    assertEquals("Padre", familia.getApoderados().get(0).getParentesco());
    assertTrue(familia.getApoderados().get(0).getEsPrincipal());
  }

  @Test
  void setAlumnoId_deberiaRechazarValoresInvalidos() {
    DomainException ex = assertThrows(
        DomainException.class,
        () -> new Familia(null, 0L, null, List.of(new FamiliaApoderado(1L, "Padre", true)), null));

    assertEquals(FamiliaErrorCode.ALUMNO_ID_INVALIDO.getStatus(), ex.getStatus());
  }

  @Test
  void setApoderados_deberiaRechazarListaVacia() {
    DomainException ex = assertThrows(
        DomainException.class,
        () -> new Familia(null, 1L, null, List.of(), null));

    assertEquals(FamiliaErrorCode.APODERADOS_VACIOS.getStatus(), ex.getStatus());
  }

  @Test
  void setApoderados_deberiaRechazarDuplicados() {
    DomainException ex = assertThrows(
        DomainException.class,
        () -> new Familia(
            null,
            1L,
            null,
            List.of(
                new FamiliaApoderado(2L, "Padre", true),
                new FamiliaApoderado(2L, "Madre", false)),
            null));

    assertEquals(FamiliaErrorCode.APODERADO_YA_VINCULADO.getStatus(), ex.getStatus());
  }

  @Test
  void setApoderados_deberiaRechazarMasDeUnPrincipal() {
    DomainException ex = assertThrows(
        DomainException.class,
        () -> new Familia(
            null,
            1L,
            null,
            List.of(
                new FamiliaApoderado(2L, "Padre", true),
                new FamiliaApoderado(3L, "Madre", true)),
            null));

    assertEquals(FamiliaErrorCode.PRINCIPAL_DUPLICADO.getStatus(), ex.getStatus());
  }

  @Test
  void setObservaciones_deberiaAceptarBlancoComoNullYRechazarTextoLargo() {
    Familia familia = new Familia(null, 1L, null, List.of(new FamiliaApoderado(2L, "Padre", false)), " ");

    assertEquals(null, familia.getObservaciones());

    DomainException ex = assertThrows(
        DomainException.class,
        () -> familia.setObservaciones("a".repeat(201)));

    assertEquals(FamiliaErrorCode.OBSERVACIONES_INVALIDO.getStatus(), ex.getStatus());
  }

  @Test
  void familiaApoderado_deberiaValidarCampos() {
    FamiliaApoderado apoderado = new FamiliaApoderado(2L, "Tutor", null);

    assertEquals(2L, apoderado.getApoderadoId());
    assertEquals("Tutor", apoderado.getParentesco());
    assertFalse(apoderado.getEsPrincipal());
  }

  @Test
  void familiaApoderado_deberiaRechazarIdYParentescoInvalidos() {
    DomainException idEx = assertThrows(
        DomainException.class,
        () -> new FamiliaApoderado(0L, "Padre", true));
    DomainException parentescoEx = assertThrows(
        DomainException.class,
        () -> new FamiliaApoderado(1L, " ", true));
    DomainException largoEx = assertThrows(
        DomainException.class,
        () -> new FamiliaApoderado(1L, "a".repeat(51), true));

    assertEquals(FamiliaErrorCode.APODERADO_ID_INVALIDO.getStatus(), idEx.getStatus());
    assertEquals(FamiliaErrorCode.PARENTESCO_INVALIDO.getStatus(), parentescoEx.getStatus());
    assertEquals(FamiliaErrorCode.PARENTESCO_INVALIDO.getStatus(), largoEx.getStatus());
  }
}
