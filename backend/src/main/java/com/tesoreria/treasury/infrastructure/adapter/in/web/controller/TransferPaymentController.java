package com.tesoreria.treasury.infrastructure.adapter.in.web.controller;

import com.tesoreria.treasury.application.usecase.TransferPaymentService;
import com.tesoreria.treasury.application.usecase.TransferPaymentService.*;
import com.tesoreria.treasury.core.model.PaymentStatus;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/tesoreria/pagos-transferencia")
public class TransferPaymentController {
    private static final String ADMIN_ROLE = "hasRole('ADMIN')";
    private final TransferPaymentService service;
    public TransferPaymentController(TransferPaymentService service) { this.service = service; }

    @GetMapping("/cuenta-bancaria")
    public BankAccountView setting(@RequestParam int year) { return service.getSetting(year); }

    @PutMapping("/cuenta-bancaria")
    @PreAuthorize(ADMIN_ROLE)
    public BankAccountView saveSetting(@RequestParam int year, @RequestBody BankAccountRequest request) {
        return service.saveSetting(year, request);
    }

    @GetMapping("/mis-pagos")
    public MyPaymentsView mine(@RequestParam int year, Principal principal) { return service.myPayments(year, principal.getName()); }

    @PostMapping("/mi-plan")
    public MyPaymentsView choose(@RequestBody PlanRequest request, Principal principal) {
        return service.choosePlan(request.year(), request.mode(), principal.getName());
    }

    @PostMapping(value = "/mis-cuotas/{installmentId}/comprobante", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PaymentView> upload(@PathVariable Long installmentId, @RequestPart("file") MultipartFile file,
                                               Principal principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.submitProof(installmentId, file, principal.getName()));
    }

    @PostMapping(value = "/obligaciones/{installmentId}/comprobante", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize(ADMIN_ROLE)
    public ResponseEntity<PaymentView> uploadByAdmin(@PathVariable Long installmentId,
                                                      @RequestPart("file") MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.submitProofByAdmin(installmentId, file));
    }

    @GetMapping("/revision")
    @PreAuthorize(ADMIN_ROLE)
    public List<ReviewPaymentView> review(@RequestParam int year, @RequestParam(required = false) PaymentStatus status) {
        return service.reviewList(year, status);
    }

    @PostMapping("/{paymentId}/aprobar")
    @PreAuthorize(ADMIN_ROLE)
    public PaymentView approve(@PathVariable Long paymentId,
                               @RequestBody(required = false) ApprovalRequest request,
                               Principal principal) {
        return service.approve(paymentId, principal.getName(), request == null ? null : request.paymentDate());
    }

    @PostMapping("/{paymentId}/rechazar")
    @PreAuthorize(ADMIN_ROLE)
    public PaymentView reject(@PathVariable Long paymentId, @RequestBody RejectRequest request, Principal principal) {
        return service.reject(paymentId, request.reason(), principal.getName());
    }

    @GetMapping("/{paymentId}/comprobante")
    public ResponseEntity<byte[]> proof(@PathVariable Long paymentId, Principal principal, Authentication authentication) {
        boolean admin = authentication.getAuthorities().stream().anyMatch(value -> "ROLE_ADMIN".equals(value.getAuthority()));
        Download download = service.download(paymentId, principal.getName(), admin);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(download.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline().filename(download.filename()).build().toString())
                .body(download.bytes());
    }
}
