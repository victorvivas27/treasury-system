package academic;

import com.tesoreria.TesoreriaAppApplication;
import com.tesoreria.organization.infrastructure.persistence.*;
import com.tesoreria.user.config.security.JwtService;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import java.time.LocalDateTime;
import java.util.UUID;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = TesoreriaAppApplication.class, properties = {
        "spring.config.import=", "spring.flyway.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:academic-http;DB_CLOSE_DELAY=-1",
        "app.web-push.enabled=false", "app.storage.gcs.enabled=false",
        "MERCADO_PAGO_ACCESS_TOKEN=", "MERCADO_PAGO_WEBHOOK_SECRET=",
        "MERCADO_PAGO_ORGANIZATION_ID=0", "MERCADO_PAGO_COLLECTOR_ID=",
        "MERCADO_PAGO_RETURN_URL=", "MERCADO_PAGO_WEBHOOK_URL="
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ScheduleHttpPersistenceTest {
    private static final String BASE = "/api/v1/academic/schedules";
    @Autowired MockMvc http;
    @Autowired OrganizationJpaRepository organizations;
    @Autowired OrganizationSchoolPeriodJpaRepository periods;
    @Autowired UserJpaRepository users;
    @Autowired JwtService jwt;
    @Autowired UserDetailsService details;
    private String admin;
    private String user;
    private String other;
    private Long organizationId;

    @BeforeEach void setup() {
        OrganizationEntity organization = organization();
        organizationId = organization.getId();
        period(organizationId, 2026); period(organizationId, 2025);
        admin = token(organizationId, RoleEnum.ADMIN);
        user = token(organizationId, RoleEnum.USER);
        OrganizationEntity otherOrganization = organization();
        period(otherOrganization.getId(), 2026);
        other = token(otherOrganization.getId(), RoleEnum.ADMIN);
    }

    @Test void authenticatesReadsAndDeniesAllGuardianWritesAndDraftReads() throws Exception {
        http.perform(get(BASE + "/periods")).andExpect(status().isUnauthorized());
        http.perform(get(BASE + "/periods").header("Authorization", user)).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].schoolYear").value(2026)).andExpect(jsonPath("$[1].editable").value(false));
        http.perform(get(BASE + "/2026/draft").header("Authorization", user)).andExpect(status().isForbidden());
        http.perform(put(BASE + "/2026").header("Authorization", user).contentType(MediaType.APPLICATION_JSON)
                .content(payload("Lenguaje"))).andExpect(status().isForbidden());
        http.perform(delete(BASE + "/2026").header("Authorization", user)).andExpect(status().isForbidden());
        http.perform(get(BASE + "/2026").header("Authorization", user)).andExpect(status().isOk())
                .andExpect(jsonPath("$.days").isEmpty());
    }

    @Test void persistsDraftPublicationAndExplicitDailyExitWithoutTenantLeaks() throws Exception {
        write(payload("Lenguaje"), false);
        http.perform(get(BASE + "/2026").header("Authorization", user)).andExpect(status().isOk())
                .andExpect(jsonPath("$.days").isEmpty());
        http.perform(get(BASE + "/2026/draft").header("Authorization", admin)).andExpect(status().isOk())
                .andExpect(jsonPath("$.days[0].blocks[0].name").value("Lenguaje"));
        write(payload("Lenguaje"), true);
        write(payload("Matemática"), false);
        http.perform(get(BASE + "/2026").header("Authorization", user)).andExpect(status().isOk())
                .andExpect(jsonPath("$.days[0].blocks[0].name").value("Lenguaje"))
                .andExpect(jsonPath("$.days[0].exitTime").value("16:00:00"))
                .andExpect(jsonPath("$.days[4].exitTime").value("14:30:00"));
        http.perform(get(BASE + "/2026").header("Authorization", other)).andExpect(status().isOk())
                .andExpect(jsonPath("$.days").isEmpty());
        http.perform(get(BASE + "/2026/draft").header("Authorization", other)).andExpect(status().isOk())
                .andExpect(jsonPath("$.days").isEmpty());
        http.perform(delete(BASE + "/2026").header("Authorization", other)).andExpect(status().isNoContent());
        http.perform(get(BASE + "/2026").header("Authorization", user)).andExpect(status().isOk())
                .andExpect(jsonPath("$.days.length()").value(5));
        http.perform(delete(BASE + "/2026").header("Authorization", admin)).andExpect(status().isNoContent());
        http.perform(get(BASE + "/2026").header("Authorization", user)).andExpect(status().isOk())
                .andExpect(jsonPath("$.days").isEmpty());
    }

    @Test void rejectsInvalidBodiesAndLeavesPublishedDataUntouched() throws Exception {
        write(payload("Lenguaje"), true);
        for (String invalid : new String[] {
                payload(""),
                payload("Lenguaje").replace("\"endTime\":\"12:45\"", "\"endTime\":\"17:00\""),
                "{\"days\":[{\"dayOfWeek\":1,\"entryTime\":\"12:00\",\"exitTime\":\"16:00\",\"blocks\":["
                    + "{\"dayOfWeek\":1,\"startTime\":\"12:00\",\"endTime\":\"13:00\",\"type\":\"BREAK\",\"order\":0},"
                    + "{\"dayOfWeek\":1,\"startTime\":\"12:30\",\"endTime\":\"13:30\",\"type\":\"BREAK\",\"order\":1}]}]}",
                "{\"days\":[{\"dayOfWeek\":1,\"entryTime\":\"bad\",\"exitTime\":\"16:00\",\"blocks\":[]}]}",
                "{\"days\":null}"
        }) {
            http.perform(put(BASE + "/2026").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                    .content(invalid)).andExpect(status().isBadRequest());
        }
        http.perform(put(BASE + "/2026").param("publish", "true").header("Authorization", admin)
                .contentType(MediaType.APPLICATION_JSON).content("{\"days\":[]}")).andExpect(status().isBadRequest());
        http.perform(get(BASE + "/2026").header("Authorization", user)).andExpect(status().isOk())
                .andExpect(jsonPath("$.days[0].blocks[0].name").value("Lenguaje"));
    }

    @Test void rolloverKeepsHistoryAndRejectsHistoricalMutationAndUnknownYears() throws Exception {
        write(payload("Lenguaje"), true);
        OrganizationEntity organization = organizations.findById(organizationId).orElseThrow();
        organization.setSchoolYear(2027); organizations.saveAndFlush(organization);
        period(organizationId, 2027);
        http.perform(put(BASE + "/2026").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                .content(payload("Cambio"))).andExpect(status().isConflict());
        http.perform(delete(BASE + "/2026").header("Authorization", admin)).andExpect(status().isConflict());
        http.perform(put(BASE + "/2027").param("publish", "true").header("Authorization", admin)
                .contentType(MediaType.APPLICATION_JSON).content(payload("Nuevo año"))).andExpect(status().isOk());
        http.perform(get(BASE + "/2026").header("Authorization", user)).andExpect(status().isOk())
                .andExpect(jsonPath("$.days[0].blocks[0].name").value("Lenguaje"));
        http.perform(get(BASE + "/2027").header("Authorization", user)).andExpect(status().isOk())
                .andExpect(jsonPath("$.days[0].blocks[0].name").value("Nuevo año"));
        http.perform(get(BASE + "/2030").header("Authorization", user)).andExpect(status().isNotFound());
    }

    private void write(String payload, boolean publish) throws Exception {
        http.perform(put(BASE + "/2026").param("publish", String.valueOf(publish)).header("Authorization", admin)
                .contentType(MediaType.APPLICATION_JSON).content(payload)).andExpect(status().isOk());
    }

    @Test void publishesAndReadsSnackWithoutManualName() throws Exception {
        String snack = payload("unused").replace("\"type\":\"SUBJECT\",\"name\":\"unused\"",
                "\"type\":\"SNACK\",\"name\":null");
        write(snack, true);
        http.perform(get(BASE + "/2026").header("Authorization", user)).andExpect(status().isOk())
                .andExpect(jsonPath("$.days[0].blocks[0].type").value("SNACK"))
                .andExpect(jsonPath("$.days[0].blocks[0].name").doesNotExist());
    }

    @Test void savesAndPublishesTwoHourMathBlocks() throws Exception {
        String math = payload("Matemática").replace("\"endTime\":\"12:45\"", "\"endTime\":\"14:00\"");
        write(math, false);
        write(math, true);
        http.perform(get(BASE + "/2026").header("Authorization", user)).andExpect(status().isOk())
                .andExpect(jsonPath("$.days[0].blocks[0].name").value("Matemática"))
                .andExpect(jsonPath("$.days[0].blocks[0].startTime").value("12:00:00"))
                .andExpect(jsonPath("$.days[0].blocks[0].endTime").value("14:00:00"));
    }

    private String payload(String subject) {
        StringBuilder json = new StringBuilder("{\"days\":[");
        for (int day = 1; day <= 5; day++) {
            if (day > 1) json.append(',');
            json.append("{\"dayOfWeek\":").append(day)
                    .append(",\"entryTime\":\"12:00\",\"exitTime\":\"").append(day == 5 ? "14:30" : "16:00")
                    .append("\",\"blocks\":[{\"dayOfWeek\":").append(day)
                    .append(",\"startTime\":\"12:00\",\"endTime\":\"12:45\",\"type\":\"SUBJECT\",\"name\":\"")
                    .append(subject).append("\",\"order\":0,\"color\":\"#aabbcc\"}]}");
        }
        return json.append("]}").toString();
    }

    private OrganizationEntity organization() {
        OrganizationEntity value = new OrganizationEntity();
        value.setName("Curso de prueba"); value.setSlug("academic-" + UUID.randomUUID());
        value.setSchoolYear(2026); value.setCourseName("1 Básico A");
        return organizations.saveAndFlush(value);
    }
    private void period(Long organization, int year) {
        OrganizationSchoolPeriodEntity value = new OrganizationSchoolPeriodEntity();
        value.setOrganizationId(organization); value.setSchoolYear(year); value.setCourseName("Curso " + year);
        periods.saveAndFlush(value);
    }
    private String token(Long organization, RoleEnum role) {
        String id = UUID.randomUUID().toString();
        UserEntity value = new UserEntity();
        value.setCode("AC-" + id.substring(0, 12)); value.setNombre("Prueba");
        value.setCorreo(id + "@test.local"); value.setPassword("Test123!"); value.setRol(role);
        value.setOrganizationId(organization); value.setEmailVerifiedAt(LocalDateTime.now());
        users.saveAndFlush(value);
        return "Bearer " + jwt.generateToken(details.loadUserByUsername(value.getCorreo()));
    }
}
