package com.tesoreria.organization;

import com.tesoreria.organization.application.OrganizationSchoolPeriodService;
import com.tesoreria.organization.infrastructure.persistence.OrganizationEntity;
import com.tesoreria.organization.infrastructure.persistence.OrganizationSchoolPeriodEntity;
import com.tesoreria.organization.infrastructure.persistence.OrganizationSchoolPeriodJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrganizationSchoolPeriodServiceTest {
    @Mock
    private OrganizationSchoolPeriodJpaRepository periods;
    private OrganizationSchoolPeriodService service;

    @BeforeEach
    void setUp() {
        service = new OrganizationSchoolPeriodService(periods);
    }

    @Test
    void recordShouldCreateTheCurrentPeriodWithoutChangingOlderYears() {
        OrganizationEntity organization = organization(8L, "2° A Básico", 2027);
        when(periods.findByOrganizationIdAndSchoolYear(8L, 2027))
                .thenReturn(Optional.empty());

        service.record(organization);

        ArgumentCaptor<OrganizationSchoolPeriodEntity> captor =
                ArgumentCaptor.forClass(OrganizationSchoolPeriodEntity.class);
        verify(periods).save(captor.capture());
        assertEquals(8L, captor.getValue().getOrganizationId());
        assertEquals(2027, captor.getValue().getSchoolYear());
        assertEquals("2° A Básico", captor.getValue().getCourseName());
    }

    @Test
    void historyShouldExposeNewestPeriodFirst() {
        OrganizationSchoolPeriodEntity current = period(8L, "2° A Básico", 2027);
        OrganizationSchoolPeriodEntity previous = period(8L, "1° A Básico", 2026);
        when(periods.findByOrganizationIdOrderBySchoolYearDesc(8L))
                .thenReturn(List.of(current, previous));

        var history = service.history(8L);

        assertEquals(2, history.size());
        assertEquals(2027, history.get(0).schoolYear());
        assertEquals("1° A Básico", history.get(1).course());
    }

    private OrganizationEntity organization(Long id, String course, Integer year) {
        OrganizationEntity value = new OrganizationEntity();
        value.setId(id);
        value.setCourseName(course);
        value.setSchoolYear(year);
        return value;
    }

    private OrganizationSchoolPeriodEntity period(Long organizationId, String course, Integer year) {
        OrganizationSchoolPeriodEntity value = new OrganizationSchoolPeriodEntity();
        value.setOrganizationId(organizationId);
        value.setCourseName(course);
        value.setSchoolYear(year);
        return value;
    }
}
