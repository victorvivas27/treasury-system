package com.tesoreria.quality.application;

import com.google.cloud.storage.Blob;
import com.google.cloud.storage.BucketInfo.PublicAccessPrevention;
import com.google.cloud.storage.Storage;
import com.tesoreria.shared.domain.exception.DomainException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

@Service
public class QualityReportService {
    private static final String PREFIX = "allure/v1/";
    private final Storage storage;
    private final ObjectMapper mapper;
    private final String bucket;
    private final String directory;

    public QualityReportService(ObjectProvider<Storage> storage, ObjectMapper mapper, Environment environment) {
        this.storage = storage.getIfAvailable(); // Spring owns and closes the shared Storage bean.
        this.mapper = mapper;
        this.bucket = environment.getProperty("app.allure.bucket", "");
        this.directory = environment.getProperty("app.allure.directory", "");
    }

    public Catalog catalog() {
        if (bucket.isBlank() && directory.isBlank()) return new Catalog(false, List.of());
        try {
            byte[] content = read("catalog.json", 2_000_000);
            if (content.length == 0) return new Catalog(true, List.of());
            Catalog catalog = mapper.readValue(content, Catalog.class);
            if (catalog.reports() == null || catalog.reports().size() > 200) throw unavailable();
            for (Report report : catalog.reports()) {
                if (report == null || report.id() == null || report.sha256() == null
                        || !report.id().matches("[a-zA-Z0-9-]{1,140}") || !report.sha256().matches("[a-f0-9]{64}")) {
                    throw unavailable();
                }
            }
            return new Catalog(true, List.copyOf(catalog.reports()));
        } catch (IOException | IllegalArgumentException exception) {
            throw new DomainException("reports", HttpStatus.SERVICE_UNAVAILABLE, "Catálogo de reportes no disponible", exception);
        }
    }

    public byte[] report(String id) {
        Report entry = catalog().reports().stream().filter(report -> report.id().equals(id)).findFirst()
                .orElseThrow(() -> new DomainException("report", HttpStatus.NOT_FOUND, "Reporte no encontrado"));
        try {
            byte[] html = read("reports/" + entry.id() + "/index.html", 30_000_000);
            if (html.length == 0) throw new DomainException("report", HttpStatus.NOT_FOUND, "Reporte no disponible o expirado");
            String digest = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(html));
            if (!digest.equals(entry.sha256())) throw unavailable();
            return html;
        } catch (IOException | NoSuchAlgorithmException exception) {
            throw new DomainException("report", HttpStatus.SERVICE_UNAVAILABLE, "No se pudo leer el reporte", exception);
        }
    }

    private byte[] read(String key, long maximum) throws IOException {
        if (!bucket.isBlank()) {
            if (storage == null) throw unavailable();
            // Require explicit prevention of public access, including object ACLs.
            var info = storage.get(bucket);
            if (info == null || info.getIamConfiguration() == null
                    || info.getIamConfiguration().getPublicAccessPrevention() != PublicAccessPrevention.ENFORCED) throw unavailable();
            Blob blob = storage.get(bucket, PREFIX + key);
            if (blob == null) return new byte[0];
            if (blob.getSize() > maximum) throw unavailable();
            return blob.getContent();
        }
        Path root = Path.of(directory).toRealPath();
        Path file = root.resolve(key);
        if (!Files.exists(file)) return new byte[0];
        Path actual = file.toRealPath();
        if (!actual.startsWith(root) || Files.size(actual) > maximum) throw unavailable();
        return Files.readAllBytes(actual);
    }

    private static DomainException unavailable() {
        return new DomainException("reports", HttpStatus.SERVICE_UNAVAILABLE, "Almacenamiento privado de reportes no disponible");
    }

    public record Catalog(boolean configured, List<Report> reports) { }
    public record Report(String id, String application, String suite, String generatedAt, String sha,
                         String releaseSha, String fingerprint, String workflowRunId, String sha256,
                         Map<String, Integer> tests, Map<String, Metric> coverage) { }
    public record Metric(int covered, int total, double percent) { }
}
