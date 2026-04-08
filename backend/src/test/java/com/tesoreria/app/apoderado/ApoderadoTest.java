package com.tesoreria.app.apoderado;

import com.tesoreria.app.apoderado.domain.model.Apoderado;
import com.tesoreria.app.shared.domain.exception.DomainException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ApoderadoTest {
    private Apoderado a;

    @BeforeEach
    void setUp() {
        a = new Apoderado();
    }

    @Nested
    class NombreTest {
        @Test
        void deberiaEliminarEspaciosEnBlancoYConvertirAMayusculas() {
            a.setNombre("  juan perez  ");
            assertEquals("JUAN PEREZ", a.getNombre());
        }

        @Test
        void deberiaFallarSiElNombreEsNull() {
            assertThrows(DomainException.class, () -> a.setNombre(null));
        }

        @Test
        void deberiaFallarSiElNombreEstaVacio() {
            assertThrows(DomainException.class, () -> a.setNombre(""));
        }

        @Test
        void deberiaFallarSiElNombreSoloTieneEspacios() {
            assertThrows(DomainException.class, () -> a.setNombre("   "));
        }

        @Test
        void deberiaFallarSiElNombreEsCorto() {
            assertThrows(DomainException.class, () -> a.setNombre("ab"));
        }

        @Test
        void deberiaFallarSiElNombreEsMayorDe100Caracteres() {
            assertThrows(DomainException.class, () -> a.setNombre("a".repeat(101)));
        }

    }

    @Nested
    class EmailTest {

        @Test
        void deberiaEliminarEspaciosEnBlancoYConvertirAMinusculas() {
            a.setEmail("  TEST@MAIL.COM  ");
            assertEquals("test@mail.com", a.getEmail());
        }

        @Test
        void deberiaFallarSiElEmailEsNull() {
            assertThrows(DomainException.class, () -> a.setEmail(null));
        }

        @Test
        void deberiaFallarSiElEmailEstaVacio() {
            assertThrows(DomainException.class, () -> a.setEmail(""));
        }

        @Test
        void deberiaFallarSiElEmailSoloTieneEspacios() {
            assertThrows(DomainException.class, () -> a.setEmail("   "));
        }

        @Test
        void deberiaFallarSiElEmailEsMayorDe150Caracteres() {
            String emailLargo = "a".repeat(151) + "@mail.com";
            assertThrows(DomainException.class, () -> a.setEmail(emailLargo));
        }

        @Test
        void deberiaFallarSiElFormatoDelEmailEsInvalido() {
            assertThrows(DomainException.class, () -> a.setEmail("correo-invalido"));
        }
    }

    @Nested
    class TelefonoTest {

        @Test
        void deberiaEliminarEspaciosEnBlanco() {
            a.setTelefono(" 123456789 ");
            assertEquals("123456789", a.getTelefono());
        }

        @Test
        void deberiaFallarSiElTelefonoEsNull() {
            assertThrows(DomainException.class, () -> a.setTelefono(null));
        }

        @Test
        void deberiaFallarSiElTelefonoEstaVacio() {
            assertThrows(DomainException.class, () -> a.setTelefono(""));
        }

        @Test
        void deberiaFallarSiElTelefonoSoloTieneEspacios() {
            assertThrows(DomainException.class, () -> a.setTelefono("   "));
        }

        @Test
        void deberiaFallarSiTieneMenosDe9Digitos() {
            assertThrows(DomainException.class, () -> a.setTelefono("12345678"));
        }

        @Test
        void deberiaFallarSiTieneMasDe15Digitos() {
            assertThrows(DomainException.class, () -> a.setTelefono("1234567890123456"));
        }

        @Test
        void deberiaFallarSiContieneLetras() {
            assertThrows(DomainException.class, () -> a.setTelefono("12345abcde"));
        }

        @Test
        void deberiaFallarSiContieneSimbolos() {
            assertThrows(DomainException.class, () -> a.setTelefono("123-456-789"));
        }

        @Test
        void deberiaAceptarTelefonoConMas() {
            a.setTelefono("+56912345678");
            assertEquals("+56912345678", a.getTelefono());
        }

        @Test
        void deberiaFallarSiTieneMasEnMedio() {
            assertThrows(DomainException.class, () -> a.setTelefono("123+456789"));
        }
    }

    @Nested
    class ObservacionesTest {
        @Test
        void deberiaAceptarNull() {
            a.setObservaciones(null);
            assertNull(a.getObservaciones());
        }

        @Test
        void noDebeTenerMasDeDocientosCaracteres() {
            assertThrows(DomainException.class, () -> a.setObservaciones("a".repeat(201)));
        }

    }

    @Nested
    class ConstructorTest {

        @Test
        void constructor_deberiaValidarYNormalizar () {
        a = new Apoderado(
                1L,
                " juan ",
                "TEST@MAIL.COM ",
                "123456789",
                " obs "
        );

        assertEquals("JUAN", a.getNombre());
        assertEquals("test@mail.com", a.getEmail());
        assertEquals("123456789", a.getTelefono());
        assertEquals("obs", a.getObservaciones());
    }

    }
}
