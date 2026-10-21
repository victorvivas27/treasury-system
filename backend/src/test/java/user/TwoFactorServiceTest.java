package user;

import com.tesoreria.user.application.usecase.TwoFactorService;
import com.tesoreria.user.core.model.User;
import org.junit.jupiter.api.Test;

import java.util.Base64;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class TwoFactorServiceTest {
    private final TwoFactorService service = new TwoFactorService("Treasury Test");

    @Test
    void generatesSecretsAndPngQrCodesForAuthenticatorEnrollment() throws Exception {
        String secret = service.generateSecret();
        assertTrue(secret.matches("[A-Z2-7]{32}"));
        String uri = service.generateQrCodeImageUri(secret, "user@example.test");
        assertTrue(uri.startsWith("data:image/png;base64,"));
        byte[] image = Base64.getDecoder().decode(uri.substring(uri.indexOf(',') + 1));
        assertArrayEquals(new byte[]{(byte) 137, 80, 78, 71, 13, 10, 26, 10},
                java.util.Arrays.copyOf(image, 8));
    }

    @Test
    void rejectsMissingMalformedOrIncorrectAuthenticatorCodes() {
        assertAll(
                () -> assertFalse(service.verifyCode(null, "123456")),
                () -> assertFalse(service.verifyCode(service.generateSecret(), null)),
                () -> assertFalse(service.verifyCode("invalid secret!", "123456")),
                () -> assertFalse(service.verifyCode(service.generateSecret(), "")),
                () -> assertFalse(service.verifyCode(service.generateSecret(), "not-a-code")));
    }

    @Test
    void generatesTenBackupCodesWithTheExpectedAlphabetAndRoundTripsStorage() {
        List<String> codes = service.generateBackupCodes();
        assertEquals(10, codes.size());
        assertTrue(codes.stream().allMatch(code -> code.matches("[A-Z0-9]{8}")));
        assertEquals(codes, List.of(service.formatBackupCodes(codes).split(",")));
        assertEquals("", service.formatBackupCodes(List.of()));
    }

    @Test
    void consumesOnlyTheMatchingCodeAndPreventsReuse() {
        User user = new User();
        user.setBackupCodes("FIRST001,MIDDLE02,LAST0003");

        assertTrue(service.verifyBackupCode(user, " middle02 "));
        assertEquals("FIRST001,LAST0003", user.getBackupCodes());
        assertFalse(service.verifyBackupCode(user, "MIDDLE02"));
        assertTrue(service.verifyBackupCode(user, "FIRST001"));
        assertEquals("LAST0003", user.getBackupCodes());
        assertTrue(service.verifyBackupCode(user, "LAST0003"));
        assertEquals("", user.getBackupCodes());
        assertFalse(service.verifyBackupCode(user, "LAST0003"));
        assertFalse(service.verifyBackupCode(user, ""));
        assertFalse(service.verifyBackupCode(user, "   "));
    }

    @Test
    void leavesStoredCodesUnchangedWhenVerificationFails() {
        User user = new User();
        assertFalse(service.verifyBackupCode(user, "FIRST001"));
        user.setBackupCodes("FIRST001,SECOND02");
        assertFalse(service.verifyBackupCode(user, null));
        assertFalse(service.verifyBackupCode(user, ""));
        assertFalse(service.verifyBackupCode(user, "FIRST002"));
        assertEquals("FIRST001,SECOND02", user.getBackupCodes());
    }
}
