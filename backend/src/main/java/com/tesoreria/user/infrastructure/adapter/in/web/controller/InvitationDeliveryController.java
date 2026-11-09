package com.tesoreria.user.infrastructure.adapter.in.web.controller;

import com.tesoreria.user.application.usecase.InvitationDeliveryService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/apoderados")
public class InvitationDeliveryController {
    private final InvitationDeliveryService deliveries;
    public InvitationDeliveryController(InvitationDeliveryService deliveries) { this.deliveries = deliveries; }

    @GetMapping("/{codigo}/invitacion-correo")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public InvitationDeliveryService.Status latest(@PathVariable String codigo) { return deliveries.latest(codigo); }
}
