package com.tesoreria.app.apoderado.domain.port.in;


import com.tesoreria.app.apoderado.domain.model.Apoderado;

import java.util.List;

public interface GetApoderadoUseCase {
    Apoderado findById(Long id);
    List<Apoderado> findAll(int page, int size);
}
