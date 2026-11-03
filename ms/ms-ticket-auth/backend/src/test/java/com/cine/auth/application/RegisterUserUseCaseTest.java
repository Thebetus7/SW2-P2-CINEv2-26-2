package com.cine.auth.application;

import com.cine.auth.application.dto.AuthResponseDto;
import com.cine.auth.application.dto.RegisterRequestDto;
import com.cine.auth.application.usecase.RegisterUserUseCase;
import com.cine.auth.domain.exception.DomainException;
import com.cine.auth.domain.model.User;
import com.cine.auth.domain.repository.UserRepositoryPort;
import com.cine.auth.infrastructure.config.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.AdditionalAnswers.returnsFirstArg;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class RegisterUserUseCaseTest {

    private UserRepositoryPort userRepositoryPort;
    private JwtTokenProvider jwtTokenProvider;
    private RegisterUserUseCase registerUserUseCase;

    @BeforeEach
    void setUp() {
        userRepositoryPort = Mockito.mock(UserRepositoryPort.class);
        jwtTokenProvider = new JwtTokenProvider(
                "dGhpc19pc19hX3Zlcnlfc2VjdXJlX2tleV9mb3Jfand0X3NpZ25pbmdfY2luZV9hdXRoXzIwMjZfc3cyX2FneV9sZXNz",
                28800000
        );
        registerUserUseCase = new RegisterUserUseCase(userRepositoryPort, jwtTokenProvider);
    }

    @Test
    @DisplayName("Debe registrar exitosamente un nuevo cliente con rol CLIENTE")
    void shouldRegisterClientSuccessfully() {
        when(userRepositoryPort.existsByEmail("nuevo@cine.local")).thenReturn(false);
        when(userRepositoryPort.save(any(User.class))).then(returnsFirstArg());

        RegisterRequestDto request = new RegisterRequestDto("Nuevo Usuario", "nuevo@cine.local", "secreto123");
        AuthResponseDto response = registerUserUseCase.register(request);

        assertNotNull(response.getToken());
        assertEquals("nuevo@cine.local", response.getEmail());
        assertEquals("CLIENTE", response.getRole());
        assertEquals("http://localhost:5173", response.getRedirectUrl());
    }

    @Test
    @DisplayName("Debe rechazar el registro si el correo ya existe")
    void shouldRejectDuplicateEmail() {
        when(userRepositoryPort.existsByEmail("existente@cine.local")).thenReturn(true);

        RegisterRequestDto request = new RegisterRequestDto("Usuario Duplicado", "existente@cine.local", "secreto123");
        DomainException ex = assertThrows(DomainException.class, () -> registerUserUseCase.register(request));
        assertTrue(ex.getMessage().contains("ya se encuentra registrado"));
    }

    @Test
    @DisplayName("Debe rechazar contraseña corta menor a 6 caracteres")
    void shouldRejectShortPassword() {
        RegisterRequestDto request = new RegisterRequestDto("Usuario", "usuario@cine.local", "12345");
        DomainException ex = assertThrows(DomainException.class, () -> registerUserUseCase.register(request));
        assertTrue(ex.getMessage().contains("al menos 6 caracteres"));
    }
}
