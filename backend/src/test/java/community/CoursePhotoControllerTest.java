package community;

import com.tesoreria.community.application.usecase.CoursePhotoService;
import com.tesoreria.community.infrastructure.web.CoursePhotoController;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CoursePhotoControllerTest {
    @Test
    void privateImageMustNotBeStoredInSharedOrBrowserCaches() {
        CoursePhotoService service = mock(CoursePhotoService.class);
        when(service.content(7L)).thenReturn(new CoursePhotoService.ImageContent(new byte[]{1, 2}, "image/png"));
        var response = new CoursePhotoController(service).content(7L);
        assertEquals("no-store", response.getHeaders().getFirst(HttpHeaders.CACHE_CONTROL));
        assertArrayEquals(new byte[]{1, 2}, response.getBody());
    }
}
