package com.tesoreria.familia.core.port.in;

import com.tesoreria.familia.core.model.Familia;

public interface UpdateFamiliaUseCase {
  Familia actualizarFamilia(Long familiaId, Familia familia);
}
