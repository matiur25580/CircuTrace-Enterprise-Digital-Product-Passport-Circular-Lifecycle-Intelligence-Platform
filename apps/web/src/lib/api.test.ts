import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAccessToken, listOrganizations, login, logout, refreshSession, setAccessToken } from './api';
import type { ApiClientError } from './api';

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}
describe('CircuTrace browser API client', () => {
  beforeEach(() => { setAccessToken(null); vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });
  it('restores a session through the HttpOnly refresh cookie without sending a bearer token', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ data: { accessToken: 'short-lived-access', tokenType: 'Bearer', expiresIn: 900, user: { id: 'u1', displayName: 'Test User', email: 'test@example.com', emailVerified: false, createdAt: '2026-01-01T00:00:00.000Z' } } }));
    const result = await refreshSession();
    expect(result.user.email).toBe('test@example.com');
    expect(getAccessToken()).toBe('short-lived-access');
    expect(vi.mocked(fetch).mock.calls[0][1]).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers).has('authorization')).toBe(false);
  });
  it('sends login credentials and keeps access tokens in memory', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ data: { accessToken: 'access-2', tokenType: 'Bearer', expiresIn: 900, user: { id: 'u1', displayName: 'Test User', email: 'test@example.com', emailVerified: false, createdAt: '2026-01-01T00:00:00.000Z' } } }));
    await login('test@example.com', 'long-password');
    expect(getAccessToken()).toBe('access-2');
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('/auth/login');
    expect(vi.mocked(fetch).mock.calls[0][1]).toMatchObject({ credentials: 'include', body: JSON.stringify({ email: 'test@example.com', password: 'long-password' }) });
  });
  it('clears the in-memory token even when logout request fails', async () => {
    setAccessToken('existing');
    vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'));
    await expect(logout()).rejects.toThrow('offline');
    expect(getAccessToken()).toBeNull();
  });
  it('lists organizations using the active access token', async () => {
    setAccessToken('bearer-token');
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ data: { organizations: [{ _id: 'org1', name: 'Example', slug: 'example', role: 'owner' }] } }));
    const organizations = await listOrganizations();
    expect(organizations[0].name).toBe('Example');
    expect(new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers).get('authorization')).toBe('Bearer bearer-token');
  });
  it('converts API error envelopes to typed errors', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } }, 401));
    await expect(login('bad@example.com', 'bad')).rejects.toMatchObject<ApiClientError>({ code: 'INVALID_CREDENTIALS', status: 401 });
  });
});
