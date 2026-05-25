package com.tesoreria.app.apoderado.application.usecase;
import com.tesoreria.app.apoderado.domain.exception.ApoderadoErrorCode;
import com.tesoreria.app.apoderado.domain.model.Apoderado;
import com.tesoreria.app.apoderado.domain.port.in.CreateApoderadoUseCase;
import com.tesoreria.app.apoderado.domain.port.in.DeleteApoderadoUseCase;
import com.tesoreria.app.apoderado.domain.port.in.GetApoderadoUseCase;
import com.tesoreria.app.apoderado.domain.port.in.UpdateApoderadoUseCase;
import com.tesoreria.app.apoderado.domain.port.out.ApoderadoRepositoryOutPort;
import com.tesoreria.app.shared.domain.exception.DomainException;
import com.tesoreria.app.shared.domain.pagination.PageRequest;
import com.tesoreria.app.shared.domain.pagination.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;


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
