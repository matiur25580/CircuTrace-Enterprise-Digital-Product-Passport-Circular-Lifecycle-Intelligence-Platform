import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { acceptPartnerInvitation, createPartner, createPartnerInvitation, createPartnerRelationship, getAccessToken, listOrganizations, listPartnerInvitations, listPartnerRelationships, listPartners, login, logout, refreshSession, revokePartnerInvitation, setAccessToken, updatePartner, updatePartnerRelationshipStatus } from './api';

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
    await expect(login('bad@example.com', 'bad')).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });
  });
});

describe('partner directory API', () => {
  beforeEach(() => { setAccessToken('workspace-token'); });
  it('loads partners with encoded organization scope and active filters', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ data: { partners: [{ _id: 'p1', name: 'Northstar', type: 'supplier', status: 'active' }] } }));
    vi.stubGlobal('fetch', fetchMock);
    const items = await listPartners('org/one', { search: 'north star', type: 'supplier', status: 'active' });
    expect(items).toHaveLength(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/organizations/org%2Fone/partners?');
    expect(String(fetchMock.mock.calls[0][0])).toContain('search=north+star');
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('authorization')).toBe('Bearer workspace-token');
  });
  it('creates a partner using the organization-scoped API and JSON payload', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ data: { partner: { _id: 'p2', name: 'New Supplier', type: 'supplier', status: 'active' } } }, 201));
    vi.stubGlobal('fetch', fetchMock);
    const partner = await createPartner('org1', { name: 'New Supplier', type: 'supplier' });
    expect(partner._id).toBe('p2');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/organizations/org1/partners');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify({ name: 'New Supplier', type: 'supplier' }) });
  });
  it('updates a partner profile using PATCH and the organization-scoped partner identifier', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ data: { partner: { _id: 'p2', name: 'Updated Supplier', type: 'supplier', status: 'active' } } }));
    vi.stubGlobal('fetch', fetchMock);
    const partner = await updatePartner('org1', 'p2', { name: 'Updated Supplier' });
    expect(partner.name).toBe('Updated Supplier');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/organizations/org1/partners/p2');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PATCH', body: JSON.stringify({ name: 'Updated Supplier' }) });
  });

  it('creates a partner invitation without exposing an invitation token in the URL', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ data: { invitation: { id: 'i1', email: 'contact@example.com', expiresAt: '2026-12-01T00:00:00.000Z' }, token: 'one-time-secret-token' } }, 201));
    vi.stubGlobal('fetch', fetchMock);
    const result = await createPartnerInvitation('org1', 'partner1');
    expect(result.token).toBe('one-time-secret-token');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/organizations/org1/partners/partner1/invitations');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' });
  });
  it('lists and revokes invitations using partner-scoped endpoints', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ data: { invitations: [{ _id: 'i1', email: 'contact@example.com', expiresAt: '2026-12-01T00:00:00.000Z', acceptedAt: null, revokedAt: null, createdAt: '2026-11-22T00:00:00.000Z' }] } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const invitations = await listPartnerInvitations('org1', 'partner1');
    await revokePartnerInvitation('org1', 'partner1', 'i1');
    expect(invitations).toHaveLength(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/partners/partner1/invitations');
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'DELETE' });
  });
  it('accepts a partner invitation with the authenticated API session', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ data: { accepted: true, partnerId: 'p1', organizationId: 'org1' } }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await acceptPartnerInvitation('one-time-token');
    expect(result.accepted).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/partner-invitations/accept');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify({ token: 'one-time-token' }) });
  });

  it('lists partner relationships with organization scope and optional filters', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ data: { relationships: [{ _id: 'r1', type: 'supplies_to', status: 'active' }] } }));
    vi.stubGlobal('fetch', fetchMock);
    const items = await listPartnerRelationships('org/one', { partnerId: 'p1', type: 'supplies_to', status: 'active' });
    expect(items).toHaveLength(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/organizations/org%2Fone/partner-relationships?');
    expect(String(fetchMock.mock.calls[0][0])).toContain('partnerId=p1');
    expect(String(fetchMock.mock.calls[0][0])).toContain('type=supplies_to');
    expect(String(fetchMock.mock.calls[0][0])).toContain('status=active');
  });
  it('creates a directed partner relationship with a JSON request', async () => {
    const payload = { sourcePartnerId: 'p1', targetPartnerId: 'p2', type: 'supplies_to' as const, description: 'Raw material supply' };
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ data: { relationship: { _id: 'r1', ...payload, status: 'active' } } }, 201));
    vi.stubGlobal('fetch', fetchMock);
    const relationship = await createPartnerRelationship('org1', payload);
    expect(relationship._id).toBe('r1');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/organizations/org1/partner-relationships');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify(payload) });
  });
  it('updates partner relationship status through the scoped status endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ data: { relationship: { _id: 'r1', status: 'inactive' } } }));
    vi.stubGlobal('fetch', fetchMock);
    const relationship = await updatePartnerRelationshipStatus('org1', 'r1', 'inactive');
    expect(relationship.status).toBe('inactive');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/organizations/org1/partner-relationships/r1/status');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PATCH', body: JSON.stringify({ status: 'inactive' }) });
  });

});
