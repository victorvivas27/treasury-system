package com.tesoreria.user.infrastructure.adapter.in.web.mapper;

import com.tesoreria.user.core.model.User;
import com.tesoreria.user.infrastructure.adapter.in.web.dto.UserRequestDTO;
import com.tesoreria.user.infrastructure.adapter.in.web.dto.UserResponseDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UserMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "code", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "emailVerifiedAt", ignore = true)
    @Mapping(target = "organizationId", ignore = true)
    @Mapping(target = "profileImageUrl", ignore = true)
    @Mapping(target = "profileImageType", ignore = true)
    @Mapping(target = "totpSecret", ignore = true)
    @Mapping(target = "totpEnabled", ignore = true)
    @Mapping(target = "backupCodes", ignore = true)
    User toDomain(UserRequestDTO request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "code", ignore = true)
    @Mapping(target = "password", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "emailVerifiedAt", ignore = true)
    @Mapping(target = "organizationId", ignore = true)
    @Mapping(target = "profileImageUrl", ignore = true)
    @Mapping(target = "profileImageType", ignore = true)
    @Mapping(target = "totpSecret", ignore = true)
    @Mapping(target = "totpEnabled", ignore = true)
    @Mapping(target = "backupCodes", ignore = true)
    User toUpdateDomain(UserRequestDTO request);

    UserResponseDTO toResponse(User user);
}
