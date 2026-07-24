package com.tesoreria.apoderado.core.port.out;

import java.util.List;
import java.util.Optional;

import com.tesoreria.apoderado.core.model.Apoderado;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;

public interface ApoderadoRepositoryOutPort {

  Apoderado save(Apoderado apoderado);

  Optional<Apoderado> findByCodigo(String codigo);

  Optional<Apoderado> findById(Long apoderadoId);

  List<Apoderado> findAllByIds(List<Long> apoderadoIds);

  PageResponse<Apoderado> findAll(PageRequest pageRequest);

  void deleteByCodigo(String codigo);

  boolean existsByEmail(String email);

  boolean existsByCodigo(String codigo);

}
