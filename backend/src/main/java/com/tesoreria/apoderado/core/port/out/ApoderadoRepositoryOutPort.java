package com.tesoreria.apoderado.core.port.out;

import java.util.Optional;

import com.tesoreria.apoderado.core.model.Apoderado;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;

public interface ApoderadoRepositoryOutPort {

  Apoderado save(Apoderado apoderado);

  Optional<Apoderado> findById(Long id);

  PageResponse<Apoderado> findAll(PageRequest pageRequest);

  void deleteById(Long id);

  boolean existsByEmail(String email);

  boolean existsById(Long id);

}
