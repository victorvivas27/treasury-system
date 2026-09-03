package com.tesoreria.organization.infrastructure.web;

import com.tesoreria.organization.application.OrganizationService;
import com.tesoreria.organization.infrastructure.persistence.OrganizationEntity;
import com.tesoreria.user.application.usecase.UserService;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.model.User;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/organizations")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class OrganizationController {
    private final OrganizationService organizations;
    private final UserService users;

    public OrganizationController(OrganizationService organizations, UserService users) {
        this.organizations = organizations;
        this.users = users;
    }

    @GetMapping
    public List<OrganizationResponse> findAll() {
        return organizations.findAll().stream().map(this::response).toList();
    }

    @GetMapping("/login-options")
    @PreAuthorize("permitAll()")
    public List<OrganizationLoginOptionResponse> loginOptions() {
        return organizations.findAll().stream()
                .filter(OrganizationEntity::isActive)
                .map(value -> new OrganizationLoginOptionResponse(
                        value.getId(), displayName(value), value.getSlug(), value.getType().name()))
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrganizationResponse create(@Valid @RequestBody OrganizationRequest request) {
        return response(organizations.create(request.name(), request.slug(), request.type(),
                request.senderName(), request.replyToEmail()));
    }

    @PatchMapping("/{id}/active")
    public OrganizationResponse setActive(@PathVariable Long id, @RequestParam boolean value) {
        return response(organizations.setActive(id, value));
    }

    @PatchMapping("/{id}/email-branding")
    public OrganizationResponse updateEmailBranding(
            @PathVariable Long id, @Valid @RequestBody OrganizationEmailRequest request) {
        return response(organizations.updateEmailBranding(
                id, request.senderName(), request.replyToEmail()));
    }

    @PatchMapping("/{id}/course")
    public OrganizationResponse updateCourse(
            @PathVariable Long id, @Valid @RequestBody OrganizationCourseRequest request) {
        return response(organizations.updateCourse(id, request.name(), request.schoolYear()));
    }

    @PostMapping("/{id}/admins")
    @ResponseStatus(HttpStatus.CREATED)
    public Long createAdmin(@PathVariable Long id,
                            @Valid @RequestBody OrganizationAdminRequest request) {
        organizations.requireActive(id);
        User user = new User();
        user.setNombre(request.name());
        user.setCorreo(request.email());
        user.setPassword(request.password());
        user.setRol(RoleEnum.ADMIN);
        user.setEnabled(true);
        user.setAccountNonLocked(true);
        user.setOrganizationId(id);
        return users.create(user).getId();
    }

    @GetMapping("/{id}/admins")
    public List<OrganizationAdminResponse> findAdmins(@PathVariable Long id) {
        organizations.require(id);
        return users.findAdministratorsByOrganization(id).stream()
                .map(user -> new OrganizationAdminResponse(
                        user.getId(), user.getNombre(), user.getCorreo(),
                        Boolean.TRUE.equals(user.getEnabled()),
                        Boolean.TRUE.equals(user.getAccountNonLocked()), user.getCreatedAt()))
                .toList();
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id,
                       @Valid @RequestBody OrganizationDeleteRequest request) {
        organizations.delete(id, request.organizationName(), request.confirmation());
    }

    private OrganizationResponse response(OrganizationEntity value) {
        return new OrganizationResponse(value.getId(), value.getName(), value.getSlug(),
                value.getType(), value.isActive(), value.getCourseName(), value.getSchoolYear(),
                value.getSenderName(), value.getReplyToEmail(),
                value.getCreatedAt(), value.getUpdatedAt());
    }

    private String displayName(OrganizationEntity value) {
        return value.getCourseName() == null || value.getCourseName().isBlank()
                ? value.getName()
                : value.getCourseName();
    }
}
