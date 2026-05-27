package com.tesoreria.apoderado.core.port.in;

import com.tesoreria.apoderado.core.model.Apoderado;

public interface CreateApoderadoUseCase {
    Apoderado create(Apoderado apoderado);
}
