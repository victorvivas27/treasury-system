package com.tesoreria.familia.core.port.in;

import java.util.List;

import com.tesoreria.familia.core.model.AlumnoApoderadoVinculado;

public interface GetFamiliaUseCase {
  List<AlumnoApoderadoVinculado> listarApoderadosPorAlumno(Long alumnoId);
}
