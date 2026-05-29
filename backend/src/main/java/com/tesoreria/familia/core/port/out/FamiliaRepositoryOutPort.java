package com.tesoreria.familia.core.port.out;

import java.util.List;
import java.util.Optional;

import com.tesoreria.familia.core.model.AlumnoVinculado;
import com.tesoreria.familia.core.model.AlumnoApoderadoVinculado;
import com.tesoreria.familia.core.model.Familia;
import com.tesoreria.familia.core.model.FamiliaDetalle;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;

public interface FamiliaRepositoryOutPort {

  Familia save(Familia familia);

  Optional<Familia> findById(Long id);

  Optional<FamiliaDetalle> findDetalleById(Long id);

  Optional<Familia> findByAlumnoIdAndApoderadoId(Long alumnoId, Long apoderadoId);

  PageResponse<FamiliaDetalle> findAll(PageRequest pageRequest);

  List<AlumnoApoderadoVinculado> findApoderadosByAlumnoId(Long alumnoId);

  List<AlumnoVinculado> findAlumnosByApoderadoId(Long apoderadoId);

  void delete(Familia familia);

  void deleteById(Long id);

  boolean existsById(Long id);

  boolean existsAlumnoById(Long alumnoId);

  boolean existsApoderadoById(Long apoderadoId);

  boolean existsByAlumnoIdAndApoderadoId(Long alumnoId, Long apoderadoId);

  boolean existsPrincipalByAlumnoId(Long alumnoId);

  boolean existsPrincipalByAlumnoIdAndApoderadoIdNot(Long alumnoId, Long apoderadoId);
}
