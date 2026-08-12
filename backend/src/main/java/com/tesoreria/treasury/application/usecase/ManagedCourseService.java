package com.tesoreria.treasury.application.usecase;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.treasury.core.exception.TreasuryErrorCode;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.TreasurySettingEntity;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository.TreasurySettingJpaRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class ManagedCourseService {
    private static final String KEY = "MANAGED_COURSE";
    private final TreasurySettingJpaRepository settings;
    private final String fallbackCourse;

    public ManagedCourseService(TreasurySettingJpaRepository settings,
                                @Value("${app.treasury.managed-course:1A}") String fallbackCourse) {
        this.settings = settings;
        this.fallbackCourse = normalize(fallbackCourse);
    }

    private static String normalize(String course) {
        return course.trim().toUpperCase(Locale.ROOT);
    }

    public String get() {
        return settings.findById(KEY).map(TreasurySettingEntity::getValue)
                .map(ManagedCourseService::normalize).orElse(fallbackCourse);
    }

    @Transactional
    public String save(String course) {
        if (course == null || course.isBlank() || course.trim().length() > 80) {
            throw new DomainException(TreasuryErrorCode.INVALID.getField(),
                    TreasuryErrorCode.INVALID.getStatus(), "El curso administrado es inválido");
        }
        TreasurySettingEntity setting = settings.findById(KEY).orElseGet(TreasurySettingEntity::new);
        setting.setKey(KEY);
        setting.setValue(normalize(course));
        return settings.save(setting).getValue();
    }
}
