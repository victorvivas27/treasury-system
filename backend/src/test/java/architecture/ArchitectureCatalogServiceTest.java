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
        assertEquals(6, service.catalog().diagrams().size());
        for (var diagram : service.catalog().diagrams()) {
            String html = new String(service.diagram(diagram.id()), StandardCharsets.UTF_8);
            assertTrue(html.contains("<html"));
            assertTrue(html.contains("archify"));
        }
        assertThrows(DomainException.class, () -> service.diagram("../application"));
        assertThrows(DomainException.class, () -> service.diagram("snapshot.json"));
    }
}
