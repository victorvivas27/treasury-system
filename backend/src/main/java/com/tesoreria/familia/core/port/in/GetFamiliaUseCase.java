package com.tesoreria.familia.core.port.in;

import java.util.List;
import com.tesoreria.apoderado.core.model.Apoderado;
import com.tesoreria.familia.core.model.Familia;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;

public interface GetFamiliaUseCase {
  Familia obtenerFamiliaPorId(Long familiaId);

  PageResponse<Familia> listarFamilia(PageRequest pageRequest);

  List<Apoderado> listarApoderadosPorAlumno(Long alumnoId);

}
