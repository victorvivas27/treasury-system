package com.tesoreria.treasury.core.port.out;

public interface FileStorageService {
    void upload(String objectName, byte[] content, String contentType);
    StoredContent read(String objectName);
    void delete(String objectName);

    record StoredContent(byte[] bytes, String contentType) { }
}
