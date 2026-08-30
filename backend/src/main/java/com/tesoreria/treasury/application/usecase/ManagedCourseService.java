package com.tesoreria.treasury.application.usecase;

import com.tesoreria.organization.application.CurrentOrganizationService;
import com.tesoreria.organization.application.OrganizationSchoolPeriodService;
import com.tesoreria.organization.core.model.OrganizationType;
import com.tesoreria.organization.infrastructure.persistence.OrganizationJpaRepository;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.treasury.core.exception.TreasuryErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Locale;
import java.util.List;

@Service
public class ManagedCourseService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("America/Santiago");
    private final OrganizationJpaRepository organizations;
    private final CurrentOrganizationService currentOrganization;
    private final OrganizationSchoolPeriodService schoolPeriods;
    private final String fallbackCourse;

    public ManagedCourseService(OrganizationJpaRepository organizations,
                                CurrentOrganizationService currentOrganization,
                                OrganizationSchoolPeriodService schoolPeriods,
                                @Value("${app.treasury.managed-course:1A}") String fallbackCourse) {
        this.organizations = organizations;
        this.currentOrganization = currentOrganization;
        this.schoolPeriods = schoolPeriods;
        this.fallbackCourse = normalize(fallbackCourse);
    }

    private static String normalize(String course) {
        return course.trim().toUpperCase(Locale.ROOT);
    }

    public String get() {
        return getSettings().course();
    }

    public ManagedCourseSettings getSettings() {
        return organizations.findById(currentOrganization.getId())
                .map(value -> new ManagedCourseSettings(
                        value.getCourseName() == null ? fallbackCourse : normalize(value.getCourseName()),
                        value.getSchoolYear() == null ? currentYear() : value.getSchoolYear(),
                        schoolPeriods.history(value.getId())))
                .orElseGet(() -> new ManagedCourseSettings(
                        fallbackCourse, currentYear(), List.of()));
    }

    @Transactional
    public ManagedCourseSettings save(String course, Integer schoolYear) {
        if (course == null || course.isBlank() || course.trim().length() > 80) {
            throw new DomainException(TreasuryErrorCode.INVALID.getField(),
                    TreasuryErrorCode.INVALID.getStatus(), "El curso administrado es inválido");
        }
        if (schoolYear == null || schoolYear < 2000 || schoolYear > 2100) {
            throw new DomainException(TreasuryErrorCode.INVALID.getField(),
                    TreasuryErrorCode.INVALID.getStatus(),
                    "El año escolar debe estar entre 2000 y 2100");
        }
        var organization = organizations.findById(currentOrganization.getId()).orElseThrow(() ->
                new DomainException("organization", org.springframework.http.HttpStatus.NOT_FOUND,
                        "Organización no encontrada"));
        if (organization.getSchoolYear() != null
                && schoolYear < organization.getSchoolYear()) {
            throw new DomainException(TreasuryErrorCode.INVALID.getField(),
                    org.springframework.http.HttpStatus.CONFLICT,
                    "No se puede retroceder a un período histórico");
        }
        organization.setCourseName(normalize(course));
        organization.setSchoolYear(schoolYear);
        if (organization.getType() == OrganizationType.COURSE) {
            organization.setName(normalize(course));
        }
        var saved = organizations.save(organization);
        schoolPeriods.record(saved);
        return new ManagedCourseSettings(saved.getCourseName(), saved.getSchoolYear(),
                schoolPeriods.history(saved.getId()));
    }

    private int currentYear() {
        return LocalDate.now(BUSINESS_ZONE).getYear();
    }

    public record ManagedCourseSettings(
            String course,
            Integer schoolYear,
            List<OrganizationSchoolPeriodService.SchoolPeriod> history) { }
}
