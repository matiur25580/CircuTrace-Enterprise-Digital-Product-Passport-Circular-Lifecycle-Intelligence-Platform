import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password hashing', () => {
  it('hashes passwords and verifies the original value', async () => {
    const hash = await hashPassword('a-long-password-for-testing-123');

    expect(hash).not.toBe('a-long-password-for-testing-123');
    await expect(verifyPassword('a-long-password-for-testing-123', hash)).resolves.toBe(true);
    await expect(verifyPassword('a-different-password', hash)).resolves.toBe(false);
  });

  it('rejects values that exceed bcrypt byte limits', async () => {
    await expect(hashPassword('x'.repeat(73))).rejects.toThrow();
    await expect(verifyPassword('x'.repeat(73), 'not-a-hash')).resolves.toBe(false);
  });
});
