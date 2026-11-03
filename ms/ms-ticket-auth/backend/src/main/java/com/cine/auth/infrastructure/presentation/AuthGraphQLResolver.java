package com.cine.auth.infrastructure.presentation;

import com.cine.auth.application.dto.AuthResponseDto;
import com.cine.auth.application.dto.LoginRequestDto;
import com.cine.auth.application.dto.RegisterRequestDto;
import com.cine.auth.application.usecase.AuthenticateUserUseCase;
import com.cine.auth.application.usecase.RegisterUserUseCase;
import com.cine.auth.domain.model.User;
import com.cine.auth.domain.repository.UserRepositoryPort;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
public class AuthGraphQLResolver {

    private final AuthenticateUserUseCase authenticateUserUseCase;
    private final RegisterUserUseCase registerUserUseCase;
    private final UserRepositoryPort userRepositoryPort;

    public AuthGraphQLResolver(
            AuthenticateUserUseCase authenticateUserUseCase,
            RegisterUserUseCase registerUserUseCase,
            UserRepositoryPort userRepositoryPort
    ) {
        this.authenticateUserUseCase = authenticateUserUseCase;
        this.registerUserUseCase = registerUserUseCase;
        this.userRepositoryPort = userRepositoryPort;
    }

    public record UserPayload(
            String id,
            String fullName,
            String email,
            String role,
            String createdAt
    ) {}

    public record AuthPayload(
            String token,
            UserPayload user
    ) {}

    @MutationMapping
    public AuthPayload login(@Argument("input") Map<String, String> input) {
        String email = input.get("email");
        String password = input.get("password");

        AuthResponseDto dto = authenticateUserUseCase.authenticate(new LoginRequestDto(email, password));
        User user = userRepositoryPort.findByEmail(email.trim().toLowerCase()).orElseThrow();

        return new AuthPayload(
                dto.getToken(),
                new UserPayload(
                        user.getId().toString(),
                        user.getFullName(),
                        user.getEmail(),
                        user.getRole().name(),
                        user.getCreatedAt().toString()
                )
        );
    }

    @MutationMapping
    public AuthPayload register(@Argument("input") Map<String, String> input) {
        String fullName = input.get("fullName");
        String email = input.get("email");
        String password = input.get("password");

        AuthResponseDto dto = registerUserUseCase.register(new RegisterRequestDto(fullName, email, password));
        User user = userRepositoryPort.findByEmail(email.trim().toLowerCase()).orElseThrow();

        return new AuthPayload(
                dto.getToken(),
                new UserPayload(
                        user.getId().toString(),
                        user.getFullName(),
                        user.getEmail(),
                        user.getRole().name(),
                        user.getCreatedAt().toString()
                )
        );
    }

    @QueryMapping
    public UserPayload me() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }

        String email = auth.getName();
        return userRepositoryPort.findByEmail(email)
                .map(user -> new UserPayload(
                        user.getId().toString(),
                        user.getFullName(),
                        user.getEmail(),
                        user.getRole().name(),
                        user.getCreatedAt().toString()
                ))
                .orElse(null);
    }
}
