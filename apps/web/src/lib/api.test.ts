import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { acceptPartnerInvitation, createPartner, createProduct, listProducts, listProductComponents, listProductMaterials, createProductComponent, createProductMaterial, createPartnerInvitation, getAccessToken, listOrganizations, listPartnerInvitations, listPartners, login, logout, refreshSession, revokePartnerInvitation, setAccessToken, updatePartner } from './api';

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

});

describe('product catalogue API',()=>{
 beforeEach(()=>{setAccessToken('catalog-token')});
 it('lists and creates products through the organization scope',async()=>{
  const f=vi.fn().mockResolvedValueOnce(jsonResponse({data:{products:[{_id:'p1',sku:'SKU1',name:'Jacket',status:'draft'}]}})).mockResolvedValueOnce(jsonResponse({data:{product:{_id:'p2',sku:'SKU2',name:'Boot',status:'draft'}}},201));vi.stubGlobal('fetch',f);
  expect(await listProducts('org/1',{search:'jack et',status:'draft'})).toHaveLength(1);
  expect(String(f.mock.calls[0][0])).toContain('/organizations/org%2F1/products?');
  expect((await createProduct('org1',{sku:'SKU2',name:'Boot'}))._id).toBe('p2');
 });
 it('creates nested components and materials under a product',async()=>{
  const f=vi.fn().mockResolvedValueOnce(jsonResponse({data:{component:{_id:'c1',code:'SHELL',name:'Shell',quantity:1,unit:'piece'}}},201)).mockResolvedValueOnce(jsonResponse({data:{material:{_id:'m1',name:'Polyester',category:'textile',mass:100,massUnit:'g'}}},201));vi.stubGlobal('fetch',f);
  await createProductComponent('org1','p1',{code:'SHELL',name:'Shell',quantity:1,unit:'piece'});
  await createProductMaterial('org1','p1','c1',{name:'Polyester',category:'textile',mass:100,massUnit:'g'});
  expect(String(f.mock.calls[1][0])).toContain('/products/p1/components/c1/materials');
 });
 it('loads nested composition records',async()=>{
  const f=vi.fn().mockResolvedValueOnce(jsonResponse({data:{components:[{_id:'c1'}]}})).mockResolvedValueOnce(jsonResponse({data:{materials:[{_id:'m1'}]}}));vi.stubGlobal('fetch',f);
  expect(await listProductComponents('org1','p1')).toHaveLength(1);
  expect(await listProductMaterials('org1','p1','c1')).toHaveLength(1);
 });
});
