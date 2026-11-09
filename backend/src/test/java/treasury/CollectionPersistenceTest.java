package treasury;

import com.tesoreria.alumno.infrastructure.adapter.out.persistence.entity.AlumnoEntity;
import com.tesoreria.alumno.infrastructure.adapter.out.persistence.repository.AlumnoJpaRepository;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.entity.FamiliaEntity;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.repository.FamiliaJpaRepository;
import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.organization.infrastructure.persistence.OrganizationEntity;
import com.tesoreria.organization.infrastructure.persistence.OrganizationJpaRepository;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.treasury.application.usecase.CollectionService;
import com.tesoreria.treasury.core.model.ExpenseCategory;
import com.tesoreria.treasury.core.port.in.TreasuryUseCase;
import com.tesoreria.treasury.infrastructure.adapter.in.web.controller.CollectionController;
import com.tesoreria.user.core.constant.RoleEnum;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

@Tag("integration")
@SpringBootTest(classes = com.tesoreria.TesoreriaAppApplication.class, properties = {
    "spring.config.import=", "spring.flyway.enabled=false",
    "spring.datasource.url=jdbc:h2:mem:collection-persistence;DB_CLOSE_DELAY=-1",
    "app.web-push.enabled=false", "app.storage.gcs.enabled=false"
})
@ActiveProfiles("test")
class CollectionPersistenceTest {
    @Autowired OrganizationJpaRepository organizations;
    @Autowired AlumnoJpaRepository students;
    @Autowired FamiliaJpaRepository families;
    @Autowired com.tesoreria.apoderado.infrastructure.adapter.out.persistence.repository.ApoderadoJpaRepository guardians;
    @Autowired com.tesoreria.treasury.infrastructure.adapter.in.web.controller.TreasuryController profileController;
    @org.springframework.test.context.bean.override.mockito.MockitoBean
    com.tesoreria.treasury.core.port.out.FileStorageService storage;
    @Autowired com.tesoreria.treasury.application.usecase.CollectionReceiptService receiptService;
    @Autowired com.tesoreria.treasury.infrastructure.adapter.in.web.controller.CollectionReceiptController receiptController;
    @Autowired CollectionService service;
    @Autowired CollectionController controller;
    @Autowired TreasuryUseCase treasury;
    @AfterEach void cleanup() { SecurityContextHolder.clearContext(); }

    @Test void persistsFamilyControlThenOneIncomeAndProviderExpenseWithTenantIsolation() {
        Long organization = organization();
        authenticate(organization, RoleEnum.ADMIN);
        var student = students.save(new AlumnoEntity(null, "AL-" + UUID.randomUUID().toString().substring(0, 8), "Alumno", "4A"));
        var family = families.save(new FamiliaEntity(null, student.getAlumnoId(), null, List.of(), null, null, null));
        var date = LocalDate.of(2026, 1, 1);
        var campaign = service.create(2026, "Transporte", BigDecimal.valueOf(10000), null, List.of(family.getFamiliaId()), "admin");
        service.collect(campaign.id(), family.getFamiliaId(), BigDecimal.valueOf(4000), date, "A", UUID.randomUUID(), "admin");
        service.collect(campaign.id(), family.getFamiliaId(), BigDecimal.valueOf(6000), date, "B", UUID.randomUUID(), "admin");
        assertEquals(0, treasury.listIncomes(2026).size());
        var closed = service.postIncome(campaign.id(), date, "Total", "admin");
        service.postIncome(campaign.id(), date, "Total", "admin");
        assertEquals(1, treasury.listIncomes(2026).size());
        assertEquals(BigDecimal.valueOf(10000), treasury.getIncome(closed.incomeId()).amount());
        var request = UUID.randomUUID();
        service.disburse(campaign.id(), BigDecimal.valueOf(6000), date, "Transporte", "BUS", ExpenseCategory.TRANSPORT, request, "admin");
        assertTrue(service.list(2026).get(0).movements().stream().allMatch(m -> date.equals(m.date())));
        service.disburse(campaign.id(), BigDecimal.valueOf(6000), date, "Transporte", "BUS", ExpenseCategory.TRANSPORT, request, "admin");
        assertEquals(1, treasury.listExpenses(2026).size());
        assertEquals(BigDecimal.valueOf(4000), service.list(2026).get(0).available());
        assertThrows(DomainException.class, () -> service.collect(campaign.id(), family.getFamiliaId(), BigDecimal.ONE, date, "C", UUID.randomUUID(), "admin"));
        authenticate(organization(), RoleEnum.ADMIN);
        assertTrue(service.list(2026).isEmpty());
        assertThrows(DomainException.class, () -> service.setExpected(campaign.id(), family.getFamiliaId(), BigDecimal.TEN, "admin"));
        assertThrows(DomainException.class, () -> service.update(campaign.id(), "Ajeno", null, "admin"));
        assertThrows(DomainException.class, () -> service.archive(campaign.id(), "Ajeno", "admin"));
        authenticate(organization, RoleEnum.ADMIN);
        var edited = service.update(campaign.id(), "Bus del paseo", date, "admin");
        assertEquals("Bus del paseo", edited.title());
        assertEquals(closed.incomeId(), edited.incomeId());
        assertEquals(BigDecimal.valueOf(10000), edited.collected());
        assertThrows(DomainException.class, () -> service.archive(campaign.id(), " ", "admin"));
        assertEquals(1, service.list(2026).size());
        service.archive(campaign.id(), "Actividad finalizada", "admin");
        assertTrue(service.list(2026).isEmpty());
        assertEquals(1, treasury.listIncomes(2026).size());
        assertEquals(1, treasury.listExpenses(2026).size());
        assertThrows(DomainException.class, () -> service.update(campaign.id(), "Oculto", null, "admin"));
        authenticate(organization, RoleEnum.USER);
        assertTrue(controller.list(2026).isEmpty());
        assertThrows(AccessDeniedException.class, () -> controller.archive(campaign.id(), new CollectionController.Correction("Sin permiso"), () -> "user"));
    }
    @Test void receiptsAreAtomicIdempotentAndTenantScoped() {
        Long tenant = organization();
        authenticate(tenant, RoleEnum.ADMIN);
        var student = students.save(new AlumnoEntity(null, "AL-" + UUID.randomUUID().toString().substring(0, 8), "Alumno", "4A"));
        var family = families.save(new FamiliaEntity(null, student.getAlumnoId(), null, List.of(), null, null, null));
        var campaign = service.create(2026, "Paseo", BigDecimal.TEN, null, List.of(family.getFamiliaId()), "admin");
        var request = UUID.randomUUID();
        byte[] bytes = "%PDF-1.7 prueba".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        var file = new org.springframework.mock.web.MockMultipartFile("file", "pago.pdf", "application/pdf", bytes);
        var date = LocalDate.of(2026, 1, 1);
        org.mockito.Mockito.doThrow(new IllegalStateException("offline")).when(storage).upload(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyString());
        assertThrows(IllegalStateException.class, () -> receiptService.collect(campaign.id(), family.getFamiliaId(), BigDecimal.TEN, date, "", request, file, "admin"));
        assertEquals(0, service.list(2026).get(0).collected().signum());
        assertTrue(receiptService.list(campaign.id()).isEmpty());
        org.mockito.Mockito.reset(storage);
        org.mockito.Mockito.when(storage.read(org.mockito.ArgumentMatchers.anyString())).thenReturn(new com.tesoreria.treasury.core.port.out.FileStorageService.StoredContent(bytes, "application/pdf"));
        receiptService.collect(campaign.id(), family.getFamiliaId(), BigDecimal.TEN, date, "", request, file, "admin");
        assertEquals(date, service.list(2026).get(0).movements().get(0).date());
        var registered = service.list(2026).get(0).movements().get(0).recordedAt();
        assertNotNull(registered);
        receiptService.collect(campaign.id(), family.getFamiliaId(), BigDecimal.TEN, date, "", request, file, "admin");
        assertEquals(registered, service.list(2026).get(0).movements().get(0).recordedAt());
        assertEquals(1, service.list(2026).get(0).movements().size());
        assertEquals(1, receiptService.list(campaign.id()).size());
        assertArrayEquals(bytes, receiptService.download(campaign.id(), request).bytes());
        var invalid = new org.springframework.mock.web.MockMultipartFile("file", "fake.pdf", "application/pdf", "not a pdf".getBytes());
        assertThrows(DomainException.class, () -> receiptService.collect(campaign.id(), family.getFamiliaId(), BigDecimal.TEN, date, "", UUID.randomUUID(), invalid, "admin"));
        authenticate(organization(), RoleEnum.ADMIN);
        assertThrows(DomainException.class, () -> receiptService.download(campaign.id(), request));
        assertThrows(DomainException.class, () -> receiptService.list(campaign.id()));
        authenticate(tenant, RoleEnum.USER);
        assertEquals(1, controller.list(2026).size());
        assertEquals(1, receiptController.list(campaign.id()).size());
        assertArrayEquals(bytes, receiptController.download(campaign.id(), request).getBody());
        assertThrows(AccessDeniedException.class, () -> receiptController.collect(campaign.id(), family.getFamiliaId(),
            new CollectionController.Payment(BigDecimal.ONE, date, "", UUID.randomUUID()), file, () -> "user"));
        authenticate(organization(), RoleEnum.USER);
        assertTrue(controller.list(2026).isEmpty());
        assertThrows(DomainException.class, () -> receiptController.list(campaign.id()));
        assertThrows(DomainException.class, () -> receiptController.download(campaign.id(), request));
    }
    @Test void persistsExtraPaymentsAndRegistrationTimesThroughClosingAndCancellation() {
        authenticate(organization(), RoleEnum.ADMIN);
        var student = students.save(new AlumnoEntity(null, "AL-" + UUID.randomUUID().toString().substring(0, 8), "Alumno", "4A"));
        var family = families.save(new FamiliaEntity(null, student.getAlumnoId(), null, List.of(), null, null, null));
        var date = LocalDate.of(2026, 1, 1);
        var campaign = service.create(2026, "Paseo con extras", BigDecimal.valueOf(15000), null, List.of(family.getFamiliaId()), "admin");
        service.collect(campaign.id(), family.getFamiliaId(), BigDecimal.valueOf(23000), date, "Extra", UUID.randomUUID(), "admin");
        var saved = service.list(2026).get(0);
        assertEquals(BigDecimal.valueOf(15000), saved.expected());
        assertEquals(BigDecimal.valueOf(23000), saved.collected());
        assertEquals(BigDecimal.ZERO, saved.remaining());
        assertEquals("PAID", saved.families().get(0).status());
        var registered = saved.movements().get(0).recordedAt();
        assertNotNull(registered);
        service.cancelFamilyPayments(campaign.id(), family.getFamiliaId(), "Corrección", "admin");
        var cancelled = service.list(2026).get(0);
        assertEquals(registered, cancelled.movements().get(0).recordedAt());
        assertFalse(cancelled.movements().get(0).active());
        assertEquals(BigDecimal.ZERO, cancelled.collected());
        service.collect(campaign.id(), family.getFamiliaId(), BigDecimal.valueOf(23000), date, "Nuevo", UUID.randomUUID(), "admin");
        var closed = service.postIncome(campaign.id(), date, "Total", "admin");
        assertEquals(BigDecimal.valueOf(23000), treasury.getIncome(closed.incomeId()).amount());
        assertEquals(BigDecimal.valueOf(23000), closed.available());
    }
    @Test void bothGuardiansSeeTheSameFamilyPaymentsWithoutDuplicatingTheFundOrExposingOtherFamilies() {
        Long tenant = organization();
        authenticate(tenant, RoleEnum.ADMIN);
        String firstEmail = "first-" + UUID.randomUUID() + "@example.test";
        String secondEmail = "second-" + UUID.randomUUID() + "@example.test";
        var firstGuardian = guardians.save(new com.tesoreria.apoderado.infrastructure.adapter.out.persistence.entity.ApoderadoEntity(
            null, "AP-" + UUID.randomUUID().toString().substring(0, 8), "Padre", firstEmail, "+56912345678", null));
        var secondGuardian = guardians.save(new com.tesoreria.apoderado.infrastructure.adapter.out.persistence.entity.ApoderadoEntity(
            null, "AP-" + UUID.randomUUID().toString().substring(0, 8), "Madre", secondEmail, "+56912345679", null));
        var student = students.save(new AlumnoEntity(null, "AL-" + UUID.randomUUID().toString().substring(0, 8), "Alumno", "4A"));
        var family = families.save(new FamiliaEntity(null, student.getAlumnoId(), null, List.of(
            new com.tesoreria.familia.infrastructure.adapter.out.persistence.entity.FamiliaApoderadoEntity(firstGuardian.getApoderadoId(), "Padre", true),
            new com.tesoreria.familia.infrastructure.adapter.out.persistence.entity.FamiliaApoderadoEntity(secondGuardian.getApoderadoId(), "Madre", false)), null, null, null));
        var otherStudent = students.save(new AlumnoEntity(null, "AL-" + UUID.randomUUID().toString().substring(0, 8), "Otro alumno", "4A"));
        var otherFamily = families.save(new FamiliaEntity(null, otherStudent.getAlumnoId(), null, List.of(), null, null, null));
        var fund = service.create(2026, "Paseo familiar", BigDecimal.valueOf(1500), null,
            List.of(family.getFamiliaId(), otherFamily.getFamiliaId()), "admin");
        var date = LocalDate.of(2026, 1, 1);
        var request = UUID.randomUUID();
        service.collect(fund.id(), family.getFamiliaId(), BigDecimal.valueOf(1500), date, "Pago familiar", request, "admin");
        service.collect(fund.id(), family.getFamiliaId(), BigDecimal.valueOf(1500), date, "Pago familiar", request, "admin");
        service.collect(fund.id(), otherFamily.getFamiliaId(), BigDecimal.valueOf(700), date, "Otra familia", UUID.randomUUID(), "admin");
        assertEquals(BigDecimal.valueOf(2200), service.list(2026).get(0).collected());
        authenticate(tenant, RoleEnum.USER);
        var first = profileController.profile(2026, () -> firstEmail);
        var second = profileController.profile(2026, () -> secondEmail);
        assertEquals(family.getFamiliaId(), first.familyId());
        assertEquals(first.familyId(), second.familyId());
        assertTrue(first.primaryGuardian());
        assertFalse(second.primaryGuardian());
        assertEquals(first.activityFunds(), second.activityFunds());
        assertEquals(1, first.activityFunds().size());
        assertEquals(BigDecimal.valueOf(1500), first.activityFunds().get(0).paid());
        assertEquals(BigDecimal.ZERO, first.activityFunds().get(0).remaining());
        assertEquals(1, first.activityFunds().get(0).payments().size());
        assertEquals(request.toString(), first.activityFunds().get(0).payments().get(0).requestId());
        assertTrue(profileController.profile(2026, () -> "unlinked@example.test").activityFunds().isEmpty());
        authenticate(tenant, RoleEnum.ADMIN);
        service.cancelFamilyPayments(fund.id(), family.getFamiliaId(), "Corrección", "admin");
        authenticate(tenant, RoleEnum.USER);
        var corrected = profileController.profile(2026, () -> secondEmail).activityFunds().get(0);
        assertEquals(BigDecimal.ZERO, corrected.paid());
        assertFalse(corrected.payments().get(0).active());
        authenticate(tenant, RoleEnum.ADMIN);
        service.archive(fund.id(), "Actividad finalizada", "admin");
        authenticate(tenant, RoleEnum.USER);
        assertTrue(controller.list(2026).isEmpty());
        assertEquals(first.activityFunds().get(0).payments().get(0).requestId(),
            profileController.profile(2026, () -> firstEmail).activityFunds().get(0).payments().get(0).requestId());
        authenticate(organization(), RoleEnum.USER);
        assertTrue(profileController.profile(2026, () -> firstEmail).activityFunds().isEmpty());
    }
    private Long organization() {
        var value = new OrganizationEntity(); value.setName("Curso"); value.setSlug("collection-" + UUID.randomUUID());
        value.setSchoolYear(2026); value.setCourseName("4A"); return organizations.save(value).getId();
    }
    private void authenticate(Long organization, RoleEnum role) {
        var user = new TenantUserDetails(organization, organization, "admin@example.invalid", "unused", role, true, true);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }
}
