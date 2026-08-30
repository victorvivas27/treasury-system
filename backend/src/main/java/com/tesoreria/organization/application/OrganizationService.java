package com.tesoreria.organization.application;

import com.tesoreria.organization.core.model.OrganizationType;
import com.tesoreria.organization.infrastructure.persistence.OrganizationEntity;
import com.tesoreria.organization.infrastructure.persistence.OrganizationJpaRepository;
import com.tesoreria.shared.domain.exception.DomainException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;

@Service
public class OrganizationService {
    private static final String ORGANIZATION_FIELD = "organization";
    private static final String DELETE_CONFIRMATION = "ELIMINAR";
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("America/Santiago");
    private final OrganizationJpaRepository organizations;
    private final OrganizationResourceCleaner resourceCleaner;
    private final OrganizationSchoolPeriodService schoolPeriods;

    public OrganizationService(OrganizationJpaRepository organizations,
                               OrganizationResourceCleaner resourceCleaner,
                               OrganizationSchoolPeriodService schoolPeriods) {
        this.organizations = organizations;
        this.resourceCleaner = resourceCleaner;
        this.schoolPeriods = schoolPeriods;
    }

    @Transactional(readOnly = true)
    public List<OrganizationEntity> findAll() {
        return organizations.findAll();
    }

    @Transactional(readOnly = true)
    public OrganizationEntity requireActive(Long id) {
        OrganizationEntity organization = organizations.findById(id).orElseThrow(() ->
                new DomainException(ORGANIZATION_FIELD, HttpStatus.NOT_FOUND,
                        "Organización no encontrada"));
        if (!organization.isActive()) {
            throw new DomainException(ORGANIZATION_FIELD, HttpStatus.CONFLICT,
                    "La organización está desactivada");
        }
        return organization;
    }

    @Transactional(readOnly = true)
    public OrganizationEntity require(Long id) {
        return organizations.findById(id).orElseThrow(() ->
                new DomainException(ORGANIZATION_FIELD, HttpStatus.NOT_FOUND,
                        "Organización no encontrada"));
    }

    @Transactional
    public OrganizationEntity create(String name, String slug, OrganizationType type,
                                     String senderName, String replyToEmail) {
        String normalizedSlug = slug.trim().toLowerCase(Locale.ROOT);
        if (organizations.existsBySlug(normalizedSlug)) {
            throw new DomainException("slug", HttpStatus.CONFLICT, "La organización ya existe");
        }
        OrganizationEntity organization = new OrganizationEntity();
        organization.setName(name.trim());
        organization.setCourseName(name.trim());
        organization.setSchoolYear(LocalDate.now(BUSINESS_ZONE).getYear());
        organization.setSlug(normalizedSlug);
        organization.setType(type);
        organization.setSenderName(senderName == null || senderName.isBlank()
                ? name.trim() : senderName.trim());
        organization.setReplyToEmail(normalizeOptionalEmail(replyToEmail));
        organization.setActive(true);
        OrganizationEntity saved = organizations.save(organization);
        schoolPeriods.record(saved);
        return saved;
    }

    @Transactional
    public OrganizationEntity updateEmailBranding(Long id, String senderName, String replyToEmail) {
        OrganizationEntity organization = require(id);
        organization.setSenderName(senderName == null || senderName.isBlank()
                ? organization.getName() : senderName.trim());
        organization.setReplyToEmail(normalizeOptionalEmail(replyToEmail));
        return organizations.save(organization);
    }

    private String normalizeOptionalEmail(String value) {
        return value == null || value.isBlank()
                ? null : value.trim().toLowerCase(Locale.ROOT);
    }

    @Transactional
    public OrganizationEntity setActive(Long id, boolean active) {
        OrganizationEntity organization = organizations.findById(id).orElseThrow(() ->
                new DomainException(ORGANIZATION_FIELD, HttpStatus.NOT_FOUND,
                        "Organización no encontrada"));
        if (DefaultOrganizationProvider.DEFAULT_SLUG.equals(organization.getSlug()) && !active) {
            throw new DomainException(ORGANIZATION_FIELD, HttpStatus.CONFLICT,
                    "La organización predeterminada no se puede desactivar");
        }
        organization.setActive(active);
        return organizations.save(organization);
    }

    @Transactional
    public OrganizationEntity updateCourse(Long id, String name, Integer schoolYear) {
        OrganizationEntity organization = require(id);
        if (organization.getType() != OrganizationType.COURSE) {
            throw new DomainException(ORGANIZATION_FIELD, HttpStatus.CONFLICT,
                    "Solo se puede modificar el curso de una administración de curso");
        }
        if (name == null || name.isBlank() || name.trim().length() > 80) {
            throw new DomainException("name", HttpStatus.BAD_REQUEST,
                    "El nombre del curso es inválido");
        }
        if (schoolYear == null || schoolYear < 2000 || schoolYear > 2100) {
            throw new DomainException("schoolYear", HttpStatus.BAD_REQUEST,
                    "El año escolar debe estar entre 2000 y 2100");
        }
        if (organization.getSchoolYear() != null
                && schoolYear < organization.getSchoolYear()) {
            throw new DomainException("schoolYear", HttpStatus.CONFLICT,
                    "No se puede retroceder a un período histórico");
        }
        String normalizedName = name.trim();
        organization.setName(normalizedName);
        organization.setCourseName(normalizedName);
        organization.setSchoolYear(schoolYear);
        OrganizationEntity saved = organizations.save(organization);
        schoolPeriods.record(saved);
        return saved;
    }

    @Transactional
    public void delete(Long id, String organizationName, String confirmation) {
        OrganizationEntity organization = require(id);
        if (organization.getType() != OrganizationType.COURSE
                || DefaultOrganizationProvider.DEFAULT_SLUG.equals(organization.getSlug())) {
            throw new DomainException(ORGANIZATION_FIELD, HttpStatus.CONFLICT,
                    "Esta organización del sistema no se puede eliminar");
        }
        if (organizationName == null
                || !organization.getName().equals(organizationName.trim())) {
            throw new DomainException("organizationName", HttpStatus.BAD_REQUEST,
                    "El nombre de la administración no coincide");
        }
        if (confirmation == null || !DELETE_CONFIRMATION.equals(confirmation.trim())) {
            throw new DomainException("confirmation", HttpStatus.BAD_REQUEST,
                    "Debes escribir ELIMINAR para confirmar");
        }
        List<String> storedObjects = resourceCleaner.findStoredObjects(id);
        organizations.delete(organization);
        organizations.flush();
        resourceCleaner.deleteAfterCommit(storedObjects);
    }
}
