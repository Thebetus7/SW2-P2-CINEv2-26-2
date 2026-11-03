package com.cine.auth.application.usecase;

import com.cine.auth.application.dto.AuthResponseDto;
import com.cine.auth.application.dto.LoginRequestDto;
import com.cine.auth.domain.exception.InvalidCredentialsException;
import com.cine.auth.domain.model.User;
import com.cine.auth.domain.model.UserRole;
import com.cine.auth.domain.repository.UserRepositoryPort;
import com.cine.auth.infrastructure.config.JwtTokenProvider;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthenticateUserUseCase {

    private final UserRepositoryPort userRepositoryPort;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    public AuthenticateUserUseCase(
            UserRepositoryPort userRepositoryPort,
            JwtTokenProvider jwtTokenProvider
    ) {
        this.userRepositoryPort = userRepositoryPort;
        this.jwtTokenProvider = jwtTokenProvider;
        this.passwordEncoder = new BCryptPasswordEncoder(10);
    }

    public AuthResponseDto authenticate(LoginRequestDto request) {
        if (request == null || request.getEmail() == null || request.getPassword() == null) {
            throw new InvalidCredentialsException("Correo o contraseña vacíos");
        }

        User user = userRepositoryPort.findByEmail(request.getEmail().trim().toLowerCase())
                .orElseThrow(() -> new InvalidCredentialsException("Credenciales inválidas"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException("Credenciales inválidas");
        }

        String token = jwtTokenProvider.generateToken(user);
        String redirectUrl = resolveRedirectUrl(user.getRole());

        return new AuthResponseDto(
                token,
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole().name(),
                redirectUrl
        );
    }

    public static String resolveRedirectUrl(UserRole role) {
        return switch (role) {
            case ADMIN -> "http://localhost:4200";
            case CLIENTE -> "http://localhost:5173";
            case BOLETERO -> "http://localhost:8000";
        };
    }
}
