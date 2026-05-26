package com.tesoreria.app.apoderado;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.tesoreria.app.apoderado.A_domain.exception.ApoderadoErrorCode;
import com.tesoreria.app.apoderado.A_domain.model.Apoderado;
import com.tesoreria.app.apoderado.A_domain.port.out.ApoderadoRepositoryOutPort;
import com.tesoreria.app.apoderado.B_application.usecase.ApoderadoService;
import com.tesoreria.app.shared.domain.exception.DomainException;
import com.tesoreria.app.shared.domain.pagination.PageRequest;
import com.tesoreria.app.shared.domain.pagination.PageResponse;

@ExtendWith(MockitoExtension.class)
public class ApoderadoServiceTest {

  @Mock
  private ApoderadoRepositoryOutPort repository;

  @InjectMocks
  private ApoderadoService service;
  private Apoderado mockApoderado;
  private static final Long APODERADO_ID = 1L;

  @BeforeEach
  void setUp() {
    mockApoderado = new Apoderado();
    mockApoderado.setId(APODERADO_ID);
    mockApoderado.setNombre("JUAN PEREZ");
    mockApoderado.setEmail("test@mail.com");
  }

  private PageResponse<Apoderado> mockPageResponse() {
    return new PageResponse<>(
        List.of(mockApoderado),
        0,
        10,
        1,
        1);
  }

  @Nested
  class FindTests {
    @Test
    void findById_deberiaRetornarApoderadoCuandoExiste() {
      when(repository.findById(APODERADO_ID)).thenReturn(Optional.of(mockApoderado));
      Apoderado result = service.findById(APODERADO_ID);
      assertNotNull(result);
      verify(repository).findById(APODERADO_ID);
    }

    @Test
    void findById_deberiaLanzarExcepcionCuandoNoExiste() {
      when(repository.findById(APODERADO_ID)).thenReturn(Optional.empty());
      DomainException ex = assertThrows(DomainException.class, () -> service.findById(APODERADO_ID));
      assertEquals(ApoderadoErrorCode.NOT_FOUND.getCodigo(), ex.getErrorCode());
    }

    @Test
    void findAll_deberiaRetornarPageResponse() {
      PageRequest pageRequest = new PageRequest(0, 10, null, null);
      PageResponse<Apoderado> pageResponse = mockPageResponse();

      when(repository.findAll(pageRequest)).thenReturn(pageResponse);

      PageResponse<Apoderado> resultado = service.findAll(pageRequest);

      assertNotNull(resultado);
      assertEquals(1, resultado.content().size());
      assertEquals(0, resultado.page());
      assertEquals(10, resultado.size());
      assertEquals(1, resultado.totalPages());
      assertEquals(1, resultado.totalElements());
      verify(repository).findAll(pageRequest);
    }
  }

  @Nested
  class CreateTests {
    @Test
    void create_deberiaLanzarExcepcionCuandoEmailYaExiste() {
      when(repository.existsByEmail("test@mail.com")).thenReturn(true);
      DomainException ex = assertThrows(DomainException.class, () -> service.create(mockApoderado));
      assertEquals(ApoderadoErrorCode.EMAIL_EXISTE.getCodigo(), ex.getErrorCode());
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
  class UpdateTests {
    @Test
    void update_deberiaLanzarExcepcionCuandoNoExiste() {
      mockApoderado.setId(APODERADO_ID);
      when(repository.existsById(mockApoderado.getId())).thenReturn(false);
      DomainException ex = assertThrows(
          DomainException.class,
          () -> service.update(mockApoderado));
      assertEquals(ApoderadoErrorCode.NOT_FOUND.getCodigo(), ex.getErrorCode());
      verify(repository, never()).save(any(Apoderado.class));
    }

    @Test
    void update_deberiaActualizarCuandoExiste() {
      mockApoderado.setId(APODERADO_ID);
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
      when(repository.existsById(APODERADO_ID)).thenReturn(true);
      service.deleteById(APODERADO_ID);
      verify(repository).deleteById(APODERADO_ID);
    }

    @Test
    void deleteById_deberiaLanzarExcepcionCuandoNoExiste() {
      when(repository.existsById(APODERADO_ID)).thenReturn(false);
      DomainException ex = assertThrows(
          DomainException.class,
          () -> service.deleteById(APODERADO_ID));
      assertNotNull(ex);
    }
  }

}
