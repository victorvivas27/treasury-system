package com.tesoreria.messaging.infrastructure;

import com.tesoreria.messaging.application.WhatsAppWebhookService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/webhooks/whatsapp")
public class WhatsAppWebhookController {
    private final WhatsAppWebhookService service;
    public WhatsAppWebhookController(WhatsAppWebhookService service) { this.service = service; }
    @GetMapping(produces = "text/plain")
    public String verify(@RequestParam("hub.mode") String mode, @RequestParam("hub.verify_token") String token,
            @RequestParam("hub.challenge") String challenge) { return service.verify(mode, token, challenge); }
    @PostMapping
    public void receive(@RequestBody byte[] body, @RequestHeader(value = "X-Hub-Signature-256", required = false) String signature) {
        service.receive(body, signature);
    }
}
