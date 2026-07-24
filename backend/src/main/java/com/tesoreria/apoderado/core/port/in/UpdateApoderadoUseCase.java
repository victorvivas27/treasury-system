package com.tesoreria.apoderado.core.port.in;


import com.tesoreria.apoderado.core.model.Apoderado;

public interface UpdateApoderadoUseCase {

  Apoderado updateByCodigo(String codigo,Apoderado apoderado);
}
