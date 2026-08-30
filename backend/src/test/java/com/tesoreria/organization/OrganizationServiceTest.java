package com.tesoreria.organization;

import com.tesoreria.organization.application.OrganizationResourceCleaner;
import com.tesoreria.organization.application.OrganizationSchoolPeriodService;
import com.tesoreria.organization.application.OrganizationService;
import com.tesoreria.organization.core.model.OrganizationType;
import com.tesoreria.organization.infrastructure.persistence.OrganizationEntity;
import com.tesoreria.organization.infrastructure.persistence.OrganizationJpaRepository;
import com.tesoreria.shared.domain.exception.DomainException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.time.LocalDate;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrganizationServiceTest {
    @Mock
    private OrganizationJpaRepository organizations;
    @Mock
    private OrganizationResourceCleaner resourceCleaner;
    @Mock
    private OrganizationSchoolPeriodService schoolPeriods;
    private OrganizationService service;

    @BeforeEach
    void setUp() {
        service = new OrganizationService(organizations, resourceCleaner, schoolPeriods);
    }

    @Test
    void deleteShouldRequireTheExactOrganizationName() {
        OrganizationEntity organization = course(7L, "4°A", "4a");
        when(organizations.findById(7L)).thenReturn(Optional.of(organization));

        assertThrows(DomainException.class,
                () -> service.delete(7L, "4A", "ELIMINAR"));

        verify(organizations, never()).delete(organization);
        verifyNoInteractions(resourceCleaner);
    }

    @Test
    void createShouldAssignCurrentYearAndCourseNameAutomatically() {
        when(organizations.save(org.mockito.ArgumentMatchers.any())).thenAnswer(call -> call.getArgument(0));

        OrganizationEntity created = service.create(
                "Kinder A", "kinder-a", OrganizationType.COURSE, null, null);

        assertEquals("Kinder A", created.getCourseName());
        assertEquals(LocalDate.now(ZoneId.of("America/Santiago")).getYear(),
                created.getSchoolYear());
    }

    @Test
    void updateCourseShouldAllowSuperAdminFlowToChangeNameAndYear() {
        OrganizationEntity organization = course(7L, "Kinder A", "kinder-a");
        organization.setSchoolYear(2026);
        when(organizations.findById(7L)).thenReturn(Optional.of(organization));
        when(organizations.save(organization)).thenReturn(organization);

        OrganizationEntity updated = service.updateCourse(7L, "Prekinder A", 2027);

        assertEquals("Prekinder A", updated.getName());
        assertEquals("Prekinder A", updated.getCourseName());
        assertEquals(2027, updated.getSchoolYear());
        verify(schoolPeriods).record(organization);
    }

    @Test
    void updateCourseShouldNotOverwriteAnEarlierHistoricalPeriod() {
        OrganizationEntity organization = course(7L, "2° A Básico", "segundo-a");
        organization.setSchoolYear(2027);
        when(organizations.findById(7L)).thenReturn(Optional.of(organization));

        assertThrows(DomainException.class,
                () -> service.updateCourse(7L, "1° A Básico", 2026));

        verify(organizations, never()).save(organization);
        verifyNoInteractions(schoolPeriods);
    }

    @Test
    void deleteShouldRequireTheFinalConfirmation() {
        OrganizationEntity organization = course(7L, "4°A", "4a");
        when(organizations.findById(7L)).thenReturn(Optional.of(organization));

        assertThrows(DomainException.class,
                () -> service.delete(7L, "4°A", "BORRAR"));

        verify(organizations, never()).delete(organization);
        verifyNoInteractions(resourceCleaner);
    }

    @Test
    void deleteShouldProtectSystemOrganizations() {
        OrganizationEntity organization = course(1L, "Principal", "default");
        when(organizations.findById(1L)).thenReturn(Optional.of(organization));

        assertThrows(DomainException.class,
                () -> service.delete(1L, "Principal", "ELIMINAR"));

        verify(organizations, never()).delete(organization);
        verifyNoInteractions(resourceCleaner);
    }

    @Test
    void deleteShouldRemoveDataAndScheduleStoredObjectCleanup() {
        OrganizationEntity organization = course(7L, "4°A", "4a");
        List<String> objects = List.of("photo.jpg", "receipt.pdf");
        when(organizations.findById(7L)).thenReturn(Optional.of(organization));
        when(resourceCleaner.findStoredObjects(7L)).thenReturn(objects);

        service.delete(7L, "4°A", "ELIMINAR");

        InOrder order = inOrder(resourceCleaner, organizations);
        order.verify(resourceCleaner).findStoredObjects(7L);
        order.verify(organizations).delete(organization);
        order.verify(organizations).flush();
        order.verify(resourceCleaner).deleteAfterCommit(objects);
    }

    private OrganizationEntity course(Long id, String name, String slug) {
        OrganizationEntity organization = new OrganizationEntity();
        organization.setId(id);
        organization.setName(name);
        organization.setSlug(slug);
        organization.setType(OrganizationType.COURSE);
        organization.setCourseName(name);
        organization.setSchoolYear(2026);
        return organization;
    }
}
