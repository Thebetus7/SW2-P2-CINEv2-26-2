package com.cine.auth.application;

import com.cine.auth.application.dto.AuthResponseDto;
import com.cine.auth.application.dto.LoginRequestDto;
import com.cine.auth.application.usecase.AuthenticateUserUseCase;
import com.cine.auth.domain.exception.InvalidCredentialsException;
import com.cine.auth.domain.model.User;
import com.cine.auth.domain.model.UserRole;
import com.cine.auth.domain.repository.UserRepositoryPort;
import com.cine.auth.infrastructure.config.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class AuthenticateUserUseCaseTest {

    private UserRepositoryPort userRepositoryPort;
    private JwtTokenProvider jwtTokenProvider;
    private AuthenticateUserUseCase authenticateUserUseCase;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(10);

    @BeforeEach
    void setUp() {
        userRepositoryPort = Mockito.mock(UserRepositoryPort.class);
        jwtTokenProvider = new JwtTokenProvider(
                "dGhpc19pc19hX3Zlcnlfc2VjdXJlX2tleV9mb3Jfand0X3NpZ25pbmdfY2luZV9hdXRoXzIwMjZfc3cyX2FneV9sZXNz",
                28800000
        );
        authenticateUserUseCase = new AuthenticateUserUseCase(userRepositoryPort, jwtTokenProvider);
    }

    @Test
    @DisplayName("Debe autenticar correctamente a admin y retornar JWT con redirectUrl al puerto 4200")
    void shouldAuthenticateAdminSuccessfully() {
        User admin = new User(
                UUID.randomUUID(),
                "Administrador General",
                "admin@cine.local",
                encoder.encode("admin123"),
                UserRole.ADMIN,
                Instant.now()
        );
        when(userRepositoryPort.findByEmail("admin@cine.local")).thenReturn(Optional.of(admin));

        LoginRequestDto request = new LoginRequestDto("admin@cine.local", "admin123");
        AuthResponseDto response = authenticateUserUseCase.authenticate(request);

        assertNotNull(response.getToken());
        assertEquals("admin@cine.local", response.getEmail());
        assertEquals("ADMIN", response.getRole());
        assertEquals("http://localhost:4200", response.getRedirectUrl());
        assertTrue(jwtTokenProvider.validateToken(response.getToken()));
    }

    @Test
    @DisplayName("Debe autenticar a cliente y retornar redirectUrl al puerto 5173")
    void shouldAuthenticateClientSuccessfully() {
        User cliente = new User(
                UUID.randomUUID(),
                "Cliente Demo",
                "cliente@cine.local",
                encoder.encode("cliente123"),
                UserRole.CLIENTE,
                Instant.now()
        );
        when(userRepositoryPort.findByEmail("cliente@cine.local")).thenReturn(Optional.of(cliente));

        LoginRequestDto request = new LoginRequestDto("cliente@cine.local", "cliente123");
        AuthResponseDto response = authenticateUserUseCase.authenticate(request);

        assertNotNull(response.getToken());
        assertEquals("CLIENTE", response.getRole());
        assertEquals("http://localhost:5173", response.getRedirectUrl());
    }

    @Test
    @DisplayName("Debe autenticar a boletero y retornar redirectUrl al puerto 8000")
    void shouldAuthenticateBoleteroSuccessfully() {
        User boletero = new User(
                UUID.randomUUID(),
                "Boletero Sala",
                "boletero@cine.local",
                encoder.encode("boletero123"),
                UserRole.BOLETERO,
                Instant.now()
        );
        when(userRepositoryPort.findByEmail("boletero@cine.local")).thenReturn(Optional.of(boletero));

        LoginRequestDto request = new LoginRequestDto("boletero@cine.local", "boletero123");
        AuthResponseDto response = authenticateUserUseCase.authenticate(request);

        assertNotNull(response.getToken());
        assertEquals("BOLETERO", response.getRole());
        assertEquals("http://localhost:8000", response.getRedirectUrl());
    }

    @Test
    @DisplayName("Debe rechazar contraseña incorrecta lanzando InvalidCredentialsException")
    void shouldRejectInvalidPassword() {
        User admin = new User(
                UUID.randomUUID(),
                "Administrador General",
                "admin@cine.local",
                encoder.encode("admin123"),
                UserRole.ADMIN,
                Instant.now()
        );
        when(userRepositoryPort.findByEmail("admin@cine.local")).thenReturn(Optional.of(admin));

        LoginRequestDto request = new LoginRequestDto("admin@cine.local", "password_erroneo");
        assertThrows(InvalidCredentialsException.class, () -> authenticateUserUseCase.authenticate(request));
    }

    @Test
    @DisplayName("Debe rechazar email inexistente lanzando InvalidCredentialsException")
    void shouldRejectUnknownUser() {
        when(userRepositoryPort.findByEmail(any())).thenReturn(Optional.empty());

        LoginRequestDto request = new LoginRequestDto("desconocido@cine.local", "cualquiera");
        assertThrows(InvalidCredentialsException.class, () -> authenticateUserUseCase.authenticate(request));
    }
}
