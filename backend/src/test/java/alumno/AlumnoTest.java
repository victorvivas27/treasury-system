package alumno;

import com.tesoreria.alumno.core.model.Alumno;
import com.tesoreria.shared.domain.exception.DomainException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AlumnoTest {
    private Alumno a;

    @BeforeEach
    void setUp() {
        a = new Alumno();
    }

    @Nested
    class NombreTest {
        @Test
        void deberiaConvertirAMayusculasYNormalizarEspacios() {
            a.setNombre("  juan perez  ");
            assertEquals("JUAN PEREZ", a.getNombre());
        }

        @Test
        void deberiaFallarSiElNombreEsNull() {
            DomainException ex = assertThrows(DomainException.class, () -> a.setNombre(null));
            assertEquals("El nombre no puede estar vacío", ex.getMessage());
        }

        @Test
        void deberiaFallarSiElNombreEstaVacio() {
            DomainException ex = assertThrows(DomainException.class, () -> a.setNombre(""));
            assertEquals("El nombre no puede estar vacío", ex.getMessage());
        }

        @Test
        void deberiaFallarSiElNombreSoloTieneEspacios() {
            DomainException ex = assertThrows(DomainException.class, () -> a.setNombre("   "));
            assertEquals("El nombre no puede estar vacío", ex.getMessage());
        }

        @Test
        void deberiaFallarSiElNombreEsMenorDe2Caracteres() {
            DomainException ex = assertThrows(DomainException.class, () -> a.setNombre("a"));
            assertEquals("El nombre debe tener al menos 2 caracteres", ex.getMessage());
        }

        @Test
        void deberiaFallarSiElNombreMayorDe100Caracteres() {
            DomainException ex = assertThrows(DomainException.class, () -> a.setNombre("a".repeat(101)));
            assertEquals("El nombre no puede tener más de 100 caracteres", ex.getMessage());
        }

        @Test
        void deberiaFallarSiElNombreTieneNumeros() {
            DomainException ex = assertThrows(DomainException.class, () -> a.setNombre("Juan123"));
            assertEquals("El nombre solo puede contener letras y espacios", ex.getMessage());
        }

        @Test
        void deberiaFallarSiElNombreTieneCaracteresEspeciales() {
            DomainException ex1 = assertThrows(DomainException.class, () -> a.setNombre("Juan@Perez"));
            DomainException ex2 = assertThrows(DomainException.class, () -> a.setNombre("Juan#Perez"));
            DomainException ex3 = assertThrows(DomainException.class, () -> a.setNombre("Juan-Perez"));

            assertAll(
                    () -> assertEquals("El nombre solo puede contener letras y espacios", ex1.getMessage()),
                    () -> assertEquals("El nombre solo puede contener letras y espacios", ex2.getMessage()),
                    () -> assertEquals("El nombre solo puede contener letras y espacios", ex3.getMessage()));
        }

        @Test
        void deberiaAceptarNombreConTildes() {
            a.setNombre("José María");
            assertEquals("JOSÉ MARÍA", a.getNombre());
        }
    }

    @Nested
    class CursoTest {
        @Test
        void deberiaFallarSiElCursoEsNull() {
            DomainException ex = assertThrows(DomainException.class, () -> a.setCurso(null));
            assertEquals("El curso no puede estar vacío", ex.getMessage());
        }

        @Test
        void deberiaFallarSiElCursoEstaVacio() {
            DomainException ex = assertThrows(DomainException.class, () -> a.setCurso(""));
            assertEquals("El curso no puede estar vacío", ex.getMessage());
        }

        @Test
        void deberiaFallarSiElCursoSoloTieneEspacios() {
            DomainException ex = assertThrows(DomainException.class, () -> a.setCurso("   "));
            assertEquals("El curso no puede estar vacío", ex.getMessage());
        }

        @Test
        void deberiaFallarSiElCursoMayorDe4Caracteres() {
            DomainException ex = assertThrows(DomainException.class, () -> a.setCurso("a".repeat(5)));
            assertEquals("El curso no puede tener más de 4 caracteres", ex.getMessage());
        }

        @Test
        void deberiaAceptarCursoValido() {
            a.setCurso("4A");
            assertEquals("4A", a.getCurso());
        }

        @Test
        void deberiaAceptarCursoConEspacios() {
            a.setCurso("  4 A  ");
            assertEquals("4 A", a.getCurso());
        }
    }

    @Nested
    class ConstructorTest {
        @Test
        void constructor_deberiaValidarYNormalizar() {
            a = new Alumno(1L, "AL-123456789", "  juan  ", "  4a  ", null, null);
            assertEquals("JUAN", a.getNombre());
            assertEquals("4a", a.getCurso());
            assertEquals("AL-123456789", a.getCodigo());
        }
    }

    @Nested
    class ObservacionTest {
        @Test
        void deberiaNormalizarObservacionOpcional() {
            a.setObservacion("  Mati es alérgico al maní  ");
            assertEquals("Mati es alérgico al maní", a.getObservacion());
            a.setObservacion("   ");
            assertEquals("", a.getObservacion());
        }

        @Test
        void deberiaRechazarObservacionMayorDe300Caracteres() {
            DomainException ex = assertThrows(DomainException.class,
                    () -> a.setObservacion("a".repeat(301)));
            assertEquals("La observación no puede tener más de 300 caracteres", ex.getMessage());
        }
    }
}
