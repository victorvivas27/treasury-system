package com.tesoreria.apoderado.core.port.in;
import com.tesoreria.apoderado.core.model.Apoderado;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;
public interface GetApoderadoUseCase {
    Apoderado findById(Long id);
    PageResponse<Apoderado> findAll(PageRequest pageRequest);
}
