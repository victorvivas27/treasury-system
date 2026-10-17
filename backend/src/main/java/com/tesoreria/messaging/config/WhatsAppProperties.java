package com.tesoreria.messaging.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.whatsapp")
public class WhatsAppProperties {
    private boolean enabled;
    private String mode = "test";
    private String provider = "mock";
    private String accessToken = "";
    private String phoneNumberId = "";
    private String businessAccountId = "";
    private String templateInvitation = "";
    private String templateLanguage = "es_CL";
    private String apiVersion = "";
    private String publicUrl = "";
    private String testRecipients = "";
    private String appSecret = "";
    private String verifyToken = "";
    private long invitationHours = 24;
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean value) { enabled = value; }
    public String getMode() { return mode; }
    public void setMode(String value) { mode = value; }
    public String getProvider() { return provider; }
    public void setProvider(String value) { provider = value; }
    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String value) { accessToken = value; }
    public String getPhoneNumberId() { return phoneNumberId; }
    public void setPhoneNumberId(String value) { phoneNumberId = value; }
    public String getBusinessAccountId() { return businessAccountId; }
    public void setBusinessAccountId(String value) { businessAccountId = value; }
    public String getTemplateInvitation() { return templateInvitation; }
    public void setTemplateInvitation(String value) { templateInvitation = value; }
    public String getTemplateLanguage() { return templateLanguage; }
    public void setTemplateLanguage(String value) { templateLanguage = value; }
    public String getApiVersion() { return apiVersion; }
    public void setApiVersion(String value) { apiVersion = value; }
    public String getPublicUrl() { return publicUrl; }
    public void setPublicUrl(String value) { publicUrl = value; }
    public String getTestRecipients() { return testRecipients; }
    public void setTestRecipients(String value) { testRecipients = value; }
    public String getAppSecret() { return appSecret; }
    public void setAppSecret(String value) { appSecret = value; }
    public String getVerifyToken() { return verifyToken; }
    public void setVerifyToken(String value) { verifyToken = value; }
    public long getInvitationHours() { return invitationHours; }
    public void setInvitationHours(long value) { invitationHours = value; }
}
