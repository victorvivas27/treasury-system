package treasury;

import com.tesoreria.organization.application.CurrentOrganizationService;
import com.tesoreria.organization.application.OrganizationSchoolPeriodService;
import com.tesoreria.organization.core.model.OrganizationType;
import com.tesoreria.organization.infrastructure.persistence.OrganizationEntity;
import com.tesoreria.organization.infrastructure.persistence.OrganizationJpaRepository;
import com.tesoreria.treasury.application.usecase.ManagedCourseService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ManagedCourseServiceTest {
    @Mock
    private OrganizationJpaRepository organizations;
    @Mock
    private CurrentOrganizationService currentOrganization;
    @Mock
    private OrganizationSchoolPeriodService schoolPeriods;
    private ManagedCourseService service;
    private OrganizationEntity organization;

    @BeforeEach
    void setUp() {
        service = new ManagedCourseService(
                organizations, currentOrganization, schoolPeriods, "1A");
        organization = new OrganizationEntity();
        organization.setId(8L);
        organization.setName("Kinder A");
        organization.setCourseName("Kinder A");
        organization.setSchoolYear(2026);
        organization.setType(OrganizationType.COURSE);
        when(currentOrganization.getId()).thenReturn(8L);
    }

    @Test
    void settingsShouldReturnCourseAndAssignedSchoolYear() {
        when(organizations.findById(8L)).thenReturn(Optional.of(organization));

        ManagedCourseService.ManagedCourseSettings settings = service.getSettings();

        assertEquals("KINDER A", settings.course());
        assertEquals(2026, settings.schoolYear());
    }

    @Test
    void adminShouldAdvanceCourseAndSchoolYear() {
        when(organizations.findById(8L)).thenReturn(Optional.of(organization));
        when(organizations.save(organization)).thenReturn(organization);

        ManagedCourseService.ManagedCourseSettings settings =
                service.save("Prekinder A", 2027);

        assertEquals("PREKINDER A", organization.getName());
        assertEquals("PREKINDER A", organization.getCourseName());
        assertEquals(2027, organization.getSchoolYear());
        assertEquals("PREKINDER A", settings.course());
        assertEquals(2027, settings.schoolYear());
        verify(organizations).save(organization);
        verify(schoolPeriods).record(organization);
    }

    @Test
    void adminShouldNotReturnToAHistoricalSchoolYear() {
        organization.setSchoolYear(2027);
        when(organizations.findById(8L)).thenReturn(Optional.of(organization));

        org.junit.jupiter.api.Assertions.assertThrows(
                com.tesoreria.shared.domain.exception.DomainException.class,
                () -> service.save("1° A Básico", 2026));
    }
}
