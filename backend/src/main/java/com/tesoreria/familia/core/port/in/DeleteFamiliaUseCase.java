package com.tesoreria.familia.core.port.in;

public interface DeleteFamiliaUseCase {
// Elimina todo el grupo familiar y sus vínculos
  void eliminar(Long id);

  // CAMBIADO: Ahora la semántica correcta es desvincular un apoderado específico de la familia del alumno
  void desvincularApoderado(Long alumnoId, Long apoderadoId);
}
