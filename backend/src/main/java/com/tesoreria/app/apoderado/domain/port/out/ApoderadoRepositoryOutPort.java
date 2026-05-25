package com.tesoreria.app.apoderado.domain.port.out;


import com.tesoreria.app.apoderado.domain.model.Apoderado;
import com.tesoreria.app.shared.domain.pagination.PageRequest;
import com.tesoreria.app.shared.domain.pagination.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface ApoderadoRepositoryOutPort {

    Apoderado save(Apoderado apoderado);

    Optional<Apoderado> findById(Long id);

    PageResponse<Apoderado> findAll(PageRequest pageRequest);

    void deleteById(Long id);

    boolean existsByEmail(String email);

    boolean existsById(Long id);

}
