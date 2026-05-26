package com.tesoreria.app.apoderado.domain.port.in;


import com.tesoreria.app.apoderado.domain.model.Apoderado;
import com.tesoreria.app.shared.domain.pagination.PageRequest;
import com.tesoreria.app.shared.domain.pagination.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface GetApoderadoUseCase {
    Apoderado findById(Long id);
    PageResponse<Apoderado> findAll(PageRequest pageRequest);
}
