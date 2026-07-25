package com.tesoreria.user.infrastructure.adapter.in.web.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.tesoreria.user.core.model.User;
import com.tesoreria.user.infrastructure.adapter.in.web.dto.UserRequestDTO;
import com.tesoreria.user.infrastructure.adapter.in.web.dto.UserResponseDTO;

@Mapper(componentModel = "spring")
public interface UserMapper {
  @Mapping(target = "id", ignore = true)
  @Mapping(target = "code", ignore = true)
  @Mapping(target = "createdAt", ignore = true)
  @Mapping(target = "updatedAt", ignore = true)
  User toDomain(UserRequestDTO request);

  UserResponseDTO toResponse(User user);
}
