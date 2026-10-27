package com.tesoreria.user.core.port.out;

import com.tesoreria.organization.application.OrganizationEmailBranding;
import java.time.LocalDateTime;

public interface EmailOutPort {
    boolean sendRecoverySummary(String email, String name, java.util.List<com.tesoreria.user.core.model.RecoveryLink> links);
    boolean sendVerificationEmail(String email, String name, String link);

    default boolean sendVerificationEmail(String email, String name, String link,
                                          OrganizationEmailBranding branding) {
        return sendVerificationEmail(email, name, link);
    }

    boolean sendGuardianInvitationEmail(String email, String name, String link,
                                        OrganizationEmailBranding branding);

    boolean sendPasswordResetEmail(String email, String name, String link);

    default boolean sendPasswordResetEmail(String email, String name, String link,
                                           OrganizationEmailBranding branding) {
        return sendPasswordResetEmail(email, name, link);
    }

    boolean sendPasswordChangedEmail(String email, String name, LocalDateTime changedAt);

    default boolean sendPasswordChangedEmail(String email, String name, LocalDateTime changedAt,
                                             OrganizationEmailBranding branding) {
        return sendPasswordChangedEmail(email, name, changedAt);
    }
}
