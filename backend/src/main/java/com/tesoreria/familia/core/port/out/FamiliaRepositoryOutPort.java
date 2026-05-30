package com.tesoreria.familia.core.port.out;

import java.util.List;
import java.util.Optional;

import com.tesoreria.alumno.core.model.Alumno;
import com.tesoreria.apoderado.core.model.Apoderado;
import com.tesoreria.familia.core.model.Familia;

import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;

public interface FamiliaRepositoryOutPort {

  Familia save(Familia familia);

  Optional<Familia> findById(Long id);

  Optional<Familia> findDetalleById(Long id);

  Optional<Familia> findByAlumnoId(Long alumnoId);

  PageResponse<Familia> findAll(PageRequest pageRequest);

  List<Apoderado> findApoderadosByAlumnoId(Long alumnoId);

  List<Alumno> findAlumnosByApoderadoId(Long apoderadoId);

  void delete(Familia familia);

  void deleteById(Long id);

  boolean existsById(Long id);

  boolean existsByAlumnoId(Long alumnoId);

  boolean existsPrincipalByAlumnoId(Long alumnoId);
  
  List<Familia> findAll();

}
