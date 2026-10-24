package quality;

import com.google.cloud.storage.Bucket;
import com.google.cloud.storage.BucketInfo;
import com.google.cloud.storage.Storage;
import com.tesoreria.quality.application.QualityReportService;
import com.tesoreria.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mock.env.MockEnvironment;
import tools.jackson.databind.json.JsonMapper;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class QualityReportServiceTest {
    @TempDir Path directory;

    @SuppressWarnings("unchecked")
    private ObjectProvider<Storage> provider() { return mock(ObjectProvider.class); }

    @Test
    void readsOnlyCataloguedHtmlAndRejectsAlteredOrMissingContent() throws Exception {
        var service = new QualityReportService(provider(), JsonMapper.builder().build(),
                new MockEnvironment().withProperty("app.allure.directory", directory.toString()));
        assertTrue(service.catalog().reports().isEmpty());
        byte[] html = "<html>Allure privado</html>".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        String digest = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(html));
        Path report = directory.resolve("reports/example/index.html");
        Files.createDirectories(report.getParent()); Files.write(report, html);
        Files.writeString(directory.resolve("catalog.json"), "{\"configured\":true,\"reports\":[{\"id\":\"example\",\"sha256\":\"" + digest + "\"}]}");
        assertArrayEquals(html, service.report("example"));
        assertEquals(404, assertThrows(DomainException.class, () -> service.report("../example")).getStatus().value());
        Files.writeString(report, "alterado");
        assertEquals(503, assertThrows(DomainException.class, () -> service.report("example")).getStatus().value());
        Files.delete(report);
        assertEquals(404, assertThrows(DomainException.class, () -> service.report("example")).getStatus().value());
    }

    @Test
    void refusesCloudStorageWithoutExplicitPublicAccessPrevention() {
        var provider = provider(); var storage = mock(Storage.class); var bucket = mock(Bucket.class);
        when(provider.getIfAvailable()).thenReturn(storage);
        when(storage.get("private-reports")).thenReturn(bucket);
        when(bucket.getIamConfiguration()).thenReturn(BucketInfo.IamConfiguration.newBuilder()
                .setPublicAccessPrevention(BucketInfo.PublicAccessPrevention.INHERITED).build());
        var service = new QualityReportService(provider, JsonMapper.builder().build(),
                new MockEnvironment().withProperty("app.allure.bucket", "private-reports"));
        assertThrows(DomainException.class, service::catalog);
        verify(storage, never()).get("private-reports", "allure/v1/catalog.json");
    }
}
