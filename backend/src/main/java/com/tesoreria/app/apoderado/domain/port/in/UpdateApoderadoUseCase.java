package com.tesoreria.app.apoderado.domain.port.in;


import com.tesoreria.app.apoderado.domain.model.Apoderado;

public interface UpdateApoderadoUseCase {
    Apoderado update(Apoderado apoderado);
}
