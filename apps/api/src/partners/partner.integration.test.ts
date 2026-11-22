import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { UserModel } from '../models/user.model.js';
import { InvitationModel } from '../organizations/invitation.model.js';
import { MembershipModel } from '../organizations/membership.model.js';
import { OrganizationModel } from '../organizations/organization.model.js';
import { PartnerModel } from './partner.model.js';

const mongoUri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/circutrace_test';
async function register(email: string) {
  const response = await request(app).post('/api/v1/auth/register').send({ displayName: 'Partner Test', email, password: 'a-strong-password-for-partner-tests' });
  expect(response.status).toBe(201);
  return response.body.data.accessToken as string;
}
describe('partner network tenant boundaries (MongoDB integration)', () => {
  beforeAll(async () => { await mongoose.connect(mongoUri); });
  beforeEach(async () => {
    await Promise.all([
      PartnerModel.deleteMany({}), InvitationModel.deleteMany({}), MembershipModel.deleteMany({}),
      OrganizationModel.deleteMany({}), UserModel.deleteMany({}),
    ]);
  });
  afterAll(async () => { await mongoose.disconnect(); });

  it('creates and lists partners only inside the active organization', async () => {
    const ownerA = await register('partner-owner-a@example.com');
    const ownerB = await register('partner-owner-b@example.com');
    const orgA = await request(app).post('/api/v1/organizations').set('Authorization', `Bearer ${ownerA}`).send({ name: 'Partner Tenant A' });
    const orgB = await request(app).post('/api/v1/organizations').set('Authorization', `Bearer ${ownerB}`).send({ name: 'Partner Tenant B' });
    const idA = orgA.body.data.organization._id as string;
    const idB = orgB.body.data.organization._id as string;
    const created = await request(app).post(`/api/v1/organizations/${idA}/partners`).set('Authorization', `Bearer ${ownerA}`).send({
      name: 'Northstar Materials', type: 'supplier', countryCode: 'DE', contact: { name: 'Alex', email: 'alex@example.com' }, externalReference: 'SUP-001',
    });
    expect(created.status).toBe(201);
    expect(created.body.data.partner.status).toBe('active');
    expect(created.body.data.partner.countryCode).toBe('DE');
    const visible = await request(app).get(`/api/v1/organizations/${idA}/partners`).set('Authorization', `Bearer ${ownerA}`);
    const hidden = await request(app).get(`/api/v1/organizations/${idB}/partners`).set('Authorization', `Bearer ${ownerB}`);
    expect(visible.body.data.partners).toHaveLength(1);
    expect(hidden.body.data.partners).toHaveLength(0);
  });

  it('prevents cross-tenant reads and writes even when a partner id is known', async () => {
    const owner = await register('partner-owner@example.com');
    const outsider = await register('partner-outsider@example.com');
    const org = await request(app).post('/api/v1/organizations').set('Authorization', `Bearer ${owner}`).send({ name: 'Private Partner Tenant' });
    const partner = await request(app).post(`/api/v1/organizations/${org.body.data.organization._id}/partners`).set('Authorization', `Bearer ${owner}`).send({ name: 'Private Supplier', type: 'supplier' });
    const partnerId = partner.body.data.partner._id as string;
    const read = await request(app).get(`/api/v1/organizations/${org.body.data.organization._id}/partners/${partnerId}`).set('Authorization', `Bearer ${outsider}`);
    const update = await request(app).patch(`/api/v1/organizations/${org.body.data.organization._id}/partners/${partnerId}`).set('Authorization', `Bearer ${outsider}`).send({ name: 'Stolen Partner' });
    expect(read.status).toBe(404);
    expect(update.status).toBe(404);
    expect((await PartnerModel.findById(partnerId))?.name).toBe('Private Supplier');
  });

  it('allows members to read but requires admin-level membership to manage partner records', async () => {
    const owner = await register('partner-role-owner@example.com');
    const member = await register('partner-role-member@example.com');
    const org = await request(app).post('/api/v1/organizations').set('Authorization', `Bearer ${owner}`).send({ name: 'Partner Role Tenant' });
    const orgId = org.body.data.organization._id as string;
    const invite = await request(app).post(`/api/v1/organizations/${orgId}/invitations`).set('Authorization', `Bearer ${owner}`).send({ email: 'partner-role-member@example.com', role: 'member' });
    await request(app).post('/api/v1/organizations/invitations/accept').set('Authorization', `Bearer ${member}`).send({ token: invite.body.data.token });
    const createAsMember = await request(app).post(`/api/v1/organizations/${orgId}/partners`).set('Authorization', `Bearer ${member}`).send({ name: 'Not Allowed Supplier', type: 'supplier' });
    expect(createAsMember.status).toBe(403);
    const created = await request(app).post(`/api/v1/organizations/${orgId}/partners`).set('Authorization', `Bearer ${owner}`).send({ name: 'Readable Supplier', type: 'supplier' });
    const readAsMember = await request(app).get(`/api/v1/organizations/${orgId}/partners`).set('Authorization', `Bearer ${member}`);
    expect(readAsMember.body.data.partners).toHaveLength(1);
    expect(created.status).toBe(201);
  });

  it('validates partner input, enforces unique external references and supports lifecycle status changes', async () => {
    const owner = await register('partner-validation-owner@example.com');
    const org = await request(app).post('/api/v1/organizations').set('Authorization', `Bearer ${owner}`).send({ name: 'Partner Validation Tenant' });
    const orgId = org.body.data.organization._id as string;
    const invalid = await request(app).post(`/api/v1/organizations/${orgId}/partners`).set('Authorization', `Bearer ${owner}`).send({ name: 'x', type: 'unknown' });
    expect(invalid.status).toBe(400);
    const first = await request(app).post(`/api/v1/organizations/${orgId}/partners`).set('Authorization', `Bearer ${owner}`).send({ name: 'Reference One', type: 'manufacturer', externalReference: 'ERP-42' });
    const duplicate = await request(app).post(`/api/v1/organizations/${orgId}/partners`).set('Authorization', `Bearer ${owner}`).send({ name: 'Reference Two', type: 'supplier', externalReference: 'ERP-42' });
    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(409);
    const suspended = await request(app).patch(`/api/v1/organizations/${orgId}/partners/${first.body.data.partner._id}/status`).set('Authorization', `Bearer ${owner}`).send({ status: 'suspended' });
    expect(suspended.body.data.partner.status).toBe('suspended');
    const filtered = await request(app).get(`/api/v1/organizations/${orgId}/partners?status=active`).set('Authorization', `Bearer ${owner}`);
    expect(filtered.body.data.partners).toHaveLength(0);
  });
});
