package com.tesoreria.alumno.application.usecase;

import com.tesoreria.alumno.core.exception.AlumnoErrorCode;
import com.tesoreria.alumno.core.model.Alumno;
import com.tesoreria.alumno.core.port.in.CreateAlumnoUseCase;
import com.tesoreria.alumno.core.port.in.DeleteAlumnoUseCase;
import com.tesoreria.alumno.core.port.in.GetAlumnoUseCase;
import com.tesoreria.alumno.core.port.in.UpdateAlumnoUseCase;
import com.tesoreria.alumno.core.port.out.AlumnoRepositoryOutPort;
import com.tesoreria.familia.core.port.out.FamiliaRepositoryOutPort;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;
import org.springframework.transaction.annotation.Transactional;

public class AlumnoService implements
        CreateAlumnoUseCase,
        GetAlumnoUseCase,
        UpdateAlumnoUseCase,
        DeleteAlumnoUseCase {

    private static final String CODE_FORMAT = "^AL-[A-Z0-9]{8}$";
    private final AlumnoRepositoryOutPort repository;
    private final FamiliaRepositoryOutPort familiaRepository;

    public AlumnoService(
            AlumnoRepositoryOutPort repository,
            FamiliaRepositoryOutPort familiaRepository) {
        this.repository = repository;
        this.familiaRepository = familiaRepository;
    }

    @Override
    public Alumno create(Alumno alumno) {
        return repository.save(alumno);
    }

    @Override
    public Alumno findByCodigo(String codigo) {
        if (codigo == null || !codigo.matches(CODE_FORMAT)) {
            throw invalidCodeFormat();
        }
        return repository.findByCodigo(codigo)
                .orElseThrow(() -> alumnoNoEncontrado(codigo));
    }

    @Override
    public PageResponse<Alumno> findAll(PageRequest pageRequest) {
        return repository.findAll(pageRequest);
    }

    @Override
    @Transactional
    public Alumno update(Alumno alumno) {
        if (alumno.getCodigo() == null || !alumno.getCodigo().matches(CODE_FORMAT)) {
            throw invalidCodeFormat();
        }
        Alumno existing = repository.findByCodigo(alumno.getCodigo())
                .orElseThrow(() -> alumnoNoEncontrado(alumno.getCodigo()));
        existing.setNombre(alumno.getNombre());
        existing.setCurso(alumno.getCurso());
        existing.setObservacion(alumno.getObservacion());
        existing.setGenero(alumno.getGenero());
        return repository.save(existing);
    }

    @Transactional
    public Alumno cambiarEstado(String codigo, boolean activo) {
        Alumno alumno = findByCodigo(codigo);
        alumno.setActivo(activo);
        return repository.save(alumno);
    }

    @Override
    @Transactional
    public void deleteByCodigo(String codigo) {
        if (codigo == null || !codigo.matches(CODE_FORMAT)) {
            throw invalidCodeFormat();
        }
        Alumno alumno = repository.findByCodigo(codigo)
                .orElseThrow(() -> alumnoNoEncontrado(codigo));
        if (familiaRepository.existsByAlumnoId(alumno.getAlumnoId())) {
            throw new DomainException(
                    AlumnoErrorCode.FAMILIA_ASIGNADA.getField(),
                    AlumnoErrorCode.FAMILIA_ASIGNADA.getStatus(),
                    "No se puede eliminar el alumno porque pertenece a una familia. "
                            + "Primero debe desvincularlo de la familia.");
        }
        repository.deleteByCodigo(codigo);
    }

    private DomainException alumnoNoEncontrado(String codigo) {
        return new DomainException(
                AlumnoErrorCode.NOT_FOUND.getField(),
                AlumnoErrorCode.NOT_FOUND.getStatus(),
                "Alumno con codigo " + codigo + " no encontrado");
    }

    private DomainException invalidCodeFormat() {
        return new DomainException(
                AlumnoErrorCode.INVALID_FORMAT.getField(),
                AlumnoErrorCode.INVALID_FORMAT.getStatus(),
                "Formato de código inválido. Debe ser AL-XXXXXXXX");
    }

    public Alumno findById(Long alumnoId) {
        return repository.findById(alumnoId)
                .orElseThrow(() -> alumnoNoEncontrado(String.valueOf(alumnoId)));
    }


}
