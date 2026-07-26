package com.tesoreria.user.application.usecase;

import com.tesoreria.user.core.port.out.UserRepositoryOutPort;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class CustomUserDetailsService implements UserDetailsService {
    private final UserRepositoryOutPort repository;

    public CustomUserDetailsService(UserRepositoryOutPort repository) {
        this.repository = repository;
    }

    @Override
    public UserDetails loadUserByUsername(String correo) {
        var user = repository.findByCorreo(correo.toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new UsernameNotFoundException("Credenciales inválidas"));
        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getCorreo())
                .password(user.getPassword())
                .roles(user.getRol().name())
                .disabled(!Boolean.TRUE.equals(user.getEnabled())
                        || (user.getRol() != com.tesoreria.user.core.constant.RoleEnum.ADMIN
                        && user.getEmailVerifiedAt() == null))
                .accountLocked(!Boolean.TRUE.equals(user.getAccountNonLocked()))
                .build();
    }
}
