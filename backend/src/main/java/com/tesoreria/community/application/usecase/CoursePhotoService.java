package com.tesoreria.community.application.usecase;

import com.tesoreria.community.infrastructure.persistence.*;
import com.tesoreria.treasury.core.port.out.FileStorageService;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CoursePhotoService {
    private static final int MAX_PHOTOS = 3;
    private static final int MAX_CAPTION_LENGTH = 160;
    private static final int MAX_FILENAME_LENGTH = 255;
    private static final Map<String, String> TYPES = Map.of(
            "jpg", "image/jpeg", "jpeg", "image/jpeg", "png", "image/png", "webp", "image/webp");
    private final CoursePhotoJpaRepository photos;
    private final ObjectProvider<FileStorageService> storageProvider;
    private final long maxBytes;

    public CoursePhotoService(CoursePhotoJpaRepository photos,
                              ObjectProvider<FileStorageService> storageProvider,
                              Environment environment) {
        this.photos = photos;
        this.storageProvider = storageProvider;
        this.maxBytes = environment.getProperty("app.storage.gcs.max-file-size-mb", Long.class, 10L)
                * 1024L * 1024L;
    }

    @Transactional(readOnly = true)
    public List<PhotoView> list() { return photos.findAllByOrderByDisplayOrderAscIdAsc().stream().map(this::view).toList(); }

    @Transactional
    public PhotoView upload(MultipartFile file, String caption) {
        if (photos.count() >= MAX_PHOTOS) throw error(HttpStatus.CONFLICT, "La galería admite un máximo de 3 fotos");
        ValidatedImage image = validate(file);
        FileStorageService storage = storage();
        String objectName = "comunidad/fotos/%s.%s".formatted(UUID.randomUUID(), image.extension());
        storage.upload(objectName, image.bytes(), image.contentType());
        try {
            CoursePhotoEntity entity = new CoursePhotoEntity();
            entity.setOriginalName(image.originalName()); entity.setStorageObjectName(objectName);
            entity.setContentType(image.contentType()); entity.setCaption(normalizeCaption(caption));
            entity.setDisplayOrder((int) photos.count()); entity.setCreatedAt(LocalDateTime.now());
            return view(photos.saveAndFlush(entity));
        } catch (RuntimeException exception) {
            try { storage.delete(objectName); } catch (RuntimeException cleanup) { exception.addSuppressed(cleanup); }
            throw exception;
        }
    }

    @Transactional
    public PhotoView update(Long id, String caption, Integer displayOrder) {
        CoursePhotoEntity photo = find(id);
        photo.setCaption(normalizeCaption(caption));
        if (displayOrder != null) photo.setDisplayOrder(Math.max(0, Math.min(2, displayOrder)));
        return view(photos.save(photo));
    }

    @Transactional
    public void delete(Long id) {
        CoursePhotoEntity photo = find(id);
        storage().delete(photo.getStorageObjectName());
        photos.delete(photo);
    }

    @Transactional(readOnly = true)
    public ImageContent content(Long id) {
        CoursePhotoEntity photo = find(id);
        var stored = storage().read(photo.getStorageObjectName());
        return new ImageContent(stored.bytes(), photo.getContentType());
    }

    private CoursePhotoEntity find(Long id) { return photos.findById(id)
            .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Foto no encontrada")); }
    private FileStorageService storage() { return Optional.ofNullable(storageProvider.getIfAvailable())
            .orElseThrow(() -> error(HttpStatus.SERVICE_UNAVAILABLE, "El almacenamiento de imágenes no está disponible")); }
    private String normalizeCaption(String value) {
        if (value == null || value.isBlank()) return null;
        String normalized = value.trim();
        if (normalized.length() > MAX_CAPTION_LENGTH)
            throw error(HttpStatus.BAD_REQUEST, "La descripción supera 160 caracteres");
        return normalized;
    }
    private ValidatedImage validate(MultipartFile file) {
        if (file == null || file.isEmpty()) throw error(HttpStatus.BAD_REQUEST, "La imagen está vacía");
        if (file.getSize() > maxBytes) throw error(HttpStatus.PAYLOAD_TOO_LARGE, "La imagen supera el tamaño máximo");
        String name = Optional.ofNullable(file.getOriginalFilename()).orElse("").replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1).trim();
        int dot = name.lastIndexOf('.');
        if (dot < 1 || name.contains("..") || name.length() > MAX_FILENAME_LENGTH)
            throw error(HttpStatus.BAD_REQUEST, "Nombre de archivo inválido");
        String extension = name.substring(dot + 1).toLowerCase(Locale.ROOT);
        String expectedType = TYPES.get(extension);
        String contentType = Optional.ofNullable(file.getContentType()).orElse("").toLowerCase(Locale.ROOT);
        if (expectedType == null || !expectedType.equals(contentType)) throw error(HttpStatus.BAD_REQUEST, "Solo se permiten imágenes JPG, PNG o WEBP");
        try {
            byte[] bytes = file.getBytes();
            boolean valid = switch (extension) {
                case "jpg", "jpeg" -> bytes.length >= 2 && (bytes[0] & 255) == 0xff && (bytes[1] & 255) == 0xd8;
                case "png" -> bytes.length >= 4 && (bytes[0] & 255) == 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G';
                case "webp" -> bytes.length >= 12 && bytes[0] == 'R' && bytes[1] == 'I' && bytes[8] == 'W' && bytes[9] == 'E';
                default -> false;
            };
            if (!valid) throw error(HttpStatus.BAD_REQUEST, "El contenido no corresponde a una imagen válida");
            return new ValidatedImage(name, extension, contentType, bytes);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se pudo leer la imagen", exception);
        }
    }
    private PhotoView view(CoursePhotoEntity value) { return new PhotoView(value.getId(), value.getCaption(),
            value.getDisplayOrder(), "/community/gallery/%d/content".formatted(value.getId())); }
    private ResponseStatusException error(HttpStatus status, String message) { return new ResponseStatusException(status, message); }
    private record ValidatedImage(String originalName, String extension, String contentType, byte[] bytes) { }
    public record PhotoView(Long id, String caption, Integer displayOrder, String imageUrl) { }
    public record ImageContent(byte[] bytes, String contentType) { }
}
