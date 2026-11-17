package architecture;

import com.tesoreria.architecture.application.ArchitectureCatalogService;
import com.tesoreria.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

class ArchitectureCatalogServiceTest {
    @Test
    void allPublishedDiagramsArePackagedAndArbitraryPathsAreRejected() throws Exception {
        var service = new ArchitectureCatalogService();
        assertEquals(12, service.catalog().diagrams().size());
        assertEquals(6, service.catalog().diagrams().stream()
                .filter(diagram -> diagram.moduleId().equals("12-operations")).count());
        for (var diagram : service.catalog().diagrams()) {
            String html = new String(service.diagram(diagram.id()), StandardCharsets.UTF_8);
            assertTrue(html.contains("<html"));
            assertTrue(html.contains("archify"));
            if (diagram.id().startsWith("ci-cd-")) {
                assertEquals("12-operations", diagram.moduleId());
                assertEquals("2026-11-16", diagram.generatedAt());
                assertTrue(html.contains(diagram.revision()));
            } else {
                assertEquals("01-auth-security", diagram.moduleId());
                assertEquals("2026-11-17", diagram.generatedAt());
                assertEquals(service.catalog().revision(), diagram.revision());
                assertTrue(html.contains(diagram.revision()));
            }
        }
        assertThrows(DomainException.class, () -> service.diagram("../application"));
        assertThrows(DomainException.class, () -> service.diagram("snapshot.json"));
    }
}
