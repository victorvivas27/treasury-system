package com.tesoreria.apoderado.core.port.in;
import java.util.List;

import com.tesoreria.apoderado.core.model.Apoderado;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;
public interface GetApoderadoUseCase {
    Apoderado findById(Long apoderadoId);

    PageResponse<Apoderado> findAll(PageRequest pageRequest);

    List<Apoderado> findByIds(List<Long> apoderadoIds);
}
