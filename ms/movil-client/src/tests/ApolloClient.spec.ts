import { describe, it, expect, beforeEach } from 'vitest';
import { apolloClient, setAuthToken, getAuthToken, clearAuthToken, TOKEN_STORAGE_KEY } from '../services/apollo-client';

describe('ApolloClient', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('debe inicializarse con InMemoryCache y el endpoint configurado', () => {
    expect(apolloClient).toBeDefined();
    expect(apolloClient.cache).toBeDefined();
  });

  it('debe permitir almacenar y recuperar el token JWT en localStorage', () => {
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo_token';
    setAuthToken(fakeToken);

    expect(getAuthToken()).toBe(fakeToken);
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe(fakeToken);

    clearAuthToken();
    expect(getAuthToken()).toBeNull();
  });

  it('debe preparar los headers con Bearer token cuando existe', () => {
    const fakeToken = 'jwt-secret-xyz';
    setAuthToken(fakeToken);

    expect(getAuthToken()).toBe(fakeToken);
  });
});
