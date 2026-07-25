package com.tesoreria.user.infrastructure.adapter.out.persistence.mapper;

import org.mapstruct.Mapper;

import com.tesoreria.user.core.model.User;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;

@Mapper(componentModel = "spring")
public interface UserPersistenceMapper {
  User toDomain(UserEntity entity);

  UserEntity toEntity(User domain);
}
