package com.tesoreria.treasury.infrastructure.adapter.in.web.controller;

import com.tesoreria.treasury.application.usecase.MercadoPagoService;
import com.tesoreria.treasury.application.usecase.MercadoPagoWebhook;
import com.tesoreria.treasury.core.port.out.MercadoPagoGateway.Checkout;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/tesoreria/pagos/mercado-pago")
public class MercadoPagoController {
    private final MercadoPagoService service;
    private final MercadoPagoWebhook webhook;
    public MercadoPagoController(MercadoPagoService service, MercadoPagoWebhook webhook) {
        this.service = service; this.webhook = webhook;
    }

    @GetMapping("/disponibilidad")
    public Map<String, Boolean> availability() { return Map.of("enabled", service.available()); }

    @PostMapping("/cuotas/{id}/checkout")
    public Checkout checkout(@PathVariable Long id, Principal principal) { return service.checkout(id, principal.getName()); }

    @PostMapping("/retorno")
    public MercadoPagoService.PaymentResult reconcile(@RequestBody ReturnRequest request, Principal principal) {
        return service.reconcileOwn(request.paymentId(), principal.getName());
    }

    @PostMapping("/webhook")
    public void notification(@RequestParam("data.id") String id,
            @RequestHeader(value = "x-signature", required = false) String signature,
            @RequestHeader(value = "x-request-id", required = false) String requestId) {
        webhook.receive(id, signature, requestId);
    }

    public record ReturnRequest(String paymentId) { }
}
