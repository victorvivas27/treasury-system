package com.tesoreria.treasury.config;

import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
import com.tesoreria.treasury.core.port.out.FileStorageService;
import com.tesoreria.treasury.infrastructure.adapter.out.storage.GoogleCloudStorageService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DocumentStorageConfig {
    @Bean
    @ConditionalOnProperty(name = "app.storage.gcs.enabled", havingValue = "true")
    Storage googleStorage() {
        return StorageOptions.getDefaultInstance().getService();
    }

    @Bean
    @ConditionalOnProperty(name = "app.storage.gcs.enabled", havingValue = "true")
    FileStorageService fileStorageService(Storage storage,
            org.springframework.core.env.Environment environment) {
        String bucket = environment.getRequiredProperty("app.storage.gcs.bucket-name");
        if (bucket.isBlank()) throw new IllegalStateException("GCS_BUCKET_NAME es obligatorio");
        return new GoogleCloudStorageService(storage, bucket);
    }
}
