import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { UserModel } from '../models/user.model.js';
import { InvitationModel } from '../organizations/invitation.model.js';
import { MembershipModel } from '../organizations/membership.model.js';
import { OrganizationModel } from '../organizations/organization.model.js';
import { PartnerInvitationModel } from '../partners/partner-invitation.model.js';
import { PartnerModel } from '../partners/partner.model.js';
import { ComponentModel } from './component.model.js';
import { MaterialModel } from './material.model.js';
import { ProductModel } from './product.model.js';
import { ProductVariantModel } from './product-variant.model.js';

const mongoUri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/circutrace_test';
async function register(email: string) {
  const response = await request(app).post('/api/v1/auth/register').send({ displayName: 'Catalog Test', email, password: 'a-strong-password-for-catalog-tests' });
  expect(response.status).toBe(201);
  return response.body.data.accessToken as string;
}
describe('product and material registry (MongoDB integration)', () => {
  beforeAll(async () => { await mongoose.connect(mongoUri); });
  beforeEach(async () => {
    await Promise.all([MaterialModel.deleteMany({}), ComponentModel.deleteMany({}), ProductVariantModel.deleteMany({}), ProductModel.deleteMany({}), PartnerInvitationModel.deleteMany({}), PartnerModel.deleteMany({}), InvitationModel.deleteMany({}), MembershipModel.deleteMany({}), OrganizationModel.deleteMany({}), UserModel.deleteMany({})]);
  });
  afterAll(async () => { await mongoose.disconnect(); });

  it('creates tenant-scoped products, components and material composition', async () => {
    const token = await register('catalog-owner@example.com');
    const organization = await request(app).post('/api/v1/organizations').set('Authorization', `Bearer ${token}`).send({ name: 'Catalog Tenant' });
    const orgId = organization.body.data.organization._id as string;
    const product = await request(app).post(`/api/v1/organizations/${orgId}/products`).set('Authorization', `Bearer ${token}`).send({ sku: ' jacket-001 ', name: 'Circular Jacket', category: 'Apparel' });
    expect(product.status).toBe(201);
    expect(product.body.data.product.sku).toBe('JACKET-001');
    const productId = product.body.data.product._id as string;
    const component = await request(app).post(`/api/v1/organizations/${orgId}/products/${productId}/components`).set('Authorization', `Bearer ${token}`).send({ code: 'SHELL', name: 'Outer shell', quantity: 1, unit: 'piece' });
    expect(component.status).toBe(201);
    const componentId = component.body.data.component._id as string;
    const material = await request(app).post(`/api/v1/organizations/${orgId}/products/${productId}/components/${componentId}/materials`).set('Authorization', `Bearer ${token}`).send({ name: 'Recycled polyester', category: 'textile', mass: 420, massUnit: 'g', recycledContentPct: 85 });
    expect(material.status).toBe(201);
    expect(material.body.data.material.recycledContentPct).toBe(85);
    const listed = await request(app).get(`/api/v1/organizations/${orgId}/products/${productId}/components/${componentId}/materials`).set('Authorization', `Bearer ${token}`);
    expect(listed.body.data.materials).toHaveLength(1);
  });

  it('rejects cross-tenant product reads and product/component mismatches', async () => {
    const owner = await register('catalog-private-owner@example.com');
    const outsider = await register('catalog-private-outsider@example.com');
    const org = await request(app).post('/api/v1/organizations').set('Authorization', `Bearer ${owner}`).send({ name: 'Private Catalog' });
    const orgId = org.body.data.organization._id as string;
    const product = await request(app).post(`/api/v1/organizations/${orgId}/products`).set('Authorization', `Bearer ${owner}`).send({ sku: 'PRIVATE-01', name: 'Private Product' });
    const productId = product.body.data.product._id as string;
    const crossTenant = await request(app).get(`/api/v1/organizations/${orgId}/products/${productId}`).set('Authorization', `Bearer ${outsider}`);
    expect(crossTenant.status).toBe(404);
    const wrongParent = await request(app).get(`/api/v1/organizations/${orgId}/products/${productId}/components/000000000000000000000001/materials`).set('Authorization', `Bearer ${owner}`);
    expect(wrongParent.status).toBe(404);
  });

  it('enforces organization-local product SKU uniqueness and validates composition bounds', async () => {
    const token = await register('catalog-unique-owner@example.com');
    const org = await request(app).post('/api/v1/organizations').set('Authorization', `Bearer ${token}`).send({ name: 'Unique Catalog' });
    const orgId = org.body.data.organization._id as string;
    const path = `/api/v1/organizations/${orgId}/products`;
    const first = await request(app).post(path).set('Authorization', `Bearer ${token}`).send({ sku: 'SKU-1', name: 'Product One' });
    const duplicate = await request(app).post(path).set('Authorization', `Bearer ${token}`).send({ sku: 'sku-1', name: 'Product Duplicate' });
    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(409);
    const badProduct = await request(app).post(path).set('Authorization', `Bearer ${token}`).send({ sku: 'BAD-1', name: 'Bad Product', unexpected: true });
    expect(badProduct.status).toBe(400);
  });
});
