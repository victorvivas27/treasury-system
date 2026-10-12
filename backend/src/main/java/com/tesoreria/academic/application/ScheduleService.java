package com.tesoreria.academic.application;

import com.tesoreria.academic.core.Schedule;
import com.tesoreria.academic.infrastructure.persistence.ScheduleEntity;
import com.tesoreria.academic.infrastructure.persistence.ScheduleRepository;
import com.tesoreria.organization.application.CurrentOrganizationService;
import com.tesoreria.organization.infrastructure.persistence.OrganizationJpaRepository;
import com.tesoreria.organization.infrastructure.persistence.OrganizationSchoolPeriodEntity;
import com.tesoreria.organization.infrastructure.persistence.OrganizationSchoolPeriodJpaRepository;
import com.tesoreria.shared.domain.exception.DomainException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import java.util.List;

@Service
@Transactional
public class ScheduleService {
    private final ScheduleRepository schedules;
    private final OrganizationSchoolPeriodJpaRepository schoolPeriods;
    private final OrganizationJpaRepository organizations;
    private final CurrentOrganizationService tenant;
    private final ObjectMapper mapper;

    public ScheduleService(ScheduleRepository schedules, OrganizationSchoolPeriodJpaRepository periods,
                           OrganizationJpaRepository organizations, CurrentOrganizationService tenant,
                           ObjectMapper mapper) {
        this.schedules = schedules;
        this.schoolPeriods = periods;
        this.organizations = organizations;
        this.tenant = tenant;
        this.mapper = mapper;
    }

    public record Period(int schoolYear, String course, boolean editable) { }

    @Transactional(readOnly = true)
    public List<Period> periods() {
        Integer activeYear = organizations.findById(tenant.getId()).orElseThrow().getSchoolYear();
        return schoolPeriods.findByOrganizationIdOrderBySchoolYearDesc(tenant.getId()).stream()
                .map(period -> new Period(period.getSchoolYear(), period.getCourseName(),
                        period.getSchoolYear().equals(activeYear))).toList();
    }

    @Transactional(readOnly = true)
    public Schedule read(int year, boolean draft) {
        return schedules.findByOrganizationIdAndPeriodId(tenant.getId(), period(year).getId())
                .map(entity -> draft ? entity.getDraft() : entity.getPublished())
                .map(json -> mapper.readValue(json, Schedule.class))
                .orElse(new Schedule(List.of()));
    }

    public Schedule save(int year, Schedule schedule, boolean publish) {
        OrganizationSchoolPeriodEntity period = editablePeriod(year);
        schedule.validate();
        if (publish && schedule.days().size() != 5) {
            throw new DomainException("schedule", HttpStatus.BAD_REQUEST,
                    "Configure las cinco jornadas antes de publicar.");
        }
        ScheduleEntity entity = schedules.findByOrganizationIdAndPeriodId(tenant.getId(), period.getId())
                .orElseGet(ScheduleEntity::new);
        entity.setPeriodId(period.getId());
        String json = mapper.writeValueAsString(schedule);
        entity.setDraft(json);
        if (publish) entity.setPublished(json);
        schedules.save(entity);
        return schedule;
    }

    public void delete(int year) {
        OrganizationSchoolPeriodEntity period = editablePeriod(year);
        schedules.findByOrganizationIdAndPeriodId(tenant.getId(), period.getId()).ifPresent(schedules::delete);
    }

    private OrganizationSchoolPeriodEntity editablePeriod(int year) {
        OrganizationSchoolPeriodEntity period = period(year);
        if (!organizations.findById(tenant.getId()).orElseThrow().getSchoolYear().equals(year)) {
            throw new DomainException("schoolYear", HttpStatus.CONFLICT, "Los años históricos son de solo lectura.");
        }
        return period;
    }

    private OrganizationSchoolPeriodEntity period(int year) {
        return schoolPeriods.findByOrganizationIdAndSchoolYear(tenant.getId(), year)
                .orElseThrow(() -> new DomainException("schoolYear", HttpStatus.NOT_FOUND,
                        "El año escolar no pertenece a esta administración."));
    }
}
