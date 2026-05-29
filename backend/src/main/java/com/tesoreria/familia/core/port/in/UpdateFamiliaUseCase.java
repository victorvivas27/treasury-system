package com.tesoreria.familia.core.port.in;

import com.tesoreria.familia.core.model.Familia;

public interface UpdateFamiliaUseCase {
  Familia actualizar(Familia familia);

  Familia actualizar(Long id, Familia familia);
}
