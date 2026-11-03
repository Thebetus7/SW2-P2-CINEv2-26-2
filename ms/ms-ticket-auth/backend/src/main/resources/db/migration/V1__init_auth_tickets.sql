-- =============================================================================
-- V1__init_auth_tickets.sql
-- Creación inicial del esquema de autenticación y gestión de boletos
-- =============================================================================

-- Tabla de Usuarios del Sistema
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'CLIENTE', 'BOLETERO')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Tabla de Boletos / Tickets
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    showtime_id UUID NOT NULL,
    seat_id UUID NOT NULL,
    price_paid NUMERIC(10, 2) NOT NULL CHECK (price_paid > 0),
    status VARCHAR(25) NOT NULL CHECK (status IN ('PENDING_PAYMENT', 'CONFIRMED', 'USED', 'CANCELLED')),
    ticket_image_url VARCHAR(255),
    qr_signature VARCHAR(255),
    lock_expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_showtime ON tickets(showtime_id);
CREATE INDEX IF NOT EXISTS idx_tickets_seat ON tickets(seat_id);
