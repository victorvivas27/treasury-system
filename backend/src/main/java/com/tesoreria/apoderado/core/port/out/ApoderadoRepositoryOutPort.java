package com.tesoreria.apoderado.core.port.out;

import java.util.List;
import java.util.Optional;

import com.tesoreria.apoderado.core.model.Apoderado;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;

public interface ApoderadoRepositoryOutPort {

  Apoderado save(Apoderado apoderado);

  Optional<Apoderado> findById(Long apoderadoId);

  PageResponse<Apoderado> findAll(PageRequest pageRequest);

  void deleteById(Long apoderadoId);

  boolean existsByEmail(String email);

  boolean existsById(Long apoderadoId);

  List<Apoderado> findAllByIds(List<Long> apoderadoIds);

}
