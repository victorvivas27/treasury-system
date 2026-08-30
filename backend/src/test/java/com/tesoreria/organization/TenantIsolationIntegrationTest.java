package com.tesoreria.organization;

import com.tesoreria.alumno.infrastructure.adapter.out.persistence.entity.AlumnoEntity;
import com.tesoreria.alumno.infrastructure.adapter.out.persistence.repository.AlumnoJpaRepository;
import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.organization.core.model.OrganizationType;
import com.tesoreria.organization.infrastructure.persistence.OrganizationEntity;
import com.tesoreria.organization.infrastructure.persistence.OrganizationJpaRepository;
import com.tesoreria.user.core.constant.RoleEnum;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class TenantIsolationIntegrationTest {
    @Autowired OrganizationJpaRepository organizations;
    @Autowired AlumnoJpaRepository students;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void repositoriesShouldIsolateReadUpdateAndDeleteByOrganization() {
        Long organizationA = organization("tenant-a").getId();
        Long organizationB = organization("tenant-b").getId();

        authenticate(organizationA, "admin-a@mail.com");
        AlumnoEntity studentA = students.save(new AlumnoEntity(null, "AL-TENANTA", "Alumno A", "1A"));

        authenticate(organizationB, "admin-b@mail.com");
        assertTrue(students.findById(studentA.getAlumnoId()).isEmpty());
        assertTrue(students.findByCodigo(studentA.getCodigo()).isEmpty());
        assertFalse(students.existsById(studentA.getAlumnoId()));
        students.deleteById(studentA.getAlumnoId());

        AlumnoEntity studentB = students.save(new AlumnoEntity(null, "AL-TENANTB", "Alumno B", "1B"));
        authenticate(organizationA, "admin-a@mail.com");
        assertTrue(students.existsById(studentA.getAlumnoId()));
        assertTrue(students.findById(studentB.getAlumnoId()).isEmpty());
        assertEquals(studentA.getAlumnoId(), students.findByCodigo("AL-TENANTA").orElseThrow().getAlumnoId());
    }

    private OrganizationEntity organization(String slug) {
        return organizations.findBySlug(slug).orElseGet(() -> {
            OrganizationEntity value = new OrganizationEntity();
            value.setName(slug);
            value.setSlug(slug);
            value.setType(OrganizationType.COURSE);
            value.setActive(true);
            value.setCourseName(slug);
            value.setSchoolYear(LocalDate.now().getYear());
            return organizations.save(value);
        });
    }

    private void authenticate(Long organizationId, String email) {
        TenantUserDetails principal = new TenantUserDetails(1L, organizationId, email, "secret",
                RoleEnum.ADMIN, true, true);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }
}
