package com.cine.auth.application.usecase;

import com.cine.auth.application.dto.AuthResponseDto;
import com.cine.auth.application.dto.RegisterRequestDto;
import com.cine.auth.domain.exception.DomainException;
import com.cine.auth.domain.model.User;
import com.cine.auth.domain.repository.UserRepositoryPort;
import com.cine.auth.infrastructure.config.JwtTokenProvider;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class RegisterUserUseCase {

    private final UserRepositoryPort userRepositoryPort;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    public RegisterUserUseCase(
            UserRepositoryPort userRepositoryPort,
            JwtTokenProvider jwtTokenProvider
    ) {
        this.userRepositoryPort = userRepositoryPort;
        this.jwtTokenProvider = jwtTokenProvider;
        this.passwordEncoder = new BCryptPasswordEncoder(10);
    }

    public AuthResponseDto register(RegisterRequestDto request) {
        if (request == null) {
            throw new DomainException("Datos de registro inválidos");
        }

        if (request.getPassword() == null || request.getPassword().trim().length() < 6) {
            throw new DomainException("La contraseña debe contener al menos 6 caracteres");
        }

        String normalizedEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        if (userRepositoryPort.existsByEmail(normalizedEmail)) {
            throw new DomainException("El correo electrónico ya se encuentra registrado: " + normalizedEmail);
        }

        String passwordHash = passwordEncoder.encode(request.getPassword().trim());
        User newUser = User.registerNewClient(request.getFullName(), normalizedEmail, passwordHash);

        User savedUser = userRepositoryPort.save(newUser);
        String token = jwtTokenProvider.generateToken(savedUser);
        String redirectUrl = AuthenticateUserUseCase.resolveRedirectUrl(savedUser.getRole());

        return new AuthResponseDto(
                token,
                savedUser.getId(),
                savedUser.getFullName(),
                savedUser.getEmail(),
                savedUser.getRole().name(),
                redirectUrl
        );
    }
}
