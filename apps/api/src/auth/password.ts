import bcrypt from 'bcryptjs';

const BCRYPT_COST = 12;

export async function hashPassword(password: string): Promise<string> {
  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Password exceeds the supported byte length.');
  }

  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  if (Buffer.byteLength(password, 'utf8') > 72) return false;
  return bcrypt.compare(password, passwordHash);
}
