package com.tesoreria.treasury.application.usecase;

import com.tesoreria.alumno.infrastructure.adapter.out.persistence.repository.AlumnoJpaRepository;
import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.entity.ApoderadoEntity;
import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.repository.ApoderadoJpaRepository;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.entity.FamiliaEntity;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.repository.FamiliaJpaRepository;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.treasury.core.model.*;
import com.tesoreria.treasury.core.port.in.TreasuryUseCase;
import com.tesoreria.treasury.core.port.out.FileStorageService;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.*;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository.*;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class TransferPaymentService {
    private static final int MIN_SCHOOL_YEAR = 2000;
    private static final int MAX_FILE_NAME_LENGTH = 255;
    private static final int MIN_SIGNATURE_BYTES = 4;
    private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png", "application/pdf");
    private final BankAccountSettingJpaRepository settings;
    private final GenericPaymentJpaRepository payments;
    private final BankTransferPaymentJpaRepository transfers;
    private final FamilyFeePlanJpaRepository plans;
    private final FeeObligationJpaRepository obligations;
    private final FamiliaJpaRepository families;
    private final ApoderadoJpaRepository guardians;
    private final AlumnoJpaRepository students;
    private final TreasuryUseCase treasury;
    private final FileStorageService storage;
    private final long maxBytes;

    public TransferPaymentService(BankAccountSettingJpaRepository settings,
                                  GenericPaymentJpaRepository payments,
                                  BankTransferPaymentJpaRepository transfers,
                                  FamilyFeePlanJpaRepository plans,
                                  FeeObligationJpaRepository obligations,
                                  FamiliaJpaRepository families,
                                  ApoderadoJpaRepository guardians,
                                  AlumnoJpaRepository students,
                                  TreasuryUseCase treasury,
                                  ObjectProvider<FileStorageService> storageProvider,
                                  Environment environment) {
        this.settings = settings; this.payments = payments; this.transfers = transfers;
        this.plans = plans; this.obligations = obligations; this.families = families;
        this.guardians = guardians; this.students = students; this.treasury = treasury;
        this.storage = storageProvider.getIfAvailable();
        this.maxBytes = environment.getProperty("app.storage.gcs.max-file-size-mb", Long.class, 10L) * 1024L * 1024L;
    }

    @Transactional
    public BankAccountView saveSetting(int year, BankAccountRequest request) {
        if (year < MIN_SCHOOL_YEAR) throw error(HttpStatus.BAD_REQUEST, "El año escolar es inválido");
        BankAccountSettingEntity value = settings.findBySchoolYear(year).orElseGet(BankAccountSettingEntity::new);
        LocalDateTime now = LocalDateTime.now();
        value.setSchoolYear(year); value.setAccountHolderName(required(request.accountHolderName(), "Titular"));
        value.setAccountHolderRut(required(request.accountHolderRut(), "RUT"));
        value.setBankName(required(request.bankName(), "Banco")); value.setAccountType(required(request.accountType(), "Tipo de cuenta"));
        value.setAccountNumber(required(request.accountNumber(), "Número de cuenta")); value.setEmail(required(request.email(), "Correo"));
        if (value.getCreatedAt() == null) value.setCreatedAt(now); value.setUpdatedAt(now);
        return setting(settings.save(value));
    }

    @Transactional(readOnly = true)
    public BankAccountView getSetting(int year) {
        return setting(settings.findBySchoolYear(year).orElseThrow(() -> error(HttpStatus.NOT_FOUND,
                "Aún no se han configurado los datos bancarios")));
    }

    @Transactional
    public MyPaymentsView choosePlan(int year, PaymentMode mode, String email) {
        FamiliaEntity family = ownFamily(email);
        treasury.assignMode(year, family.getFamiliaId(), mode, email);
        treasury.generateObligations(year, email);
        return myPayments(year, email);
    }

    @Transactional(readOnly = true)
    public MyPaymentsView myPayments(int year, String email) {
        AnnualFeeConfig config = treasury.getConfig(year);
        FamiliaEntity family = ownFamily(email);
        FamilyFeePlanEntity plan = plans.findByConfigIdAndFamilyId(config.id(), family.getFamiliaId()).orElse(null);
        List<InstallmentView> installments = plan == null ? List.of() : installmentViews(
                obligations.findByPlanIdOrderByDueDate(plan.getId()), true);
        BigDecimal paid = installments.stream().filter(i -> i.status() == ObligationStatus.PAGADA)
                .map(InstallmentView::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        String studentName = students.findById(family.getAlumnoId()).map(value -> value.getNombre()).orElse("");
        return new MyPaymentsView(year, config.annualAmount(), config.allowedMode(), config.annualDueDate(),
                config.firstDueDate(), config.secondDueDate(), family.getFamiliaId(), studentName,
                plan == null ? null : plan.getMode(), paid, installments,
                settings.findBySchoolYear(year).map(this::setting).orElse(null));
    }

    @Transactional
    public PaymentView submitProof(Long installmentId, MultipartFile file, String email) {
        FeeObligationEntity obligation = ownObligation(installmentId, email);
        if (obligation.getStatus() == ObligationStatus.PAGADA)
            throw error(HttpStatus.CONFLICT, "Esta cuota ya está pagada");
        if (payments.existsByInstallmentIdAndStatusIn(installmentId,
                List.of(PaymentStatus.PROOF_SUBMITTED, PaymentStatus.UNDER_REVIEW, PaymentStatus.PAID)))
            throw error(HttpStatus.CONFLICT, "Esta cuota ya tiene un comprobante en revisión");
        ValidFile valid = validate(file); FileStorageService fileStorage = requireStorage();
        String objectName = "tesorerias/transferencias/%d/%s".formatted(installmentId, UUID.randomUUID());
        fileStorage.upload(objectName, valid.bytes(), valid.contentType());
        try {
            LocalDateTime now = LocalDateTime.now();
            GenericPaymentEntity payment = new GenericPaymentEntity(); payment.setInstallmentId(installmentId);
            payment.setAmount(obligation.getAmount()); payment.setCurrency("CLP"); payment.setPaymentMethod(PaymentMethod.BANK_TRANSFER);
            payment.setStatus(PaymentStatus.PROOF_SUBMITTED); payment.setCreatedAt(now); payment.setUpdatedAt(now);
            payment = payments.saveAndFlush(payment);
            BankTransferPaymentEntity transfer = new BankTransferPaymentEntity(); transfer.setPaymentId(payment.getId());
            transfer.setProofObjectName(objectName); transfer.setOriginalFileName(valid.name()); transfer.setContentType(valid.contentType());
            transfer.setSizeBytes((long) valid.bytes().length); transfer.setSubmittedAt(now); transfer.setCreatedAt(now); transfer.setUpdatedAt(now);
            transfers.saveAndFlush(transfer);
            obligation.setStatus(ObligationStatus.EN_REVISION); obligation.setUpdatedAt(now); obligations.save(obligation);
            return view(payment, transfer, null);
        } catch (RuntimeException exception) {
            try { fileStorage.delete(objectName); } catch (RuntimeException cleanup) { exception.addSuppressed(cleanup); }
            throw exception;
        }
    }

    @Transactional(readOnly = true)
    public List<ReviewPaymentView> reviewList(int year, PaymentStatus status) {
        AnnualFeeConfig config = treasury.getConfig(year);
        List<FamilyFeePlanEntity> yearPlans = plans.findByConfigIdOrderByFamilyId(config.id());
        Map<Long, FamilyFeePlanEntity> plansById = yearPlans.stream().collect(Collectors.toMap(FamilyFeePlanEntity::getId, Function.identity()));
        List<FeeObligationEntity> yearObligations = obligations.findByPlanIdInOrderByDueDate(plansById.keySet());
        Map<Long, FeeObligationEntity> byId = yearObligations.stream().collect(Collectors.toMap(FeeObligationEntity::getId, Function.identity()));
        List<GenericPaymentEntity> values = payments.findByInstallmentIdInOrderByCreatedAtDesc(byId.keySet());
        if (status != null) values = values.stream().filter(value -> value.getStatus() == status).toList();
        Map<Long, BankTransferPaymentEntity> detail = transfers.findByPaymentIdIn(values.stream().map(GenericPaymentEntity::getId).toList())
                .stream().collect(Collectors.toMap(BankTransferPaymentEntity::getPaymentId, Function.identity()));
        return values.stream().map(payment -> reviewView(payment, detail.get(payment.getId()), byId.get(payment.getInstallmentId()), plansById)).toList();
    }

    @Transactional
    public PaymentView approve(Long paymentId, String reviewer) {
        GenericPaymentEntity payment = payment(paymentId); BankTransferPaymentEntity transfer = transfer(paymentId);
        if (payment.getStatus() == PaymentStatus.PAID) return view(payment, transfer, null);
        if (payment.getStatus() != PaymentStatus.PROOF_SUBMITTED && payment.getStatus() != PaymentStatus.UNDER_REVIEW)
            throw error(HttpStatus.CONFLICT, "El pago no está pendiente de revisión");
        treasury.registerPayment(payment.getInstallmentId(), LocalDate.now(), payment.getAmount(), reviewer,
                "Transferencia aprobada · intento #" + payment.getId());
        LocalDateTime now = LocalDateTime.now(); payment.setStatus(PaymentStatus.PAID); payment.setPaidAt(now); payment.setUpdatedAt(now);
        transfer.setReviewedBy(reviewer); transfer.setReviewedAt(now); transfer.setUpdatedAt(now);
        return view(payments.save(payment), transfers.save(transfer), null);
    }

    @Transactional
    public PaymentView reject(Long paymentId, String reason, String reviewer) {
        GenericPaymentEntity payment = payment(paymentId); BankTransferPaymentEntity transfer = transfer(paymentId);
        if (payment.getStatus() == PaymentStatus.REJECTED) return view(payment, transfer, null);
        if (payment.getStatus() != PaymentStatus.PROOF_SUBMITTED && payment.getStatus() != PaymentStatus.UNDER_REVIEW)
            throw error(HttpStatus.CONFLICT, "El pago no está pendiente de revisión");
        String validReason = required(reason, "Motivo"); LocalDateTime now = LocalDateTime.now();
        payment.setStatus(PaymentStatus.REJECTED); payment.setUpdatedAt(now); transfer.setReviewedBy(reviewer);
        transfer.setReviewedAt(now); transfer.setRejectionReason(validReason); transfer.setUpdatedAt(now);
        FeeObligationEntity obligation = obligations.findById(payment.getInstallmentId()).orElseThrow();
        obligation.setStatus(ObligationStatus.PENDIENTE); obligation.setUpdatedAt(now); obligations.save(obligation);
        return view(payments.save(payment), transfers.save(transfer), null);
    }

    @Transactional(readOnly = true)
    public Download download(Long paymentId, String email, boolean admin) {
        GenericPaymentEntity payment = payment(paymentId);
        if (!admin) ownObligation(payment.getInstallmentId(), email);
        BankTransferPaymentEntity transfer = transfer(paymentId);
        FileStorageService.StoredContent content = requireStorage().read(transfer.getProofObjectName());
        return new Download(transfer.getOriginalFileName(), transfer.getContentType(), content.bytes());
    }

    private List<InstallmentView> installmentViews(List<FeeObligationEntity> values, boolean history) {
        List<GenericPaymentEntity> paymentValues = values.isEmpty() ? List.of() : payments.findByInstallmentIdInOrderByCreatedAtDesc(values.stream().map(FeeObligationEntity::getId).toList());
        Map<Long, BankTransferPaymentEntity> transferMap = transfers.findByPaymentIdIn(paymentValues.stream().map(GenericPaymentEntity::getId).toList()).stream()
                .collect(Collectors.toMap(BankTransferPaymentEntity::getPaymentId, Function.identity()));
        Map<Long, List<PaymentView>> byInstallment = paymentValues.stream().collect(Collectors.groupingBy(GenericPaymentEntity::getInstallmentId,
                Collectors.mapping(p -> view(p, transferMap.get(p.getId()), null), Collectors.toList())));
        return values.stream().map(value -> new InstallmentView(value.getId(), value.getInstallment(), value.getConcept(), value.getAmount(),
                value.getDueDate(), value.getStatus(), history ? byInstallment.getOrDefault(value.getId(), List.of()) : List.of())).toList();
    }

    private ReviewPaymentView reviewView(GenericPaymentEntity payment, BankTransferPaymentEntity transfer,
                                          FeeObligationEntity obligation, Map<Long, FamilyFeePlanEntity> plansById) {
        FamilyFeePlanEntity plan = plansById.get(obligation.getPlanId()); FamiliaEntity family = families.findById(plan.getFamilyId()).orElseThrow();
        String student = students.findById(family.getAlumnoId()).map(value -> value.getNombre()).orElse("");
        String guardian = family.getApoderados().stream().filter(value -> Boolean.TRUE.equals(value.getEsPrincipal())).findFirst()
                .flatMap(value -> guardians.findById(value.getApoderadoId())).map(ApoderadoEntity::getNombre).orElse("");
        return new ReviewPaymentView(payment.getId(), student, guardian, obligation.getConcept(), payment.getAmount(), payment.getStatus(),
                transfer == null ? null : transfer.getSubmittedAt(), transfer == null ? null : transfer.getRejectionReason());
    }

    private FamiliaEntity ownFamily(String email) {
        ApoderadoEntity guardian = guardians.findByEmail(email).orElseThrow(() -> error(HttpStatus.FORBIDDEN, "Tu usuario no está asociado a un apoderado"));
        return families.findByGuardianId(guardian.getApoderadoId()).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "No existe una familia asociada"));
    }
    private FeeObligationEntity ownObligation(Long id, String email) {
        FamiliaEntity family = ownFamily(email); FeeObligationEntity obligation = obligations.findById(id)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Cuota no encontrada"));
        FamilyFeePlanEntity plan = plans.findById(obligation.getPlanId()).orElseThrow();
        if (!plan.getFamilyId().equals(family.getFamiliaId())) throw error(HttpStatus.FORBIDDEN, "La cuota no pertenece a tu familia");
        return obligation;
    }
    private GenericPaymentEntity payment(Long id) { return payments.findById(id).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Pago no encontrado")); }
    private BankTransferPaymentEntity transfer(Long id) { return transfers.findByPaymentId(id).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Comprobante no encontrado")); }
    private FileStorageService requireStorage() { if (storage == null) throw error(HttpStatus.SERVICE_UNAVAILABLE, "El almacenamiento de comprobantes no está configurado"); return storage; }
    private String required(String value, String field) { if (value == null || value.isBlank()) throw error(HttpStatus.BAD_REQUEST, field + " es obligatorio"); return value.trim(); }
    private ValidFile validate(MultipartFile file) {
        if (file == null || file.isEmpty()) throw error(HttpStatus.BAD_REQUEST, "El comprobante está vacío");
        if (file.getSize() > maxBytes) throw error(HttpStatus.PAYLOAD_TOO_LARGE, "El comprobante supera el tamaño máximo");
        String type = Optional.ofNullable(file.getContentType()).orElse("").toLowerCase(Locale.ROOT);
        if (!ALLOWED_TYPES.contains(type)) throw error(HttpStatus.BAD_REQUEST, "Solo se permiten archivos JPG, PNG o PDF");
        String name = Optional.ofNullable(file.getOriginalFilename()).orElse("comprobante").replace('\\', '/'); name = name.substring(name.lastIndexOf('/') + 1);
        if (name.isBlank() || name.length() > MAX_FILE_NAME_LENGTH || name.contains("..")) throw error(HttpStatus.BAD_REQUEST, "Nombre de archivo inválido");
        try { byte[] bytes = file.getBytes(); if (!signature(type, bytes)) throw error(HttpStatus.BAD_REQUEST, "El contenido no coincide con el tipo de archivo"); return new ValidFile(name, type, bytes); }
        catch (IOException ex) { throw new DomainException("comprobante", HttpStatus.BAD_REQUEST, "No se pudo leer el comprobante", ex); }
    }
    private boolean signature(String type, byte[] b) { if (b.length < MIN_SIGNATURE_BYTES) return false; return switch (type) {
        case "application/pdf" -> b[0] == '%' && b[1] == 'P' && b[2] == 'D' && b[3] == 'F';
        case "image/jpeg" -> (b[0] & 255) == 255 && (b[1] & 255) == 216;
        case "image/png" -> (b[0] & 255) == 137 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G'; default -> false; }; }
    private BankAccountView setting(BankAccountSettingEntity v) { return new BankAccountView(v.getId(), v.getSchoolYear(), v.getAccountHolderName(), v.getAccountHolderRut(), v.getBankName(), v.getAccountType(), v.getAccountNumber(), v.getEmail()); }
    private PaymentView view(GenericPaymentEntity p, BankTransferPaymentEntity t, String ignored) { return new PaymentView(p.getId(), p.getInstallmentId(), p.getAmount(), p.getCurrency(), p.getPaymentMethod(), p.getStatus(), p.getPaidAt(), t == null ? null : t.getOriginalFileName(), t == null ? null : t.getSubmittedAt(), t == null ? null : t.getReviewedAt(), t == null ? null : t.getRejectionReason()); }
    private DomainException error(HttpStatus status, String message) { return new DomainException("pago", status, message); }

    private record ValidFile(String name, String contentType, byte[] bytes) {}
    public record BankAccountRequest(String accountHolderName, String accountHolderRut, String bankName, String accountType, String accountNumber, String email) {}
    public record BankAccountView(Long id, Integer schoolYear, String accountHolderName, String accountHolderRut, String bankName, String accountType, String accountNumber, String email) {}
    public record PlanRequest(int year, PaymentMode mode) {}
    public record RejectRequest(String reason) {}
    public record PaymentView(Long id, Long installmentId, BigDecimal amount, String currency, PaymentMethod paymentMethod, PaymentStatus status, LocalDateTime paidAt, String originalFileName, LocalDateTime submittedAt, LocalDateTime reviewedAt, String rejectionReason) {}
    public record InstallmentView(Long id, InstallmentType installment, String concept, BigDecimal amount, LocalDate dueDate, ObligationStatus status, List<PaymentView> history) {}
    public record MyPaymentsView(int schoolYear, BigDecimal totalAmount, AllowedPaymentMode allowedMode, LocalDate annualDueDate, LocalDate firstDueDate, LocalDate secondDueDate, Long familyId, String studentName, PaymentMode selectedMode, BigDecimal paidAmount, List<InstallmentView> installments, BankAccountView bankAccount) {}
    public record ReviewPaymentView(Long id, String studentName, String guardianName, String installment, BigDecimal amount, PaymentStatus status, LocalDateTime submittedAt, String rejectionReason) {}
    public record Download(String filename, String contentType, byte[] bytes) {}
}
