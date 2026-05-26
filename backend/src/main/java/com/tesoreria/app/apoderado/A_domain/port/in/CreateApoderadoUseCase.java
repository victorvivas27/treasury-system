package com.tesoreria.app.apoderado.A_domain.port.in;

import com.tesoreria.app.apoderado.A_domain.model.Apoderado;

public interface CreateApoderadoUseCase {
    Apoderado create(Apoderado apoderado);
}
