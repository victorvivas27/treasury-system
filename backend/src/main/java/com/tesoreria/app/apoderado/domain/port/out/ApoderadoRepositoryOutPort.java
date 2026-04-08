package com.tesoreria.app.apoderado.domain.port.out;


import com.tesoreria.app.apoderado.domain.model.Apoderado;

import java.util.List;
import java.util.Optional;

public interface ApoderadoRepositoryOutPort {

    Apoderado save(Apoderado apoderado);

    Optional<Apoderado> findById(Long id);;

    List<Apoderado> findAll();

    void deleteById(Long id);

    boolean existsByEmail(String email);

    boolean existsById(Long id);

}
