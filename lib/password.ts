import {randomBytes, scrypt, createHash, timingSafeEqual} from 'node:crypto';
import {Buffer} from 'node:buffer';

// OWASP's scrypt option for a 16 MiB memory budget; parameters are versioned.
const options = {N: 16384, r: 8, p: 5, maxmem: 32 * 1024 * 1024};
const prefix = 'scrypt$16384$8$5';
const dummyHash = `${prefix}$${'00'.repeat(16)}$${'00'.repeat(32)}`;
function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 32, options, (error, result) => error ? reject(error) : resolve(result));
  });
}
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 16 || password.length > 256) throw new Error('Contraseña fuera del tamaño permitido.');
  const salt = randomBytes(16);
  return `${prefix}$${salt.toString('hex')}$${(await derive(password, salt)).toString('hex')}`;
}
export async function verifyPassword(password: string, encoded: string | null): Promise<boolean> {
  const valid = typeof encoded === 'string' && /^scrypt\$16384\$8\$5\$[a-f0-9]{32}\$[a-f0-9]{64}$/.test(encoded);
  const parts = (valid ? encoded : dummyHash).split('$');
  const result = await derive(password, Buffer.from(parts[4], 'hex'));
  return timingSafeEqual(result, Buffer.from(parts[5], 'hex')) && valid;
}
export function createSessionToken(): string { return randomBytes(32).toString('hex'); }
export function tokenHash(token: string): string { return createHash('sha256').update(token).digest('hex'); }
export function normalizeUsername(value: string): string { return value.trim().toLowerCase(); }
