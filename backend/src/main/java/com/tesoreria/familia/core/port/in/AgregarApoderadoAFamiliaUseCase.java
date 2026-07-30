package com.tesoreria.familia.core.port.in;

public interface AgregarApoderadoAFamiliaUseCase {
    void ejecutar(Long familiaId, Long apoderadoId);
}
