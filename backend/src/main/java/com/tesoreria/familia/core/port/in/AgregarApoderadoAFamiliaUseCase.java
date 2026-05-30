package com.tesoreria.familia.core.port.in;

public interface AgregarApoderadoAFamiliaUseCase {
    // Caso de uso especializado de grano fino
    void ejecutar(Long alumnoId, Long nuevoApoderadoId);
}
