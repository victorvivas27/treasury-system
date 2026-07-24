package apoderado;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.tesoreria.apoderado.application.usecase.ApoderadoService;
import com.tesoreria.apoderado.core.exception.ApoderadoErrorCode;
import com.tesoreria.apoderado.core.model.Apoderado;
import com.tesoreria.apoderado.core.port.out.ApoderadoRepositoryOutPort;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;

@ExtendWith(MockitoExtension.class)
class ApoderadoServiceTest {

  private static final Long APODERADO_ID = 1L;
  private static final String APODERADO_CODIGO = "AP-ABC12345";

  @Mock
  private ApoderadoRepositoryOutPort repository;

  @InjectMocks
  private ApoderadoService service;

  private Apoderado mockApoderado;

  @BeforeEach
  void setUp() {
    mockApoderado = new Apoderado();
    mockApoderado.setApoderadoId(APODERADO_ID);
    mockApoderado.setCodigo(APODERADO_CODIGO);
    mockApoderado.setNombre("Juan Perez");
    mockApoderado.setEmail("test@mail.com");
    mockApoderado.setTelefono("+56912345678");
  }

  private PageResponse<Apoderado> mockPageResponse() {
    return new PageResponse<>(List.of(mockApoderado), 0, 10, 1, 1);
  }

  @Nested
  class FindTests {
    @Test
    void findByCodigo_deberiaRetornarApoderadoCuandoExiste() {
      when(repository.findByCodigo(APODERADO_CODIGO)).thenReturn(Optional.of(mockApoderado));

      Apoderado result = service.findByCodigo(APODERADO_CODIGO);

      assertNotNull(result);
      verify(repository).findByCodigo(APODERADO_CODIGO);
    }

    @Test
    void findByCodigo_deberiaLanzarExcepcionCuandoNoExiste() {
      when(repository.findByCodigo(APODERADO_CODIGO)).thenReturn(Optional.empty());

      DomainException ex = assertThrows(
          DomainException.class,
          () -> service.findByCodigo(APODERADO_CODIGO));

      assertEquals(ApoderadoErrorCode.NOT_FOUND.getStatus(), ex.getStatus());
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

      assertEquals(ApoderadoErrorCode.EMAIL_EXISTE.getStatus(), ex.getStatus());
    }

    @Test
    void create_deberiaGuardarCuandoEmailNoExiste() {
      when(repository.existsByEmail(mockApoderado.getEmail())).thenReturn(false);
      when(repository.save(mockApoderado)).thenReturn(mockApoderado);

      Apoderado resultado = service.create(mockApoderado);

      assertNotNull(resultado);
      verify(repository).save(mockApoderado);
    }
  }

  @Nested
  class UpdateTests {
    @Test
    void updateByCodigo_deberiaLanzarExcepcionCuandoNoExiste() {
      when(repository.findByCodigo(APODERADO_CODIGO)).thenReturn(Optional.empty());

      DomainException ex = assertThrows(
          DomainException.class,
          () -> service.updateByCodigo(APODERADO_CODIGO, mockApoderado));

      assertEquals(ApoderadoErrorCode.NOT_FOUND.getStatus(), ex.getStatus());
      verify(repository, never()).save(any(Apoderado.class));
    }

    @Test
    void updateByCodigo_deberiaActualizarCuandoExiste() {
      when(repository.findByCodigo(APODERADO_CODIGO)).thenReturn(Optional.of(mockApoderado));
      when(repository.save(mockApoderado)).thenReturn(mockApoderado);

      Apoderado resultado = service.updateByCodigo(APODERADO_CODIGO, mockApoderado);

      assertNotNull(resultado);
      assertEquals(mockApoderado, resultado);
      verify(repository).save(mockApoderado);
    }
  }

  @Nested
  class DeleteTests {
    @Test
    void deleteByCodigo_deberiaEliminarCuandoExiste() {
      when(repository.existsByCodigo(APODERADO_CODIGO)).thenReturn(true);

      service.deleteByCodigo(APODERADO_CODIGO);

      verify(repository).deleteByCodigo(APODERADO_CODIGO);
    }

    @Test
    void deleteByCodigo_deberiaLanzarExcepcionCuandoNoExiste() {
      when(repository.existsByCodigo(APODERADO_CODIGO)).thenReturn(false);

      DomainException ex = assertThrows(
          DomainException.class,
          () -> service.deleteByCodigo(APODERADO_CODIGO));

      assertNotNull(ex);
    }
  }
}
