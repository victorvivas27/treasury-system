package com.tesoreria.app.apoderado.domain.port.in;

import com.tesoreria.app.apoderado.domain.model.Apoderado;

public interface CreateApoderadoUseCase {
    Apoderado create(Apoderado apoderado);
}
