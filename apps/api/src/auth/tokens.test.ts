import { describe, expect, it } from 'vitest';
import { createAccessToken, createRefreshToken, hashRefreshToken, verifyAccessToken } from './tokens.js';

describe('authentication tokens', () => {
  it('signs and verifies access tokens with user and session claims', async () => {
    const token = await createAccessToken('user-123', 'session-456');

    await expect(verifyAccessToken(token)).resolves.toEqual({
      userId: 'user-123',
      sessionId: 'session-456',
    });
  });

  it('rejects malformed access tokens', async () => {
    await expect(verifyAccessToken('not-a-jwt')).resolves.toBeNull();
  });

  it('generates opaque refresh tokens and deterministic one-way hashes', () => {
    const first = createRefreshToken();
    const second = createRefreshToken();

    expect(first).not.toBe(second);
    expect(hashRefreshToken(first)).toHaveLength(64);
    expect(hashRefreshToken(first)).toBe(hashRefreshToken(first));
    expect(hashRefreshToken(first)).not.toBe(first);
  });
});
