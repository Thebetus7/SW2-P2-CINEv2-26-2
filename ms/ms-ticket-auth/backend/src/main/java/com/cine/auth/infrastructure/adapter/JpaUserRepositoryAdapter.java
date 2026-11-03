package com.cine.auth.infrastructure.adapter;

import com.cine.auth.domain.model.User;
import com.cine.auth.domain.model.UserRole;
import com.cine.auth.domain.repository.UserRepositoryPort;
import com.cine.auth.infrastructure.persistence.entity.UserJpaEntity;
import com.cine.auth.infrastructure.persistence.repository.SpringDataUserRepository;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component
public class JpaUserRepositoryAdapter implements UserRepositoryPort {

    private final SpringDataUserRepository repository;

    public JpaUserRepositoryAdapter(SpringDataUserRepository repository) {
        this.repository = repository;
    }

    @Override
    public Optional<User> findById(UUID id) {
        return repository.findById(id).map(this::toDomain);
    }

    @Override
    public Optional<User> findByEmail(String email) {
        if (email == null) return Optional.empty();
        return repository.findByEmail(email.trim().toLowerCase()).map(this::toDomain);
    }

    @Override
    public boolean existsByEmail(String email) {
        if (email == null) return false;
        return repository.existsByEmail(email.trim().toLowerCase());
    }

    @Override
    public User save(User user) {
        UserJpaEntity entity = toJpaEntity(user);
        UserJpaEntity saved = repository.save(entity);
        return toDomain(saved);
    }

    private User toDomain(UserJpaEntity entity) {
        return new User(
                entity.getId(),
                entity.getFullName(),
                entity.getEmail(),
                entity.getPasswordHash(),
                UserRole.fromString(entity.getRole()),
                entity.getCreatedAt()
        );
    }

    private UserJpaEntity toJpaEntity(User user) {
        return new UserJpaEntity(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPasswordHash(),
                user.getRole().name(),
                user.getCreatedAt()
        );
    }
}
