package user;

import com.tesoreria.TesoreriaAppApplication;
import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.organization.infrastructure.persistence.OrganizationEntity;
import com.tesoreria.organization.infrastructure.persistence.OrganizationJpaRepository;
import com.tesoreria.user.config.security.JwtService;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserJpaRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Audit evidence: assertions describe observed defects, not a desired security contract. */
@org.junit.jupiter.api.Tag("integration")
@SpringBootTest(classes=TesoreriaAppApplication.class, properties={
  "spring.datasource.url=jdbc:h2:mem:security-audit-20261026;DB_CLOSE_DELAY=-1",
  "app.storage.gcs.enabled=false", "app.email.from=", "MERCADO_PAGO_ACCESS_TOKEN=",
  "MERCADO_PAGO_WEBHOOK_SECRET=", "MERCADO_PAGO_ORGANIZATION_ID=0",
  "MERCADO_PAGO_COLLECTOR_ID=", "MERCADO_PAGO_RETURN_URL=", "MERCADO_PAGO_WEBHOOK_URL="
})
@AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class SecurityAuditEvidenceTest {
  @Autowired MockMvc mvc;
  @Autowired UserJpaRepository users;
  @Autowired OrganizationJpaRepository organizations;
  @Autowired JwtService jwt;
  @Autowired PasswordEncoder encoder;

  @Test void ordinaryAdminCanDeleteGlobalSuperAdmin_OBSERVED_DEFECT() throws Exception {
    UserEntity admin=account(RoleEnum.ADMIN, organization(), null);
    UserEntity global=account(RoleEnum.SUPER_ADMIN, null, null);
    mvc.perform(delete("/api/v1/users/"+global.getId()).header("Authorization","Bearer "+token(admin)))
        .andExpect(status().isNoContent());
    users.flush();
    assertFalse(users.existsById(global.getId()));
  }

  @Test void totpEnabledAccountGetsFullSessionWithOnlyPassword_OBSERVED_DEFECT() throws Exception {
    UserEntity admin=account(RoleEnum.ADMIN, organization(), null);
    admin.setTotpEnabled(true); admin.setTotpSecret("JBSWY3DPEHPK3PXP"); users.saveAndFlush(admin);
    mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
        .content("{\"correo\":\""+admin.getCorreo()+"\",\"password\":\"AuditDemo1!\"}"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.token").isNotEmpty())
        .andExpect(header().exists("Set-Cookie"));
  }

  @Test void normalUserCannotUseAdministrativeOperations() throws Exception {
    UserEntity normal=account(RoleEnum.USER, organization(), null);
    UserEntity other=account(RoleEnum.ADMIN, normal.getOrganizationId(), null);
    String auth="Bearer "+token(normal);
    mvc.perform(delete("/api/v1/users/"+other.getId()).header("Authorization",auth)).andExpect(status().isForbidden());
    mvc.perform(patch("/api/v1/users/"+other.getId()+"/rol").header("Authorization",auth)
        .contentType(MediaType.APPLICATION_JSON).content("{\"rol\":\"ADMIN\"}")).andExpect(status().isForbidden());
    mvc.perform(get("/api/v1/organizations").header("Authorization",auth)).andExpect(status().isForbidden());
    mvc.perform(get("/api/v1/admin/quality-reports").header("Authorization",auth)).andExpect(status().isForbidden());
    mvc.perform(get("/api/v1/users").header("Authorization",auth)).andExpect(status().isForbidden());
    mvc.perform(delete("/api/v1/users/"+other.getId())).andExpect(status().isUnauthorized());
  }

  @Test void recoveryExposesCourseChoicesBeforeRateLimit_OBSERVED_DEFECT() throws Exception {
    String email="audit-"+UUID.randomUUID()+"@example.com";
    account(RoleEnum.USER, organization(), email);
    account(RoleEnum.USER, organization(), email);
    for(int i=0;i<3;i++) {
      mvc.perform(post("/api/v1/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
          .content("{\"email\":\""+email+"\"}"))
          .andExpect(status().isOk()).andExpect(jsonPath("$.requiresOrganizationSelection").value(true))
          .andExpect(jsonPath("$.organizationOptions.length()").value(2));
    }
  }

  @Test void invitationFilterLimitsTwentiethAttemptByIp() throws Exception {
    String path="/api/v1/auth/validate-invitation";
    for(int i=1;i<=21;i++) {
      var request=post(path).servletPath(path).with(r->{r.setRemoteAddr("198.51.100.77");return r;})
          .contentType(MediaType.APPLICATION_JSON).content("{\"token\":\"invalid-audit-token\"}");
      mvc.perform(request).andExpect(status().is(i<=20?400:429));
    }
  }

  private Long organization() {
    var o=new OrganizationEntity();o.setName("Audit Course");o.setSlug("audit-"+UUID.randomUUID());
    o.setSchoolYear(2026);o.setActive(true);return organizations.saveAndFlush(o).getId();
  }
  private UserEntity account(RoleEnum role,Long org,String email) {
    var u=new UserEntity();u.setCode("AUD-"+UUID.randomUUID().toString().substring(0,8));
    u.setNombre("AUDIT FIXTURE");u.setCorreo(email==null?UUID.randomUUID()+"@example.com":email);
    u.setPassword(encoder.encode("AuditDemo1!"));u.setRol(role);u.setOrganizationId(org);
    u.setEnabled(true);u.setAccountNonLocked(true);u.setEmailVerifiedAt(LocalDateTime.now());
    u.setInvitationAcceptedAt(LocalDateTime.now());return users.saveAndFlush(u);
  }
  private String token(UserEntity u) {
    return jwt.generateToken(new TenantUserDetails(u.getId(),u.getOrganizationId(),u.getCorreo(),u.getPassword(),u.getRol(),true,true));
  }
}
