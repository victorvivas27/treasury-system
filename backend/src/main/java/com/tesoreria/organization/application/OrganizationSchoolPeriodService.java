package com.tesoreria.organization.application;

import com.tesoreria.organization.infrastructure.persistence.OrganizationEntity;
import com.tesoreria.organization.infrastructure.persistence.OrganizationSchoolPeriodEntity;
import com.tesoreria.organization.infrastructure.persistence.OrganizationSchoolPeriodJpaRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class OrganizationSchoolPeriodService {
    private final OrganizationSchoolPeriodJpaRepository periods;

    public OrganizationSchoolPeriodService(OrganizationSchoolPeriodJpaRepository periods) {
        this.periods = periods;
    }

    public void record(OrganizationEntity organization) {
        OrganizationSchoolPeriodEntity period = periods
                .findByOrganizationIdAndSchoolYear(
                        organization.getId(), organization.getSchoolYear())
                .orElseGet(OrganizationSchoolPeriodEntity::new);
        period.setOrganizationId(organization.getId());
        period.setSchoolYear(organization.getSchoolYear());
        period.setCourseName(organization.getCourseName());
        periods.save(period);
    }

    public List<SchoolPeriod> history(Long organizationId) {
        return periods.findByOrganizationIdOrderBySchoolYearDesc(organizationId).stream()
                .map(value -> new SchoolPeriod(value.getCourseName(), value.getSchoolYear()))
                .toList();
    }

    public record SchoolPeriod(String course, Integer schoolYear) { }
}
