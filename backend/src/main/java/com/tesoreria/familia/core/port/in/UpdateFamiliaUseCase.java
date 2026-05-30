package com.tesoreria.familia.core.port.in;

import com.tesoreria.familia.core.model.Familia;

public interface UpdateFamiliaUseCase {
// Se mantiene únicamente la firma explícita para evitar ambigüedades en el adaptador de entrada (Controller)
  Familia actualizar(Long id, Familia familia);
}
