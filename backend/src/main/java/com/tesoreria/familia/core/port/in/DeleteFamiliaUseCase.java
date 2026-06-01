package com.tesoreria.familia.core.port.in;

public interface DeleteFamiliaUseCase {
  void eliminarFamilia(Long familiaId);

  void desvincularApoderado(Long alumnoId, Long apoderadoId);
}
