# ==========================================
# Dockerfile: MS TICKET-AUTH Frontend (React Vite)
# Multi-stage build Node 20 + Nginx Alpine
# ==========================================

# Etapa 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Etapa 2: Servidor Nginx
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

RUN rm -rf ./*
COPY --from=builder /app/dist .

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
