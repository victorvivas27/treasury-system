package com.tesoreria.apoderado.core.port.in;
//import java.util.List;

import com.tesoreria.apoderado.core.model.Apoderado;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;

public interface GetApoderadoUseCase {

    Apoderado findByCodigo(String codigo);

    Apoderado findByEmail(String email);

    PageResponse<Apoderado> findAll(PageRequest pageRequest);

    //List<Apoderado> findByApoderadoIds(List<Long> apoderadoIds);
}
