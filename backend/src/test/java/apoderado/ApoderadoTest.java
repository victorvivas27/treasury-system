package apoderado;

import com.tesoreria.apoderado.core.model.Apoderado;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.shared.infrastructure.constant.ValidationConstants;
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
            DomainException ex = assertThrows(
                    DomainException.class,
                    () -> a.setNombre(null));

            assertEquals("El nombre no puede estar vacío", ex.getMessage());
        }

        @Test
        void deberiaFallarSiElNombreEstaVacio() {
            DomainException ex = assertThrows(
                    DomainException.class,
                    () -> a.setNombre(""));

            assertEquals("El nombre no puede estar vacío", ex.getMessage());
        }

        @Test
        void deberiaFallarSiElNombreSoloTieneEspacios() {
            DomainException ex = assertThrows(
                    DomainException.class,
                    () -> a.setNombre("   "));

            assertEquals("El nombre no puede estar vacío", ex.getMessage());
        }

        @Test
        void deberiaFallarSiElNombreEsCorto() {
            DomainException ex = assertThrows(
                    DomainException.class,
                    () -> a.setNombre("ab"));

            assertEquals("El nombre debe tener al menos 3 caracteres", ex.getMessage());
        }

        @Test
        void deberiaFallarSiElNombreEsMayorDe100Caracteres() {
            DomainException ex = assertThrows(
                    DomainException.class,
                    () -> a.setNombre("a".repeat(101)));

            assertEquals("El nombre no puede tener más de 50 caracteres", ex.getMessage());
        }

        @Test
        void deberiaFallarSiElNombreTieneCaracteresEspeciales() {

            DomainException ex1 = assertThrows(
                    DomainException.class,
                    () -> a.setNombre("Juan123"));

            DomainException ex2 = assertThrows(
                    DomainException.class,
                    () -> a.setNombre("Juan@Perez"));

            DomainException ex3 = assertThrows(
                    DomainException.class,
                    () -> a.setNombre("Juan#Perez"));

            DomainException ex4 = assertThrows(
                    DomainException.class,
                    () -> a.setNombre("Juan$Perez"));

            DomainException ex5 = assertThrows(
                    DomainException.class,
                    () -> a.setNombre("Juan-Perez"));

            DomainException ex6 = assertThrows(
                    DomainException.class,
                    () -> a.setNombre("Juan_Perez"));

            assertAll(
                    () -> assertEquals("El nombre solo puede contener letras y espacios", ex1.getMessage()),
                    () -> assertEquals("El nombre solo puede contener letras y espacios", ex2.getMessage()),
                    () -> assertEquals("El nombre solo puede contener letras y espacios", ex3.getMessage()),
                    () -> assertEquals("El nombre solo puede contener letras y espacios", ex4.getMessage()),
                    () -> assertEquals("El nombre solo puede contener letras y espacios", ex5.getMessage()),
                    () -> assertEquals("El nombre solo puede contener letras y espacios", ex6.getMessage()));
        }

    }

    @Nested
    class EmailTest {

        @Test
        void deberiaFllarSiEmailEstaVacio() {
            DomainException ex = assertThrows(DomainException.class, () -> a.setEmail(""));
            assertEquals("El email no puede estar vacío", ex.getMessage());
        }

        @Test
        void deberiaFallarSiElEmailEsMayorDe100Caracteres() {
            // Construir email de 101 caracteres
            String email = "a".repeat(92) + "@mail.com";

            DomainException ex = assertThrows(DomainException.class,
                    () -> a.setEmail(email));
            assertEquals(
                    "El email no puede tener más de "
                            + ValidationConstants.LONGITUD_MAXIMA_CIEN
                            + ValidationConstants.CARACTERES,
                    ex.getMessage());
        }

        @Test
        void deberiaFallarSiNoContieneArroba() {
            DomainException ex = assertThrows(DomainException.class, () -> a.setEmail("usuariodominio.com"));
            assertEquals(
                    "El email debe contener el símbolo @",
                    ex.getMessage());
        }

        @Test
        void deberiaFallarSiEmailNoTieneUsuarioAntesDelArroba() {
            DomainException ex = assertThrows(DomainException.class, () -> a.setEmail("@dominio.com"));
            assertEquals("El nombre local del email debe tener al menos 3 caracteres", ex.getMessage());
        }

        @Test
        void deberiaFallarSiEmailNoTieneDominioDespuesDelArroba() {
            DomainException ex = assertThrows(DomainException.class, () -> a.setEmail("usuario@"));
            assertEquals("El email debe tener un usuario y un dominio válidos Ejemplo válido: usuario@dominio.com",
                    ex.getMessage());
        }

        @Test
        void deberiaFallarSiEmailTieneMasDeUnArroba() {
            DomainException ex = assertThrows(DomainException.class, () -> a.setEmail("usuario@dominio@com"));
            assertEquals("El email debe tener un usuario y un dominio válidos Ejemplo válido: usuario@dominio.com",
                    ex.getMessage());
        }

        @Test
        void deberiaFallarSiDominioNoTienePunto() {
            DomainException ex = assertThrows(DomainException.class, () -> a.setEmail("usuario@dominio"));
            assertEquals("El email debe tener un dominio con extensión válida (.com, .ar, .es, etc.)", ex.getMessage());
        }

        @Test
        void deberiaFallarSiExtensionDelDominioEsMuyCorta() {
            DomainException ex = assertThrows(DomainException.class, () -> a.setEmail("usuario@dominio.c"));
            assertEquals("La extensión del email debe tener al menos 2 caracteres", ex.getMessage());
        }

        @Test
        void deberiaFallarSiLocalPartDelEmailEsMuyCorto() {
            DomainException ex = assertThrows(DomainException.class, () -> a.setEmail("a@dominio.com"));
            assertEquals("El nombre local del email debe tener al menos 3 caracteres", ex.getMessage());
        }

        @Test
        void deberiaFallarSiEmailTieneCaracteresInvalidos() {
            DomainException ex = assertThrows(DomainException.class, () -> a.setEmail("usuario<>@dominio.com"));
            assertEquals("Formato de email inválido. Ejemplo válido: usuario@dominio.com", ex.getMessage());
        }

        @Test
        void deberiaFallarSiDominioEmpiezaConGuion() {
            DomainException ex = assertThrows(DomainException.class, () -> a.setEmail("usuario@-dominio.com"));
            assertEquals("Formato de email inválido. Ejemplo válido: usuario@dominio.com", ex.getMessage());
        }

        @Test
        void deberiaFallarSiDominioTerminaConGuion() {
            DomainException ex = assertThrows(DomainException.class, () -> a.setEmail("usuario@dominio-.com"));
            assertEquals("Formato de email inválido. Ejemplo válido: usuario@dominio.com", ex.getMessage());
        }

        @Test
        void deberiaAceptarEmailConPuntosEnLocalPart() {
            a.setEmail("usuario.test@dominio.com");
            assertEquals("usuario.test@dominio.com", a.getEmail());
        }

        @Test
        void deberiaAceptarEmailConMasSignoEnLocalPart() {
            a.setEmail("usuario+test@dominio.com");
            assertEquals("usuario+test@dominio.com", a.getEmail());
        }

        @Test
        void deberiaAceptarEmailConGuionBajoEnLocalPart() {
            a.setEmail("usuario_test@dominio.com");
            assertEquals("usuario_test@dominio.com", a.getEmail());
        }

        @Test
        void deberiaAceptarEmailConGuionEnLocalPart() {
            a.setEmail("usuario-test@dominio.com");
            assertEquals("usuario-test@dominio.com", a.getEmail());
        }

        @Test
        void deberiaAceptarEmailConExtensionDeMasDeDosCaracteres() {
            a.setEmail("usuario@dominio.info");
            assertEquals("usuario@dominio.info", a.getEmail());
        }

        @Test
        void deberiaAceptarEmailConSubdominios() {
            a.setEmail("usuario@mail.dominio.com");
            assertEquals("usuario@mail.dominio.com", a.getEmail());
        }

        @Test
        void deberiaAceptarEmailConLongitudExactaMaxima() {
            String localPart = "a".repeat(ValidationConstants.LONGITUD_MAXIMA_CIEN - 11); // -11 para "@mail.com"
            a.setEmail(localPart + "@mail.com");
            assertNotNull(a.getEmail());
        }

        @Test
        void deberiaNormalizarMayusculasYEliminarEspacios() {
            a.setEmail("  USUARIO.TEST@DOMINIO.COM  ");
            assertEquals("usuario.test@dominio.com", a.getEmail());
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
            DomainException ex = assertThrows(DomainException.class, () -> a.setTelefono(null));
            assertEquals("El teléfono no puede estar vacío", ex.getMessage());
        }

        @Test
        void deberiaFallarSiElTelefonoEstaVacio() {
            DomainException ex = assertThrows(DomainException.class, () -> a.setTelefono(""));
            assertEquals("El teléfono no puede estar vacío", ex.getMessage());
        }

        @Test
        void deberiaFallarSiElTelefonoSoloTieneEspacios() {
            DomainException ex = assertThrows(DomainException.class, () -> a.setTelefono("   "));
            assertEquals("El teléfono no puede estar vacío", ex.getMessage());
        }

        @Test
        void deberiaFallarSiTieneMenosDe8Digitos() {
            DomainException ex = assertThrows(DomainException.class, () -> a.setTelefono("+1234567"));
            assertEquals("El teléfono debe tener al menos 8 dígitos", ex.getMessage());
        }

        @Test
        void deberiaFallarSiTieneMasDe15Digitos() {
            DomainException ex = assertThrows(DomainException.class, () -> a.setTelefono("1234567890123456"));
            assertEquals("El teléfono debe tener máximo 15 dígitos", ex.getMessage());
        }

        @Test
        void deberiaFallarSiContieneLetras() {
            DomainException ex = assertThrows(DomainException.class, () -> a.setTelefono("12345abcde"));
            assertEquals("El teléfono solo acepta números y + (ej: +56912345678)", ex.getMessage());
        }

        @Test
        void deberiaFallarSiContieneSimbolos() {
            DomainException ex = assertThrows(DomainException.class, () -> a.setTelefono("123-456-789"));
            assertEquals("El teléfono solo acepta números y + (ej: +56912345678)", ex.getMessage());
        }

        @Test
        void deberiaAceptarTelefonoConMas() {
            a.setTelefono("+56912345678");
            assertEquals("+56912345678", a.getTelefono());
        }

        @Test
        void deberiaFallarSiTieneMasEnMedio() {
            DomainException ex = assertThrows(DomainException.class, () -> a.setTelefono("123+456789"));
            assertEquals("El teléfono solo acepta números y + (ej: +56912345678)", ex.getMessage());
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
            DomainException ex = assertThrows(DomainException.class, () -> a.setObservaciones("a".repeat(201)));
            assertEquals("Las observaciones no pueden tener más de 200 caracteres", ex.getMessage());
        }

    }

    @Nested
    class ConstructorTest {

        @Test
        void constructor_deberiaValidarYNormalizar() {
            a = new Apoderado(
                    1L,
                    "AP-123456789",
                    " juan ",
                    "TEST@MAIL.COM ",
                    "123456789",
                    " obs ",
                    null,
                    null);

            assertEquals("JUAN", a.getNombre());
            assertEquals("test@mail.com", a.getEmail());
            assertEquals("123456789", a.getTelefono());
            assertEquals("obs", a.getObservaciones());
            assertEquals("AP-123456789", a.getCodigo());
        }

    }
}
