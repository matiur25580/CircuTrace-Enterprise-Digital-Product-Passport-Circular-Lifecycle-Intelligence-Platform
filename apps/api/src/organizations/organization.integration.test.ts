import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { InvitationModel } from './invitation.model.js';
import { MembershipModel } from './membership.model.js';
import { OrganizationModel } from './organization.model.js';
import { UserModel } from '../models/user.model.js';

const mongoUri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/circutrace_test';
async function register(email: string) {
  const response = await request(app).post('/api/v1/auth/register').send({ displayName: 'Tenant Test', email, password: 'a-strong-password-for-tenant-tests' });
  expect(response.status).toBe(201);
  return response.body.data.accessToken as string;
}
describe('organization tenant boundaries (MongoDB integration)', () => {
  beforeAll(async () => { await mongoose.connect(mongoUri); });
  beforeEach(async () => {
    await Promise.all([InvitationModel.deleteMany({}), MembershipModel.deleteMany({}), OrganizationModel.deleteMany({}), UserModel.deleteMany({})]);
  });
  afterAll(async () => { await mongoose.disconnect(); });

  it('creates an organization with an owner membership and lists only joined tenants', async () => {
    const owner = await register('tenant-owner@example.com');
    const created = await request(app).post('/api/v1/organizations').set('Authorization', `Bearer ${owner}`).send({ name: 'Acme Circular' });
    expect(created.status).toBe(201);
    expect(created.body.data.role).toBe('owner');
    const memberships = await MembershipModel.find({ organizationId: created.body.data.organization._id }).lean();
    expect(memberships).toHaveLength(1);
    expect(memberships[0]?.role).toBe('owner');
    const listed = await request(app).get('/api/v1/organizations').set('Authorization', `Bearer ${owner}`);
    expect(listed.body.data.organizations).toHaveLength(1);
  });

  it('denies cross-tenant IDOR reads and role escalation', async () => {
    const ownerA = await register('owner-a@example.com');
    const ownerB = await register('owner-b@example.com');
    const a = await request(app).post('/api/v1/organizations').set('Authorization', `Bearer ${ownerA}`).send({ name: 'Tenant A' });
    const b = await request(app).post('/api/v1/organizations').set('Authorization', `Bearer ${ownerB}`).send({ name: 'Tenant B' });
    const outsiderRead = await request(app).get(`/api/v1/organizations/${b.body.data.organization._id}`).set('Authorization', `Bearer ${ownerA}`);
    expect(outsiderRead.status).toBe(404);
    const outsiderUpdate = await request(app).patch(`/api/v1/organizations/${b.body.data.organization._id}`).set('Authorization', `Bearer ${ownerA}`).send({ name: 'Compromised' });
    expect(outsiderUpdate.status).toBe(404);
    expect(a.status).toBe(201);
  });

  it('issues an invitation, enforces email ownership, and accepts it once', async () => {
    const owner = await register('inviter@example.com');
    const invitee = await register('invitee@example.com');
    const wrongUser = await register('wrong-user@example.com');
    const org = await request(app).post('/api/v1/organizations').set('Authorization', `Bearer ${owner}`).send({ name: 'Invitation Tenant' });
    const orgId = org.body.data.organization._id as string;
    const invitation = await request(app).post(`/api/v1/organizations/${orgId}/invitations`).set('Authorization', `Bearer ${owner}`).send({ email: 'invitee@example.com', role: 'member' });
    expect(invitation.status).toBe(201);
    const token = invitation.body.data.token as string;
    const wrongAcceptance = await request(app).post('/api/v1/organizations/invitations/accept').set('Authorization', `Bearer ${wrongUser}`).send({ token });
    expect(wrongAcceptance.status).toBe(403);
    const accepted = await request(app).post('/api/v1/organizations/invitations/accept').set('Authorization', `Bearer ${invitee}`).send({ token });
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.role).toBe('member');
    const replay = await request(app).post('/api/v1/organizations/invitations/accept').set('Authorization', `Bearer ${invitee}`).send({ token });
    expect(replay.status).toBe(400);
    const memberList = await request(app).get(`/api/v1/organizations/${orgId}/members`).set('Authorization', `Bearer ${owner}`);
    expect(memberList.body.data.members).toHaveLength(2);
  });

  it('prevents assigning a second owner and preserves a single owner boundary', async () => {
    const owner = await register('single-owner@example.com');
    const member = await register('future-owner@example.com');
    const org = await request(app).post('/api/v1/organizations').set('Authorization', `Bearer ${owner}`).send({ name: 'Single Owner Tenant' });
    const orgId = org.body.data.organization._id as string;
    const invite = await request(app).post(`/api/v1/organizations/${orgId}/invitations`).set('Authorization', `Bearer ${owner}`).send({ email: 'future-owner@example.com', role: 'member' });
    await request(app).post('/api/v1/organizations/invitations/accept').set('Authorization', `Bearer ${member}`).send({ token: invite.body.data.token });
    const membership = await MembershipModel.findOne({ organizationId: orgId, userId: (await UserModel.findOne({ email: 'future-owner@example.com' }))!._id });
    const promotion = await request(app).patch(`/api/v1/organizations/${orgId}/members/${membership!._id}`).set('Authorization', `Bearer ${owner}`).send({ role: 'owner' });
    expect(promotion.status).toBe(409);
    expect(await MembershipModel.countDocuments({ organizationId: orgId, role: 'owner', status: 'active' })).toBe(1);
  });

  it('rejects revoked and expired invitations without creating memberships', async () => {
    const owner = await register('invite-admin@example.com');
    const invitee = await register('revoked-invitee@example.com');
    const org = await request(app).post('/api/v1/organizations').set('Authorization', `Bearer ${owner}`).send({ name: 'Invitation Lifecycle Tenant' });
    const orgId = org.body.data.organization._id as string;
    const revoked = await request(app).post(`/api/v1/organizations/${orgId}/invitations`).set('Authorization', `Bearer ${owner}`).send({ email: 'revoked-invitee@example.com', role: 'member' });
    const revokedId = revoked.body.data.invitation.id as string;
    const revokeResponse = await request(app).delete(`/api/v1/organizations/${orgId}/invitations/${revokedId}`).set('Authorization', `Bearer ${owner}`);
    expect(revokeResponse.status).toBe(204);
    const revokedAcceptance = await request(app).post('/api/v1/organizations/invitations/accept').set('Authorization', `Bearer ${invitee}`).send({ token: revoked.body.data.token });
    expect(revokedAcceptance.status).toBe(400);

    const expired = await request(app).post(`/api/v1/organizations/${orgId}/invitations`).set('Authorization', `Bearer ${owner}`).send({ email: 'revoked-invitee@example.com', role: 'viewer' });
    await InvitationModel.updateOne({ _id: expired.body.data.invitation.id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    const expiredAcceptance = await request(app).post('/api/v1/organizations/invitations/accept').set('Authorization', `Bearer ${invitee}`).send({ token: expired.body.data.token });
    expect(expiredAcceptance.status).toBe(400);
    expect(await MembershipModel.countDocuments({ organizationId: orgId, userId: (await UserModel.findOne({ email: 'revoked-invitee@example.com' }))!._id })).toBe(0);
  });

  it('prevents members from changing organization settings or promoting themselves', async () => {
    const owner = await register('role-owner@example.com');
    const member = await register('role-member@example.com');
    const org = await request(app).post('/api/v1/organizations').set('Authorization', `Bearer ${owner}`).send({ name: 'Role Tenant' });
    const orgId = org.body.data.organization._id as string;
    const invite = await request(app).post(`/api/v1/organizations/${orgId}/invitations`).set('Authorization', `Bearer ${owner}`).send({ email: 'role-member@example.com', role: 'member' });
    await request(app).post('/api/v1/organizations/invitations/accept').set('Authorization', `Bearer ${member}`).send({ token: invite.body.data.token });
    const membership = await MembershipModel.findOne({ organizationId: orgId, userId: (await UserModel.findOne({ email: 'role-member@example.com' }))!._id });
    const escalation = await request(app).patch(`/api/v1/organizations/${orgId}/members/${membership!._id}`).set('Authorization', `Bearer ${member}`).send({ role: 'owner' });
    expect(escalation.status).toBe(403);
  });
});
