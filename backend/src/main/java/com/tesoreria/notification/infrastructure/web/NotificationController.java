package com.tesoreria.notification.infrastructure.web;

import com.tesoreria.notification.application.NotificationService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    private final NotificationService service;
    public NotificationController(NotificationService service) { this.service = service; }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Integer>> send(@Valid @RequestBody NotificationRequest request,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("recipientCount", service.send(request, authentication.getName())));
    }
    @GetMapping("/me")
    public List<NotificationResponse> mine(Authentication authentication) {
        return service.mine(authentication.getName());
    }
    @GetMapping("/sent")
    @PreAuthorize("hasRole('ADMIN')")
    public List<SentNotificationResponse> sent(Authentication authentication) {
        return service.sent(authentication.getName());
    }
    @GetMapping("/me/unread-count")
    public Map<String, Long> unread(Authentication authentication) {
        return Map.of("count", service.unreadCount(authentication.getName()));
    }
    @PatchMapping("/{id}/read")
    public NotificationResponse read(@PathVariable Long id, Authentication authentication) {
        return service.markRead(id, authentication.getName());
    }
    @PatchMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void readAll(Authentication authentication) { service.markAllRead(authentication.getName()); }
    @DeleteMapping("/me/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMine(@PathVariable Long id, Authentication authentication) {
        service.deleteMine(id, authentication.getName());
    }
    @DeleteMapping("/sent/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSent(@PathVariable Long id, Authentication authentication) {
        service.deleteSent(id, authentication.getName());
    }
    @GetMapping("/threads/{deliveryId}/messages")
    public List<NotificationReplyResponse> replies(@PathVariable Long deliveryId,
            Authentication authentication) {
        return service.replies(deliveryId, authentication.getName());
    }
    @PostMapping("/threads/{deliveryId}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public NotificationReplyResponse reply(@PathVariable Long deliveryId,
            @Valid @RequestBody NotificationReplyRequest request, Authentication authentication) {
        return service.reply(deliveryId, request, authentication.getName());
    }
    @PatchMapping("/messages/{id}")
    public NotificationReplyResponse editReply(@PathVariable Long id,
            @Valid @RequestBody NotificationReplyRequest request, Authentication authentication) {
        return service.editReply(id, request, authentication.getName());
    }
    @DeleteMapping("/messages/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteReply(@PathVariable Long id, Authentication authentication) {
        service.deleteReply(id, authentication.getName());
    }
}
