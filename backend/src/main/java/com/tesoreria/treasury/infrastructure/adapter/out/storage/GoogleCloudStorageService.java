package com.tesoreria.treasury.infrastructure.adapter.out.storage;

import com.google.cloud.storage.Blob;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import com.tesoreria.treasury.core.port.out.FileStorageService;

public class GoogleCloudStorageService implements FileStorageService {
    private final Storage storage;
    private final String bucket;

    public GoogleCloudStorageService(Storage storage, String bucket) {
        this.storage = storage;
        this.bucket = bucket;
    }

    @Override
    public void upload(String objectName, byte[] content, String contentType) {
        BlobInfo info = BlobInfo.newBuilder(BlobId.of(bucket, objectName))
                .setContentType(contentType).build();
        storage.create(info, content, Storage.BlobTargetOption.doesNotExist());
    }

    @Override
    public StoredContent read(String objectName) {
        Blob blob = storage.get(BlobId.of(bucket, objectName));
        if (blob == null) throw new IllegalStateException("Objeto no encontrado en Storage");
        return new StoredContent(blob.getContent(), blob.getContentType());
    }

    @Override
    public void delete(String objectName) {
        storage.delete(BlobId.of(bucket, objectName));
    }
}
