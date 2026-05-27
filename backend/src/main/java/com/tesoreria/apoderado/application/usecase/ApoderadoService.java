package com.tesoreria.apoderado.application.usecase;
import com.tesoreria.apoderado.core.exception.ApoderadoErrorCode;
import com.tesoreria.apoderado.core.model.Apoderado;
import com.tesoreria.apoderado.core.port.in.CreateApoderadoUseCase;
import com.tesoreria.apoderado.core.port.in.DeleteApoderadoUseCase;
import com.tesoreria.apoderado.core.port.in.GetApoderadoUseCase;
import com.tesoreria.apoderado.core.port.in.UpdateApoderadoUseCase;
import com.tesoreria.apoderado.core.port.out.ApoderadoRepositoryOutPort;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;


public class ApoderadoService implements
        CreateApoderadoUseCase,
        GetApoderadoUseCase,
        UpdateApoderadoUseCase,
        DeleteApoderadoUseCase {

    private final ApoderadoRepositoryOutPort repository;

    public ApoderadoService(ApoderadoRepositoryOutPort repository) {
        this.repository = repository;
    }

    @Override
    public Apoderado create(Apoderado apoderado) {
        if (repository.existsByEmail(apoderado.getEmail())) {
            throw new DomainException(
                    ApoderadoErrorCode.EMAIL_EXISTE.getCodigo(),
                    ApoderadoErrorCode.EMAIL_EXISTE.getField(),
                    ApoderadoErrorCode.EMAIL_EXISTE.getStatus(),
                    "El email " + apoderado.getEmail() + " ya está registrado"
            );
        }
        return repository.save(apoderado);
    }

    @Override
    public Apoderado findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new DomainException(
                        ApoderadoErrorCode.NOT_FOUND.getCodigo(),
                        ApoderadoErrorCode.NOT_FOUND.getField(),
                        ApoderadoErrorCode.NOT_FOUND.getStatus(),
                        "Apoderado con id " + id + " no encontrado"
                ));
    }

    @Override
    public PageResponse<Apoderado> findAll(PageRequest pageRequest) {
        return repository.findAll(pageRequest);
    }


    @Override
    public Apoderado update(Apoderado apoderado) {
        if (!repository.existsById(apoderado.getId())) {
            throw new DomainException(
                    ApoderadoErrorCode.NOT_FOUND.getCodigo(),
                    ApoderadoErrorCode.NOT_FOUND.getField(),
                    ApoderadoErrorCode.NOT_FOUND.getStatus(),
                    "Apoderado con id " + apoderado.getId() + " no encontrado"
            );
        }
        return repository.save(apoderado);
    }

    @Override
    public void deleteById(Long id) {
        if (!repository.existsById(id)) {
            throw new DomainException(
                    ApoderadoErrorCode.NOT_FOUND.getCodigo(),
                    ApoderadoErrorCode.NOT_FOUND.getField(),
                    ApoderadoErrorCode.NOT_FOUND.getStatus(),
                    "Apoderado con id " + id + " no encontrado"
            );
        }
        repository.deleteById(id);
    }
}
