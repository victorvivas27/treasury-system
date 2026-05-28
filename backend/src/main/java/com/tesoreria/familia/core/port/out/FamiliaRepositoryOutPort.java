package com.tesoreria.familia.core.port.out;

import java.util.List;
import java.util.Optional;

import com.tesoreria.familia.core.model.AlumnoApoderadoVinculado;
import com.tesoreria.familia.core.model.Familia;

public interface FamiliaRepositoryOutPort {

  Familia save(Familia familia);

  Optional<Familia> findByAlumnoIdAndApoderadoId(Long alumnoId, Long apoderadoId);

  List<AlumnoApoderadoVinculado> findApoderadosByAlumnoId(Long alumnoId);

  void delete(Familia familia);

  boolean existsAlumnoById(Long alumnoId);

  boolean existsApoderadoById(Long apoderadoId);

  boolean existsByAlumnoIdAndApoderadoId(Long alumnoId, Long apoderadoId);

  boolean existsPrincipalByAlumnoId(Long alumnoId);

  boolean existsPrincipalByAlumnoIdAndApoderadoIdNot(Long alumnoId, Long apoderadoId);
}
