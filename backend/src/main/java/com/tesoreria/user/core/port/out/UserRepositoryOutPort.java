package com.tesoreria.user.core.port.out;

import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.model.User;

import java.util.Optional;
import java.util.List;

public interface UserRepositoryOutPort {
    User save(User user);

    Optional<User> findById(Long id);
    Optional<User> findByIdAndOrganizationId(Long id, Long organizationId);

    Optional<User> findByCode(String code);
    Optional<User> findByCodeAndOrganizationId(String code, Long organizationId);

    Optional<User> findByCorreo(String correo);

    PageResponse<User> findAll(PageRequest request);
    PageResponse<User> findAllByOrganizationId(PageRequest request, Long organizationId);

    boolean existsByCode(String code);

    boolean existsByCorreo(String correo);

    long countByRol(RoleEnum rol);
    long countByRolAndOrganizationId(RoleEnum rol, Long organizationId);

    List<User> findByRolAndOrganizationId(RoleEnum rol, Long organizationId);

    long count();

    void deleteById(Long id);
}
