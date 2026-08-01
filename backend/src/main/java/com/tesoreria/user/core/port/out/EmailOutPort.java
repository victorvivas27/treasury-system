package com.tesoreria.user.core.port.out;

import java.time.LocalDateTime;

public interface EmailOutPort {
    boolean sendVerificationEmail(String email, String name, String link);

    boolean sendPasswordResetEmail(String email, String name, String link);

    boolean sendPasswordChangedEmail(String email, String name, LocalDateTime changedAt);
}
