package com.tesoreria.user.application.usecase;

import com.tesoreria.user.core.model.User;
import dev.samstevens.totp.code.CodeGenerator;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.HashingAlgorithm;
import dev.samstevens.totp.exceptions.QrGenerationException;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.qr.QrGenerator;
import dev.samstevens.totp.qr.ZxingPngQrGenerator;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.time.TimeProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;

@Service
public class TwoFactorService {

    private static final int BACKUP_CODES_COUNT = 10;
    private static final int BACKUP_CODE_LENGTH = 8;

    private final SecretGenerator secretGenerator;
    private final CodeGenerator codeGenerator;
    private final QrGenerator qrGenerator;
    private final TimeProvider timeProvider;
    private final String issuer;

    public TwoFactorService(@Value("${app.2fa.issuer:Tesorería}") String issuer) {
        this.secretGenerator = new DefaultSecretGenerator(32);
        this.codeGenerator = new DefaultCodeGenerator(HashingAlgorithm.SHA1, 6);
        this.qrGenerator = new ZxingPngQrGenerator();
        this.timeProvider = new SystemTimeProvider();
        this.issuer = issuer;
    }

    public String generateSecret() {
        return secretGenerator.generate();
    }

    public String generateQrCodeImageUri(String secret, String accountName) throws QrGenerationException {
        QrData qrData = new QrData.Builder()
                .label(accountName)
                .secret(secret)
                .issuer(issuer)
                .algorithm(HashingAlgorithm.SHA1)
                .digits(6)
                .period(30)
                .build();
        byte[] imageData = qrGenerator.generate(qrData);
        return "data:image/png;base64," + Base64.getEncoder().encodeToString(imageData);
    }

    public boolean verifyCode(String secret, String code) {
        if (secret == null || code == null) return false;
        try {
            String currentCode = codeGenerator.generate(secret, timeProvider.getTime());
            return constantTimeEquals(currentCode, code.trim());
        } catch (Exception e) {
            return false;
        }
    }

    public boolean verifyBackupCode(User user, String code) {
        if (user.getBackupCodes() == null || code == null) return false;
        String[] codes = user.getBackupCodes().split(",");
        String normalizedCode = code.trim().toUpperCase(Locale.ROOT);
        for (int i = 0; i < codes.length; i++) {
            if (constantTimeEquals(codes[i].trim(), normalizedCode)) {
                return consumeBackupCode(user, codes, i);
            }
        }
        return false;
    }

    public List<String> generateBackupCodes() {
        List<String> codes = new ArrayList<>();
        SecureRandom random = new SecureRandom();
        for (int i = 0; i < BACKUP_CODES_COUNT; i++) {
            codes.add(generateBackupCode(random));
        }
        return codes;
    }

    public String formatBackupCodes(List<String> codes) {
        return String.join(",", codes);
    }

    private boolean consumeBackupCode(User user, String[] codes, int usedIndex) {
        String[] remaining = new String[codes.length - 1];
        System.arraycopy(codes, 0, remaining, 0, usedIndex);
        System.arraycopy(codes, usedIndex + 1, remaining, usedIndex,
                codes.length - usedIndex - 1);
        user.setBackupCodes(String.join(",", remaining));
        return true;
    }

    private String generateBackupCode(SecureRandom random) {
        StringBuilder code = new StringBuilder(BACKUP_CODE_LENGTH);
        for (int i = 0; i < BACKUP_CODE_LENGTH; i++) {
            int index = random.nextInt(36);
            code.append(index < 10 ? (char) ('0' + index) : (char) ('A' + index - 10));
        }
        return code.toString();
    }

    private boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) return false;
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }
}
