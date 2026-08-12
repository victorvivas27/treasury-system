package com.tesoreria.familia.core.port.in;

import com.tesoreria.familia.core.model.Familia;
import com.tesoreria.familia.core.model.FamilyTreasuryData;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;

public interface GetFamiliaUseCase {
    Familia obtenerFamiliaPorId(Long familiaId);

    PageResponse<Familia> listarFamilia(PageRequest pageRequest);

    Familia obtenerFamiliaPorApoderadoId(Long apoderadoId);

    java.util.List<FamilyTreasuryData> obtenerDatosTesoreria();
}
