package user;

import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.entity.ApoderadoEntity;
import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.repository.ApoderadoJpaRepository;
import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.organization.core.model.OrganizationType;
import com.tesoreria.organization.infrastructure.persistence.OrganizationEntity;
import com.tesoreria.organization.infrastructure.persistence.OrganizationJpaRepository;
import com.tesoreria.user.core.constant.RoleEnum;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = com.tesoreria.TesoreriaAppApplication.class)
@ActiveProfiles("test")
@AutoConfigureMockMvc
class CourseMembershipIntegrationTest {
    @Autowired private OrganizationJpaRepository organizations;
    @Autowired private ApoderadoJpaRepository guardians;
    @Autowired private MockMvc mvc;

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void publicQueryRequiresActiveGuardianInExactCourseWithoutTenantContext() throws Exception {
        Long courseA = course();
        Long courseB = course();
        TenantUserDetails principal = new TenantUserDetails(1L, courseA, "admin@example.com",
                "secret", RoleEnum.ADMIN, true, true);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        ApoderadoEntity active = new ApoderadoEntity(null, "AP-SA02ACT", "Active",
                "Member@Example.com", "12345678", null);
        ApoderadoEntity inactive = new ApoderadoEntity(null, "AP-SA02OFF", "Inactive",
                "inactive@example.com", "12345678", null);
        inactive.setActivo(false);
        active = guardians.save(active);
        inactive = guardians.save(inactive);
        SecurityContextHolder.clearContext();

        try {
            assertTrue(guardians.existsActiveMember("member@example.com", courseA));
            assertFalse(guardians.existsActiveMember("member@example.com", courseB));
            assertFalse(guardians.existsActiveMember("inactive@example.com", courseA));
            assertFalse(guardians.existsActiveMember("outsider@example.com", courseA));
            rejectRegistration("member@example.com", courseB);
            rejectRegistration("inactive@example.com", courseA);
            rejectRegistration("outsider@example.com", courseA);
        } finally {
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
            guardians.delete(active);
            guardians.delete(inactive);
            organizations.deleteById(courseA);
            organizations.deleteById(courseB);
        }
    }

    private void rejectRegistration(String email, Long course) throws Exception {
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Ana Externa","correo":"%s","password":"Password1!",
                         "organizationId":%d}
                        """.formatted(email, course)))
                .andExpect(status().isUnauthorized());
    }

    private Long course() {
        OrganizationEntity value = new OrganizationEntity();
        value.setName("SA02 fixture");
        value.setSlug("sa02-" + UUID.randomUUID());
        value.setType(OrganizationType.COURSE);
        value.setActive(true);
        value.setSchoolYear(2026);
        return organizations.save(value).getId();
    }
}
