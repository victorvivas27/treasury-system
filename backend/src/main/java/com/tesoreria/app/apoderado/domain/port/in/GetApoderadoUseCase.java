package com.tesoreria.app.apoderado.domain.port.in;


import com.tesoreria.app.apoderado.domain.model.Apoderado;

import java.util.List;
import java.util.Optional;

public interface GetApoderadoUseCase {
    Apoderado findById(Long id);
    List<Apoderado> findAll();
}
