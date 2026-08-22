package community;

import com.tesoreria.community.application.usecase.CoursePhotoService;
import com.tesoreria.community.infrastructure.persistence.CoursePhotoEntity;
import com.tesoreria.community.infrastructure.persistence.CoursePhotoJpaRepository;
import com.tesoreria.treasury.core.port.out.FileStorageService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CoursePhotoServiceTest {
    @Mock private CoursePhotoJpaRepository photos;
    @Mock private ObjectProvider<FileStorageService> storageProvider;
    @Mock private FileStorageService storage;
    @Mock private Environment environment;
    private CoursePhotoService service;

    @BeforeEach
    void setUp() {
        lenient().when(environment.getProperty("app.storage.gcs.max-file-size-mb", Long.class, 10L))
                .thenReturn(10L);
        lenient().when(storageProvider.getIfAvailable()).thenReturn(storage);
        service = new CoursePhotoService(photos, storageProvider, environment);
    }

    @Test
    void uploadDeberiaGuardarImagenValida() {
        when(photos.count()).thenReturn(0L);
        when(photos.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        var result = service.upload(png(), "  Paseo del curso  ");
        assertAll(() -> assertEquals("Paseo del curso", result.caption()),
                () -> assertEquals(0, result.displayOrder()),
                () -> assertTrue(result.imageUrl().startsWith("/community/gallery/")));
        verify(storage).upload(startsWith("comunidad/fotos/"), any(byte[].class), eq("image/png"));
    }

    @Test
    void uploadDeberiaLimitarGaleriaYTamanio() {
        when(photos.count()).thenReturn(3L);
        ResponseStatusException full = assertThrows(ResponseStatusException.class,
                () -> service.upload(png(), null));
        assertEquals(HttpStatus.CONFLICT, full.getStatusCode());

        when(photos.count()).thenReturn(0L);
        MockMultipartFile large = new MockMultipartFile("file", "foto.png", "image/png",
                new byte[10 * 1024 * 1024 + 1]);
        ResponseStatusException oversized = assertThrows(ResponseStatusException.class,
                () -> service.upload(large, null));
        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, oversized.getStatusCode());
    }

    @Test
    void uploadDeberiaRechazarArchivosInvalidos() {
        when(photos.count()).thenReturn(0L);
        assertAll(
                () -> assertThrows(ResponseStatusException.class, () -> service.upload(null, null)),
                () -> assertThrows(ResponseStatusException.class, () -> service.upload(
                        new MockMultipartFile("file", "foto.gif", "image/gif", "GIF8".getBytes()), null)),
                () -> assertThrows(ResponseStatusException.class, () -> service.upload(
                        new MockMultipartFile("file", "foto.png", "image/png", "texto".getBytes()), null)),
                () -> assertThrows(ResponseStatusException.class, () -> service.upload(png(), "x".repeat(161))));
    }

    @Test
    void uploadDeberiaLimpiarStorageSiFallaPersistencia() {
        when(photos.count()).thenReturn(0L);
        when(photos.saveAndFlush(any())).thenThrow(new IllegalStateException("db"));
        assertThrows(IllegalStateException.class, () -> service.upload(png(), null));
        verify(storage).delete(startsWith("comunidad/fotos/"));
    }

    @Test
    void listYUpdateDeberianRetornarVistasOrdenadas() {
        CoursePhotoEntity entity = photo();
        when(photos.findAllByOrderByDisplayOrderAscIdAsc()).thenReturn(List.of(entity));
        when(photos.findById(1L)).thenReturn(Optional.of(entity));
        when(photos.save(entity)).thenReturn(entity);
        assertEquals(1, service.list().size());
        var updated = service.update(1L, " Nueva descripción ", 9);
        assertAll(() -> assertEquals("Nueva descripción", updated.caption()),
                () -> assertEquals(2, updated.displayOrder()));
    }

    @Test
    void contentYDeleteDeberianUsarElObjetoAlmacenado() {
        CoursePhotoEntity entity = photo();
        when(photos.findById(1L)).thenReturn(Optional.of(entity));
        when(storage.read("comunidad/fotos/foto.png"))
                .thenReturn(new FileStorageService.StoredContent(new byte[]{1, 2}, "image/png"));
        var content = service.content(1L);
        assertAll(() -> assertArrayEquals(new byte[]{1, 2}, content.bytes()),
                () -> assertEquals("image/png", content.contentType()));
        service.delete(1L);
        verify(storage).delete("comunidad/fotos/foto.png");
        verify(photos).delete(entity);
    }

    @Test
    void operacionesDeberianInformarFotoOStorageAusente() {
        when(photos.findById(9L)).thenReturn(Optional.empty());
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> service.update(9L, null, 0)).getStatusCode());
        when(photos.count()).thenReturn(0L);
        when(storageProvider.getIfAvailable()).thenReturn(null);
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, assertThrows(ResponseStatusException.class,
                () -> service.upload(png(), null)).getStatusCode());
    }

    private MockMultipartFile png() {
        return new MockMultipartFile("file", "foto.png", "image/png",
                new byte[]{(byte) 0x89, 'P', 'N', 'G', 1, 2, 3});
    }

    private CoursePhotoEntity photo() {
        CoursePhotoEntity entity = new CoursePhotoEntity();
        entity.setCaption("Recuerdo");
        entity.setDisplayOrder(0);
        entity.setStorageObjectName("comunidad/fotos/foto.png");
        entity.setContentType("image/png");
        return entity;
    }
}
