package com.tesoreria.app.apoderado.A_domain.port.out;

import java.util.Optional;

import com.tesoreria.app.apoderado.A_domain.model.Apoderado;
import com.tesoreria.app.shared.domain.pagination.PageRequest;
import com.tesoreria.app.shared.domain.pagination.PageResponse;

public interface ApoderadoRepositoryOutPort {

  Apoderado save(Apoderado apoderado);

  Optional<Apoderado> findById(Long id);

  PageResponse<Apoderado> findAll(PageRequest pageRequest);

  void deleteById(Long id);

  boolean existsByEmail(String email);

  boolean existsById(Long id);

}
