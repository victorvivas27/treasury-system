package com.tesoreria.user.application.usecase;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.treasury.core.port.out.FileStorageService;
import com.tesoreria.user.core.constant.ProfileImageType;
import com.tesoreria.user.core.model.User;
import com.tesoreria.user.core.port.out.UserRepositoryOutPort;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

public class ProfileImageService {
    private static final long MAX_SIZE = 5L * 1024 * 1024;
    private static final Set<String> AVATARS = Set.of(
            "/avatars/avatar-01.png", "/avatars/avatar-02.png", "/avatars/avatar-03.png",
            "/avatars/avatar-04.png", "/avatars/avatar-05.png", "/avatars/avatar-06.png");
    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", "jpg", "image/png", "png", "image/webp", "webp");
    private final UserRepositoryOutPort users;
    private final FileStorageService storage;

    public ProfileImageService(UserRepositoryOutPort users, FileStorageService storage) {
        this.users = users;
        this.storage = storage;
    }

    public User selectAvatar(String email, String avatar) {
        if (!AVATARS.contains(avatar)) throw invalid("El avatar seleccionado no pertenece al cat\u00e1logo");
        User user = find(email);
        String previous = customKey(user);
        user.setProfileImageType(ProfileImageType.PREDEFINED_AVATAR);
        user.setProfileImageUrl(avatar);
        User saved = users.save(user);
        deleteQuietly(previous);
        return saved;
    }

    public User upload(String email, MultipartFile file) {
        validate(file);
        if (storage == null) throw new DomainException("file", HttpStatus.SERVICE_UNAVAILABLE,
                "El almacenamiento de im\u00e1genes no est\u00e1 disponible");
        User user = find(email);
        String extension = EXTENSIONS.get(file.getContentType());
        String objectName = "avatars/users/" + user.getId() + "/" + UUID.randomUUID() + "." + extension;
        String previous = customKey(user);
        try {
            storage.upload(objectName, file.getBytes(), file.getContentType());
        } catch (IOException exception) {
            throw invalid("No fue posible leer la imagen", exception);
        }
        try {
            user.setProfileImageType(ProfileImageType.CUSTOM_IMAGE);
            user.setProfileImageUrl(objectName);
            User saved = users.save(user);
            deleteQuietly(previous);
            return saved;
        } catch (RuntimeException exception) {
            deleteQuietly(objectName);
            throw exception;
        }
    }

    public User reset(String email) {
        User user = find(email);
        String previous = customKey(user);
        user.setProfileImageType(ProfileImageType.INITIALS);
        user.setProfileImageUrl(null);
        User saved = users.save(user);
        deleteQuietly(previous);
        return saved;
    }

    public FileStorageService.StoredContent read(String email) {
        User user = find(email);
        return readCustomImage(user);
    }

    public FileStorageService.StoredContent read(Long userId) {
        User user = users.findById(userId).orElseThrow(() ->
                new DomainException("user", HttpStatus.NOT_FOUND, "Usuario no encontrado"));
        return readCustomImage(user);
    }

    private FileStorageService.StoredContent readCustomImage(User user) {
        String key = customKey(user);
        if (key == null || storage == null) throw new DomainException("profileImage", HttpStatus.NOT_FOUND,
                "El usuario no tiene una imagen personalizada");
        return storage.read(key);
    }

    private User find(String email) {
        return users.findByCorreo(email).orElseThrow(() ->
                new DomainException("user", HttpStatus.NOT_FOUND, "Usuario no encontrado"));
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) throw invalid("La imagen no puede estar vac\u00eda");
        if (file.getSize() > MAX_SIZE) throw invalid("La imagen no puede superar 5 MB");
        String type = file.getContentType();
        if (!EXTENSIONS.containsKey(type)) throw invalid("Formato permitido: JPG, PNG o WEBP");
        try {
            byte[] bytes = file.getBytes();
            if (!matchesSignature(type, bytes)) throw invalid("El contenido no corresponde al formato indicado");
        } catch (IOException exception) {
            throw invalid("No fue posible leer la imagen", exception);
        }
    }

    private boolean matchesSignature(String type, byte[] value) {
        if ("image/jpeg".equals(type)) return value.length > 2 && (value[0] & 0xff) == 0xff && (value[1] & 0xff) == 0xd8;
        if ("image/png".equals(type)) return value.length > 7 && (value[0] & 0xff) == 0x89
                && value[1] == 0x50 && value[2] == 0x4e && value[3] == 0x47;
        return value.length > 11 && value[0] == 'R' && value[1] == 'I' && value[2] == 'F'
                && value[3] == 'F' && value[8] == 'W' && value[9] == 'E' && value[10] == 'B' && value[11] == 'P';
    }

    private String customKey(User user) {
        return user.getProfileImageType() == ProfileImageType.CUSTOM_IMAGE ? user.getProfileImageUrl() : null;
    }

    private void deleteQuietly(String key) {
        if (key == null || storage == null) return;
        try { storage.delete(key); } catch (RuntimeException ignored) { /* best effort cleanup */ }
    }

    private DomainException invalid(String message) {
        return new DomainException("file", HttpStatus.BAD_REQUEST, message);
    }

    private DomainException invalid(String message, Throwable cause) {
        return new DomainException("file", HttpStatus.BAD_REQUEST, message, cause);
    }
}
