package com.tesoreria.treasury.application.usecase;

import com.tesoreria.organization.application.CurrentOrganizationService;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.TreasurySettingEntity;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository.TreasurySettingJpaRepository;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
public class LoaderSettingsService {
    private final TreasurySettingJpaRepository settings;
    private final CurrentOrganizationService organization;
    private final ObjectMapper mapper;

    public LoaderSettingsService(TreasurySettingJpaRepository settings,
                                 CurrentOrganizationService organization, ObjectMapper mapper) {
        this.settings = settings;
        this.organization = organization;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public Configuration get() {
        return new Configuration(read("STARTUP", new Preference("video", 10000, 1400, false)),
                read("PAGE", new Preference("cinematic", 0, 800, false)));
    }

    @Transactional
    public Preference save(boolean startup, Preference preference) {
        String key = key(startup ? "STARTUP" : "PAGE");
        var setting = settings.findById(key).orElseGet(TreasurySettingEntity::new);
        setting.setKey(key);
        setting.setValue(mapper.writeValueAsString(preference));
        settings.save(setting);
        return preference;
    }

    private Preference read(String section, Preference fallback) {
        return settings.findById(key(section))
                .map(value -> mapper.readValue(value.getValue(), Preference.class)).orElse(fallback);
    }

    private String key(String section) {
        return "LOADER_" + section + "_" + organization.getId();
    }

    public record Configuration(Preference startup, Preference pageTransition) { }

    public record Preference(
            @NotNull @Pattern(regexp = "video|cinematic|video-light|nneo-rising-fill") String variant,
            @NotNull @Min(0) @Max(20000) Integer durationMs,
            @NotNull @Min(400) @Max(3000) Integer exitMs,
            boolean soundEnabled) { }
}
