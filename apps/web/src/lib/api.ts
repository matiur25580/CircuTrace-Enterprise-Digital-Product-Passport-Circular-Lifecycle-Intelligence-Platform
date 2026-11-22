import type { ApiError } from '@circutrace/shared-types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1').replace(/\/$/, '');

export interface AuthUser {
  id: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
}
export interface Organization {
  _id: string;
  name: string;
  slug: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
}
export type PartnerType = 'supplier' | 'manufacturer' | 'brand' | 'logistics' | 'service_provider' | 'recycler' | 'other';
export type PartnerStatus = 'active' | 'suspended' | 'archived';
export interface Partner {
  _id: string;
  organizationId: string;
  name: string;
  legalName?: string | null;
  type: PartnerType;
  status: PartnerStatus;
  website?: string | null;
  countryCode?: string | null;
  contact?: { name?: string | null; email?: string | null; role?: string | null };
  externalReference?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}
export type PartnerInput = Pick<Partner, 'name' | 'type'> & Partial<Pick<Partner, 'legalName' | 'website' | 'countryCode' | 'contact' | 'externalReference' | 'notes'>>;
interface AuthPayload {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthUser;
}
interface ApiEnvelope<T> { data: T }
export class ApiClientError extends Error {
  constructor(message: string, readonly code: string, readonly status: number) {
    super(message);
    this.name = 'ApiClientError';
  }
}
let accessToken: string | null = null;
export function setAccessToken(token: string | null) { accessToken = token; }
export function getAccessToken() { return accessToken; }

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status ===  204) return undefined as T;
  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | ApiError | null;
  if (!response.ok) {
    const failure = payload && 'error' in payload ? payload.error : undefined;
    throw new ApiClientError(failure?.message || 'The request could not be completed.', failure?.code || 'REQUEST_FAILED', response.status);
  }
  if (!payload || !('data' in payload)) throw new ApiClientError('The server returned an invalid response.', 'INVALID_RESPONSE', response.status);
  return payload.data;
}

async function rawRequest<T>(path: string, init: RequestInit = {}, token: string | null = accessToken): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: 'include' });
  return parseResponse<T>(response);
}

let refreshInFlight: Promise<AuthPayload> | null = null;
export async function refreshSession(): Promise<AuthPayload> {
  if (!refreshInFlight) {
    refreshInFlight = rawRequest<AuthPayload>('/auth/refresh', { method: 'POST' }, null)
      .then((payload) => { setAccessToken(payload.accessToken); return payload; })
      .catch((error: unknown) => { setAccessToken(null); throw error; })
      .finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  try { return await rawRequest<T>(path, init); }
  catch (error) {
    if (!(error instanceof ApiClientError) || error.status !== 401 || path === '/auth/refresh' || path === '/auth/login' || path === '/auth/register' || path === '/auth/logout') throw error;
    const refreshed = await refreshSession();
    return rawRequest<T>(path, init, refreshed.accessToken);
  }
}

export async function login(email: string, password: string): Promise<AuthPayload> {
  const result = await rawRequest<AuthPayload>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, null);
  setAccessToken(result.accessToken);
  return result;
}
export async function register(displayName: string, email: string, password: string): Promise<AuthPayload> {
  const result = await rawRequest<AuthPayload>('/auth/register', { method: 'POST', body: JSON.stringify({ displayName, email, password }) }, null);
  setAccessToken(result.accessToken);
  return result;
}
export async function logout(): Promise<void> {
  try { await rawRequest<void>('/auth/logout', { method: 'POST' }, null); }
  finally { setAccessToken(null); }
}
export async function listOrganizations(): Promise<Organization[]> {
  const result = await request<{ organizations: Organization[] }>('/organizations');
  return result.organizations;
}
export async function createOrganization(input: { name: string; slug?: string }): Promise<Organization> {
  const result = await request<{ organization: Organization; role: 'owner' }>('/organizations', { method: 'POST', body: JSON.stringify(input) });
  return { ...result.organization, role: result.role };
}
export async function listPartners(organizationId: string, filters: { search?: string; type?: PartnerType | ''; status?: PartnerStatus | '' } = {}): Promise<Partner[]> {
  const params = new URLSearchParams();
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  if (filters.type) params.set('type', filters.type);
  if (filters.status) params.set('status', filters.status);
  const query = params.size ? `?${params.toString()}` : '';
  const result = await request<{ partners: Partner[] }>(`/organizations/${encodeURIComponent(organizationId)}/partners${query}`);
  return result.partners;
}
export async function getPartner(organizationId: string, partnerId: string): Promise<Partner> {
  const result = await request<{ partner: Partner }>(`/organizations/${encodeURIComponent(organizationId)}/partners/${encodeURIComponent(partnerId)}`);
  return result.partner;
}
export async function createPartner(organizationId: string, input: PartnerInput): Promise<Partner> {
  const result = await request<{ partner: Partner }>(`/organizations/${encodeURIComponent(organizationId)}/partners`, { method: 'POST', body: JSON.stringify(input) });
  return result.partner;
}
export async function updatePartner(organizationId: string, partnerId: string, input: Partial<PartnerInput>): Promise<Partner> {
  const result = await request<{ partner: Partner }>(`/organizations/${encodeURIComponent(organizationId)}/partners/${encodeURIComponent(partnerId)}`, { method: 'PATCH', body: JSON.stringify(input) });
  return result.partner;
}
export async function updatePartnerStatus(organizationId: string, partnerId: string, status: PartnerStatus): Promise<Partner> {
  const result = await request<{ partner: Partner }>(`/organizations/${encodeURIComponent(organizationId)}/partners/${encodeURIComponent(partnerId)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
  return result.partner;
}

export interface PartnerInvitation {
  _id: string;
  email: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}
export interface CreatedPartnerInvitation {
  invitation: { id: string; organizationId: string; partnerId: string; email: string; expiresAt: string; acceptedAt: null; revokedAt: null };
  token: string;
}
export async function listPartnerInvitations(organizationId: string, partnerId: string): Promise<PartnerInvitation[]> {
  const result = await request<{ invitations: PartnerInvitation[] }>(`/organizations/${encodeURIComponent(organizationId)}/partners/${encodeURIComponent(partnerId)}/invitations`);
  return result.invitations;
}
export async function createPartnerInvitation(organizationId: string, partnerId: string): Promise<CreatedPartnerInvitation> {
  return request<CreatedPartnerInvitation>(`/organizations/${encodeURIComponent(organizationId)}/partners/${encodeURIComponent(partnerId)}/invitations`, { method: 'POST' });
}
export async function revokePartnerInvitation(organizationId: string, partnerId: string, invitationId: string): Promise<void> {
  await request<void>(`/organizations/${encodeURIComponent(organizationId)}/partners/${encodeURIComponent(partnerId)}/invitations/${encodeURIComponent(invitationId)}`, { method: 'DELETE' });
}
export async function acceptPartnerInvitation(token: string): Promise<{ accepted: true; partnerId: string; organizationId: string }> {
  return request<{ accepted: true; partnerId: string; organizationId: string }>('/partner-invitations/accept', { method: 'POST', body: JSON.stringify({ token }) });
}

export type ProductStatus = 'draft' | 'active' | 'archived';
export type MaterialCategory = 'metal' | 'plastic' | 'textile' | 'chemical' | 'wood' | 'glass' | 'paper' | 'composite' | 'other';
export interface Product { _id:string; organizationId:string; sku:string; name:string; description?:string|null; category?:string|null; status:ProductStatus; createdAt:string; updatedAt:string }
export interface ProductComponent { _id:string; code:string; name:string; quantity:number; unit:string }
export interface ProductMaterial { _id:string; name:string; category:MaterialCategory; mass:number; massUnit:'g'|'kg'|'mg'; recycledContentPct?:number|null; originCountryCode?:string|null }
export async function listProducts(org:string, filters:{search?:string;status?:ProductStatus|''}={}):Promise<Product[]> {
 const p=new URLSearchParams(); if(filters.search?.trim())p.set('search',filters.search.trim()); if(filters.status)p.set('status',filters.status);
 const q=p.size?'?'+p.toString():''; return (await request<{products:Product[]}>('/organizations/'+encodeURIComponent(org)+'/products'+q)).products;
}
export async function createProduct(org:string,input:{sku:string;name:string;description?:string;category?:string}):Promise<Product> {
 return (await request<{product:Product}>('/organizations/'+encodeURIComponent(org)+'/products',{method:'POST',body:JSON.stringify(input)})).product;
}
export async function listProductComponents(org:string,product:string):Promise<ProductComponent[]> {
 return (await request<{components:ProductComponent[]}>('/organizations/'+encodeURIComponent(org)+'/products/'+encodeURIComponent(product)+'/components')).components;
}
export async function createProductComponent(org:string,product:string,input:{code:string;name:string;quantity:number;unit:string}):Promise<ProductComponent> {
 return (await request<{component:ProductComponent}>('/organizations/'+encodeURIComponent(org)+'/products/'+encodeURIComponent(product)+'/components',{method:'POST',body:JSON.stringify(input)})).component;
}
export async function listProductMaterials(org:string,product:string,component:string):Promise<ProductMaterial[]> {
 return (await request<{materials:ProductMaterial[]}>('/organizations/'+encodeURIComponent(org)+'/products/'+encodeURIComponent(product)+'/components/'+encodeURIComponent(component)+'/materials')).materials;
}
export async function createProductMaterial(org:string,product:string,component:string,input:{name:string;category:MaterialCategory;mass:number;massUnit:'g'|'kg'|'mg';recycledContentPct?:number;originCountryCode?:string}):Promise<ProductMaterial> {
 return (await request<{material:ProductMaterial}>('/organizations/'+encodeURIComponent(org)+'/products/'+encodeURIComponent(product)+'/components/'+encodeURIComponent(component)+'/materials',{method:'POST',body:JSON.stringify(input)})).material;
}
