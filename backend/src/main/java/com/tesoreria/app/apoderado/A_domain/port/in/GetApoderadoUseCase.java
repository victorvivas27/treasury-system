package com.tesoreria.app.apoderado.A_domain.port.in;
import com.tesoreria.app.apoderado.A_domain.model.Apoderado;
import com.tesoreria.app.shared.domain.pagination.PageRequest;
import com.tesoreria.app.shared.domain.pagination.PageResponse;
public interface GetApoderadoUseCase {
    Apoderado findById(Long id);
    PageResponse<Apoderado> findAll(PageRequest pageRequest);
}
