package com.tesoreria.treasury.application.usecase;

import com.tesoreria.organization.application.CurrentOrganizationService;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.TreasurySettingEntity;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository.TreasurySettingJpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BoardMessageService {
    public static final String DEFAULT_MESSAGE = "Su tiempo, ideas y cariño hacen posibles momentos inolvidables para nuestros niños y niñas.";
    private final TreasurySettingJpaRepository settings;
    private final CurrentOrganizationService organization;

    public BoardMessageService(TreasurySettingJpaRepository settings, CurrentOrganizationService organization) {
        this.settings = settings;
        this.organization = organization;
    }

    private String key() {
        return "BOARD_MESSAGE_" + organization.getId();
    }

    @Transactional(readOnly = true)
    public String get() {
        return settings.findById(key()).map(TreasurySettingEntity::getValue).orElse(DEFAULT_MESSAGE);
    }

    @Transactional
    public String save(String message) {
        return saveSetting(key(), message);
    }

    @Transactional(readOnly = true)
    public Content getContent() {
        return new Content(read("HEADING", "De parte de la directiva"),
                read("TITLE", "Gracias por hacer equipo."), get(),
                read("SIGNATURE", "Con cariño,\nLa directiva del curso"));
    }

    @Transactional
    public Content saveContent(Content content) {
        saveSetting(key() + "_HEADING", content.heading());
        saveSetting(key() + "_TITLE", content.title());
        save(content.message());
        saveSetting(key() + "_SIGNATURE", content.signature());
        return getContent();
    }

    private String read(String field, String fallback) {
        return settings.findById(key() + "_" + field)
                .map(TreasurySettingEntity::getValue).orElse(fallback);
    }

    private String saveSetting(String settingKey, String value) {
        var setting = settings.findById(settingKey).orElseGet(TreasurySettingEntity::new);
        setting.setKey(settingKey);
        setting.setValue(value.trim());
        return settings.save(setting).getValue();
    }

    public record Content(String heading, String title, String message, String signature) { }
}
