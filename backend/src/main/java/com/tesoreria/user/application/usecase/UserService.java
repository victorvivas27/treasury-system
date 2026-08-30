package com.tesoreria.user.application.usecase;

import com.tesoreria.organization.application.DefaultOrganizationProvider;
import com.tesoreria.organization.application.CurrentOrganizationService;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.exception.CodeAlreadyExistsException;
import com.tesoreria.user.core.exception.EmailAlreadyExistsException;
import com.tesoreria.user.core.exception.UserErrorCode;
import com.tesoreria.user.core.exception.UserNotFoundException;
import com.tesoreria.user.core.model.User;
import com.tesoreria.user.core.port.in.UserUseCase;
import com.tesoreria.user.core.port.out.UserRepositoryOutPort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.List;
import java.util.UUID;

public class UserService implements UserUseCase {
    private static final String NOT_FOUND_SUFFIX = " no encontrado";
    private final UserRepositoryOutPort repository;
    private final PasswordEncoder passwordEncoder;
    private final DefaultOrganizationProvider defaultOrganization;
    private final CurrentOrganizationService currentOrganization;

    public UserService(UserRepositoryOutPort repository, PasswordEncoder passwordEncoder) {
        this(repository, passwordEncoder, null, null);
    }

    public UserService(UserRepositoryOutPort repository, PasswordEncoder passwordEncoder,
                       DefaultOrganizationProvider defaultOrganization,
                       CurrentOrganizationService currentOrganization) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.defaultOrganization = defaultOrganization;
        this.currentOrganization = currentOrganization;
    }

    @Override
    @Transactional
    public User create(User user) {
        assertSuperAdminRoleAllowed(user.getRol());
        if (currentOrganization != null && !currentOrganization.isSuperAdmin()) {
            user.setOrganizationId(currentOrganization.getId());
        } else if (user.getOrganizationId() == null && defaultOrganization != null) {
            user.setOrganizationId(defaultOrganization.getId());
        }
        if (repository.existsByCorreo(user.getCorreo())) {
            throw new EmailAlreadyExistsException(user.getCorreo());
        }
        if (user.getCode() == null) {
            user.setCode("USR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT));
        }
        if (repository.existsByCode(user.getCode())) {
            throw new CodeAlreadyExistsException(user.getCode());
        }
        User.validateRawPassword(user.getPassword());
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return repository.save(user);
    }

    @Transactional
    public User bootstrapAdmin(User user) {
        if (repository.count() > 0) {
            throw new DomainException("bootstrap", org.springframework.http.HttpStatus.CONFLICT,
                    "La inicialización del administrador ya no está disponible");
        }
        user.setRol(RoleEnum.SUPER_ADMIN);
        user.setEnabled(true);
        user.setAccountNonLocked(true);
        return create(user);
    }

    @Override
    public User findById(Long id) {
        return (currentOrganization == null || currentOrganization.isSuperAdmin()
                ? repository.findById(id)
                : repository.findByIdAndOrganizationId(id, currentOrganization.getId())
                .or(() -> repository.findById(id).filter(user -> user.getOrganizationId() == null)))
                .orElseThrow(() -> new UserNotFoundException("Usuario con ID " + id + NOT_FOUND_SUFFIX));
    }

    @Override
    public User findByCode(String code) {
        return (currentOrganization == null || currentOrganization.isSuperAdmin()
                ? repository.findByCode(code)
                : repository.findByCodeAndOrganizationId(code, currentOrganization.getId())
                .or(() -> repository.findByCode(code).filter(user -> user.getOrganizationId() == null)))
                .orElseThrow(() -> new UserNotFoundException("Usuario con código " + code + NOT_FOUND_SUFFIX));
    }

    @Override
    public User findByCorreo(String correo) {
        return repository.findByCorreo(correo.toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new UserNotFoundException("Usuario con correo " + correo + NOT_FOUND_SUFFIX));
    }

    public User findByCorreoInCurrentOrganization(String correo) {
        User user = findByCorreo(correo);
        if (currentOrganization != null && !currentOrganization.isSuperAdmin()
                && user.getOrganizationId() != null
                && !currentOrganization.getId().equals(user.getOrganizationId())) {
            throw new UserNotFoundException("Usuario con correo " + correo + NOT_FOUND_SUFFIX);
        }
        return user;
    }

    @Override
    public PageResponse<User> findAll(PageRequest request) {
        return currentOrganization == null || currentOrganization.isSuperAdmin()
                ? repository.findAll(request)
                : repository.findAllByOrganizationId(request, currentOrganization.getId());
    }

    public List<User> findAdministratorsByOrganization(Long organizationId) {
        return repository.findByRolAndOrganizationId(RoleEnum.ADMIN, organizationId);
    }

    @Override
    @Transactional
    public User update(Long id, User changes, String authenticatedEmail) {
        User existing = findById(id);
        repository.findByCorreo(changes.getCorreo())
                .filter(other -> !other.getId().equals(id))
                .ifPresent(other -> {
                    throw new EmailAlreadyExistsException(changes.getCorreo());
                });

        existing.setNombre(changes.getNombre());
        existing.setCorreo(changes.getCorreo());
        existing.setEnabled(changes.getEnabled());
        existing.setAccountNonLocked(changes.getAccountNonLocked());
        return repository.save(existing);
    }

    @Override
    @Transactional
    public User changeRole(Long id, RoleEnum role, String authenticatedEmail) {
        User existing = findById(id);
        assertSuperAdminRoleAllowed(role);
        assertSuperAdminRoleAllowed(existing.getRol());
        if (existing.getCorreo().equalsIgnoreCase(authenticatedEmail)) {
            throw new DomainException(
                    UserErrorCode.OWN_ROLE.getField(),
                    UserErrorCode.OWN_ROLE.getStatus(),
                    "No puede cambiar el rol del usuario autenticado");
        }
        if (existing.getRol() == RoleEnum.ADMIN && role != RoleEnum.ADMIN
                && adminCount(existing.getOrganizationId()) <= 1) {
            throw lastAdminError();
        }
        existing.setRol(role);
        return repository.save(existing);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        User existing = findById(id);
        if (existing.getRol() == RoleEnum.ADMIN && adminCount(existing.getOrganizationId()) <= 1) {
            throw lastAdminError();
        }
        repository.deleteById(id);
    }

    @Transactional
    public User cambiarEstado(Long id, boolean activo, String authenticatedEmail) {
        User user = findById(id);
        if (user.getCorreo().equalsIgnoreCase(authenticatedEmail) && !activo) {
            throw new DomainException("enabled", org.springframework.http.HttpStatus.CONFLICT,
                    "No puede desactivar su propio usuario");
        }
        if (!activo && user.getRol() == RoleEnum.ADMIN
                && adminCount(user.getOrganizationId()) <= 1) {
            throw lastAdminError();
        }
        user.setEnabled(activo);
        return repository.save(user);
    }

    private DomainException lastAdminError() {
        return new DomainException(
                UserErrorCode.LAST_ADMIN.getField(),
                UserErrorCode.LAST_ADMIN.getStatus(),
                "No se puede eliminar o degradar al último administrador");
    }

    private long adminCount(Long organizationId) {
        return currentOrganization == null || currentOrganization.isSuperAdmin()
                ? repository.countByRol(RoleEnum.ADMIN)
                : repository.countByRolAndOrganizationId(RoleEnum.ADMIN, organizationId);
    }

    private void assertSuperAdminRoleAllowed(RoleEnum role) {
        if (role == RoleEnum.SUPER_ADMIN && currentOrganization != null
                && !currentOrganization.isSuperAdmin()) {
            throw new DomainException("role", org.springframework.http.HttpStatus.FORBIDDEN,
                    "Solo un superadministrador puede gestionar ese rol");
        }
    }
}
