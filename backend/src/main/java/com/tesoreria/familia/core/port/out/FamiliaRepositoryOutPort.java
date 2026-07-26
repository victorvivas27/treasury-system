package com.tesoreria.familia.core.port.out;

import com.tesoreria.familia.core.model.Familia;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;

import java.util.Optional;

public interface FamiliaRepositoryOutPort {

    Familia save(Familia familia);

    Optional<Familia> findById(Long familiaId);

    Optional<Familia> findDetalleById(Long familiaId);

    Optional<Familia> findByAlumnoId(Long alumnoId);

    PageResponse<Familia> findAll(PageRequest pageRequest);

    void delete(Familia familia);

    void deleteById(Long familiaId);

    boolean existsById(Long familiaId);

    boolean existsByAlumnoId(Long alumnoId);
}
