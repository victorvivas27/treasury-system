package com.tesoreria.user.application.usecase;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.treasury.core.port.out.FileStorageService;
import com.tesoreria.user.core.constant.ProfileImageType;
import com.tesoreria.user.core.model.User;
import com.tesoreria.user.core.port.out.UserRepositoryOutPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProfileImageServiceTest {
    @Mock UserRepositoryOutPort users;
    @Mock FileStorageService storage;
    private ProfileImageService service;
    private User user;

    @BeforeEach
    void setUp() {
        service = new ProfileImageService(users, storage);
        user = new User();
        user.setId(8L);
        user.setNombre("Usuario Prueba");
        user.setCorreo("user@test.cl");
        user.setPassword("Password1!");
        lenient().when(users.findByCorreo("user@test.cl")).thenReturn(Optional.of(user));
        lenient().when(users.save(any())).thenAnswer(call -> call.getArgument(0));
    }

    @Test
    void selectsOnlyCatalogAvatar() {
        User result = service.selectAvatar("user@test.cl", "/avatars/avatar-01.png");
        assertEquals(ProfileImageType.PREDEFINED_AVATAR, result.getProfileImageType());
        assertEquals("/avatars/avatar-01.png", result.getProfileImageUrl());
        assertThrows(DomainException.class,
                () -> service.selectAvatar("user@test.cl", "/avatars/../../secret.png"));
    }

    @Test
    void uploadsValidImageWithUserIdAndGeneratedName() {
        byte[] png = {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a};
        User result = service.upload("user@test.cl",
                new MockMultipartFile("file", "original.png", "image/png", png));
        assertEquals(ProfileImageType.CUSTOM_IMAGE, result.getProfileImageType());
        assertTrue(result.getProfileImageUrl().matches("avatars/users/8/[0-9a-f-]+\\.png"));
        verify(storage).upload(eq(result.getProfileImageUrl()), eq(png), eq("image/png"));
    }

    @Test
    void rejectsInvalidMimeAndOversizedFile() {
        assertThrows(DomainException.class, () -> service.upload("user@test.cl",
                new MockMultipartFile("file", "bad.gif", "image/gif", "GIF".getBytes())));
        assertThrows(DomainException.class, () -> service.upload("user@test.cl",
                new MockMultipartFile("file", "large.png", "image/png", new byte[5 * 1024 * 1024 + 1])));
        verifyNoInteractions(storage);
    }

    @Test
    void replacingAndResettingCustomImageDeletesPreviousObject() {
        user.setProfileImageType(ProfileImageType.CUSTOM_IMAGE);
        user.setProfileImageUrl("avatars/users/8/old.png");
        User result = service.reset("user@test.cl");
        assertEquals(ProfileImageType.INITIALS, result.getProfileImageType());
        assertNull(result.getProfileImageUrl());
        verify(storage).delete("avatars/users/8/old.png");
    }
}
