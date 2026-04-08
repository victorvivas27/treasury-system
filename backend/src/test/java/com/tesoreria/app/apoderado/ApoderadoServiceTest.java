package com.tesoreria.app.apoderado;

import com.tesoreria.app.apoderado.application.usecase.ApoderadoService;
import com.tesoreria.app.apoderado.domain.exception.ApoderadoErrorCode;
import com.tesoreria.app.apoderado.domain.model.Apoderado;
import com.tesoreria.app.apoderado.domain.port.out.ApoderadoRepositoryOutPort;
import com.tesoreria.app.shared.domain.exception.DomainException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ApoderadoServiceTest {

    @Mock
    private ApoderadoRepositoryOutPort repository;

    @InjectMocks
    private ApoderadoService service;

    private Apoderado mockApoderado;

    Long id;

    @BeforeEach
    void setUp() {
        mockApoderado = new Apoderado();
        mockApoderado.setId(1L);
        mockApoderado.setNombre("JUAN PEREZ");
        mockApoderado.setEmail("test@mail.com");
    }

    @Nested
    class FindTests {
        @Test
        void findById_deberiaRetornarApoderadoCuandoExiste() {
            when(repository.findById(anyLong())).thenReturn(Optional.of(mockApoderado));
            Apoderado result = service.findById(anyLong());
            assertNotNull(result);
            verify(repository).findById(anyLong());
        }

        @Test
        void findById_deberiaLanzarExcepcionCuandoNoExiste() {
            when(repository.findById(anyLong())).thenReturn(Optional.empty());
            DomainException ex = assertThrows(DomainException.class, () -> service.findById(anyLong()));
            assertEquals(ApoderadoErrorCode.NOT_FOUND, ex.getErrorCode());
        }

        @Test
        void findAll_deberiaRetornarLista() {
            List<Apoderado> lista = List.of(new Apoderado());

            when(repository.findAll()).thenReturn(lista);

            List<Apoderado> resultado = service.findAll();

            assertNotNull(resultado);
            assertEquals(1, resultado.size());
            verify(repository).findAll();
        }
    }

    @Nested
    class CreateTests {
        @Test
        void create_deberiaLanzarExcepcionCuandoEmailYaExiste() {
            when(repository.existsByEmail("test@mail.com")).thenReturn(true);
            DomainException ex = assertThrows(DomainException.class, () -> service.create(mockApoderado));
            assertEquals(ApoderadoErrorCode.EMAIL_EXISTE, ex.getErrorCode());
        }

        @Test
        void create_deberiaGuardarCuandoEmailNoExiste() {
            when(repository.existsByEmail(mockApoderado.getEmail()))
                    .thenReturn(false);
            when(repository.save(mockApoderado))
                    .thenReturn(mockApoderado);
            Apoderado resultado = service.create(mockApoderado);
            assertNotNull(resultado);
            verify(repository).save(mockApoderado);
        }
    }

    @Nested
    class UpdateTests{
        @Test
        void update_deberiaLanzarExcepcionCuandoNoExiste() {
            mockApoderado.setId(1L);
            when(repository.existsById(mockApoderado.getId())).thenReturn(false);
            DomainException ex = assertThrows(
                    DomainException.class,
                    () -> service.update(mockApoderado)
            );
            assertEquals(ApoderadoErrorCode.NOT_FOUND, ex.getErrorCode());
            verify(repository, never()).save(any(Apoderado.class));
        }

        @Test
        void update_deberiaActualizarCuandoExiste() {
            mockApoderado.setId(1L);
            when(repository.existsById(mockApoderado.getId())).thenReturn(true);
            when(repository.save(mockApoderado)).thenReturn(mockApoderado);
            Apoderado resultado = service.update(mockApoderado);
            assertNotNull(resultado);
            assertEquals(mockApoderado, resultado);
            verify(repository).save(mockApoderado);
        }
    }

    @Nested
    class DeleteTests {
        @Test
        void deleteById_deberiaEliminarCuandoExiste() {
            when(repository.existsById(anyLong())).thenReturn(true);
            service.deleteById(anyLong());
            verify(repository).deleteById(anyLong());
        }

        @Test
        void deleteById_deberiaLanzarExcepcionCuandoNoExiste() {
            when(repository.existsById(anyLong())).thenReturn(false);
            assertThrows(DomainException.class, () -> service.deleteById(anyLong()));
        }
    }

}
