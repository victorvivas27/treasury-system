package com.tesoreria.familia.core.port.in;

import java.util.List;

import com.tesoreria.familia.core.model.AlumnoVinculado;
import com.tesoreria.familia.core.model.AlumnoApoderadoVinculado;
import com.tesoreria.familia.core.model.FamiliaDetalle;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;

public interface GetFamiliaUseCase {
  FamiliaDetalle obtenerPorId(Long id);

  PageResponse<FamiliaDetalle> listar(PageRequest pageRequest);

  List<AlumnoApoderadoVinculado> listarApoderadosPorAlumno(Long alumnoId);

  List<AlumnoVinculado> listarAlumnosPorApoderado(Long apoderadoId);
}
