package com.tesoreria.familia.application.usecase;

import com.tesoreria.familia.core.exception.FamiliaErrorCode;
import com.tesoreria.familia.core.model.Familia;
import com.tesoreria.familia.core.port.in.CreateFamiliaUseCase;
import com.tesoreria.familia.core.port.in.DeleteFamiliaUseCase;
import com.tesoreria.familia.core.port.in.GetFamiliaUseCase;
import com.tesoreria.familia.core.port.in.UpdateFamiliaUseCase;
import com.tesoreria.familia.core.port.out.FamiliaRepositoryOutPort;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;

public class FamiliaService implements
        CreateFamiliaUseCase,
        GetFamiliaUseCase,
        UpdateFamiliaUseCase,
        DeleteFamiliaUseCase {

    private final FamiliaRepositoryOutPort familiaRepository;

    public FamiliaService(FamiliaRepositoryOutPort familiaRepository) {
        this.familiaRepository = familiaRepository;
    }

    @Override
    public Familia crearFamilia(Familia familia) {
        if (familiaRepository.existsByAlumnoId(familia.getAlumnoId())) {
            throw new DomainException(
                    FamiliaErrorCode.DUPLICADO.getField(),
                    FamiliaErrorCode.DUPLICADO.getStatus(),
                    "El alumno ya tiene una familia asignada");
        }

        return familiaRepository.save(familia);
    }

    @Override
    public Familia obtenerFamiliaPorId(Long id) {
        return familiaRepository.findById(id)
                .orElseThrow(() -> familiaNoEncontrada("No se encontro la familia con el ID provisto"));
    }

    @Override
    public PageResponse<Familia> listarFamilia(PageRequest pageRequest) {
        return familiaRepository.findAll(pageRequest);
    }

    @Override
    public Familia actualizarFamilia(Long id, Familia familia) {
        Familia familiaExistente = obtenerFamiliaPorId(id);
        familiaExistente.setAlumnoId(familia.getAlumnoId());
        familiaExistente.setApoderados(familia.getApoderados());
        familiaExistente.setObservaciones(familia.getObservaciones());
        return familiaRepository.save(familiaExistente);
    }

    @Override
    public void eliminarFamilia(Long id) {
        if (!familiaRepository.existsById(id)) {
            throw familiaNoEncontrada("No se puede eliminar: la familia no existe");
        }
        familiaRepository.deleteById(id);
    }

    private DomainException familiaNoEncontrada(String message) {
        return new DomainException(
                FamiliaErrorCode.NOT_FOUND.getField(),
                FamiliaErrorCode.NOT_FOUND.getStatus(),
                message);
    }
}
