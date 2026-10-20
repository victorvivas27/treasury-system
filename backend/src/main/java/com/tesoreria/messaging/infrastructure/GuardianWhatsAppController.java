package com.tesoreria.messaging.infrastructure;

import com.tesoreria.apoderado.application.usecase.ApoderadoService;
import com.tesoreria.messaging.application.GuardianWhatsAppService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/apoderados")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class GuardianWhatsAppController {
    private final ApoderadoService guardians;
    private final GuardianWhatsAppService invitations;
    public GuardianWhatsAppController(ApoderadoService guardians, GuardianWhatsAppService invitations) {
        this.guardians = guardians;
        this.invitations = invitations;
    }
    @GetMapping("/canales-invitacion")
    public GuardianWhatsAppService.InvitationChannels channels() {
        return invitations.channels();
    }
    @PostMapping("/{codigo}/invitacion-whatsapp")
    public GuardianWhatsAppService.InvitationStatus invite(@PathVariable String codigo,
            @RequestBody GuardianWhatsAppService.Consent consent) {
        return invitations.invite(guardians.findByCodigo(codigo).getApoderadoId(), consent);
    }
    @GetMapping("/{codigo}/invitacion-whatsapp")
    public GuardianWhatsAppService.InvitationStatus status(@PathVariable String codigo) {
        return invitations.latest(guardians.findByCodigo(codigo).getApoderadoId());
    }
}
