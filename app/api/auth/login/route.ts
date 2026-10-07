import {database} from '@/db/raw';
import {Buffer} from 'node:buffer';
import {createSessionToken, normalizeUsername, tokenHash, verifyPassword} from '@/lib/password';
import {safeAuthOrigin, sessionCookie, SESSION_SECONDS} from '@/lib/auth-http';

export const dynamic = 'force-dynamic';
const json = (error: string, status: number) => Response.json({error}, {status, headers: {'Cache-Control': 'no-store'}});
async function claimAttempt(key: string, limit: number, now: number): Promise<boolean> {
  const row = await database().prepare(`INSERT INTO auth_attempts (key, window_start, attempts) VALUES (?, ?, 1)
    ON CONFLICT(key) DO UPDATE SET
      attempts=CASE WHEN window_start<=? THEN 1 ELSE attempts+1 END,
      window_start=CASE WHEN window_start<=? THEN excluded.window_start ELSE window_start END
    WHERE window_start<=? OR attempts<? RETURNING attempts`)
    .bind(tokenHash(key), now, now-900000, now-900000, now-900000, limit).first();
  return Boolean(row);
}
export async function POST(req: Request) {
  let stage='origin';
  if (!safeAuthOrigin(req)) return json('Origen no permitido.', 403);
  if (!req.headers.get('content-type')?.startsWith('application/json')) return json('Solicitud inválida.', 400);
  if (Number(req.headers.get('content-length') ?? 0) > 4096) return json('Solicitud demasiado grande.', 413);
  try {
    stage='read-body';
    // Bound the stream as well as Content-Length; untrusted clients can omit the header.
    const reader = req.body?.getReader();
    if (!reader) return json('Solicitud inválida.', 400);
    let length = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 4096) { await reader.cancel().catch(() => undefined); return json('Solicitud demasiado grande.', 413); }
      chunks.push(value);
    }
    let body: {username?: unknown; password?: unknown};
    stage='parse-body';
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return json('Solicitud inválida.', 400); }
    if (!body || typeof body.username !== 'string' || typeof body.password !== 'string'
      || body.username.length > 120 || body.password.length > 256 || !body.password.length) return json('Revisa el usuario y la contraseña.', 400);
    const username = normalizeUsername(body.username);
    const now = Date.now();
    const ip = req.headers.get('cf-connecting-ip') ?? 'local';
    const db = database();
    stage='throttle';
    await db.prepare('DELETE FROM auth_attempts WHERE window_start<?').bind(now-900000).run();
    if (!await claimAttempt(`ip:${ip}`, 40, now)
      || !await claimAttempt(`user:${username}`, 30, now)
      || !await claimAttempt(`pair:${ip}:${username}`, 8, now)) {
      return Response.json({error: 'Demasiados intentos. Espera 15 minutos antes de volver a ingresar.'},
        {status: 429, headers: {'Cache-Control': 'no-store', 'Retry-After': '900'}});
    }
    const user = await db.prepare('SELECT id, password_hash, active, auth_version FROM auth_users WHERE username=?')
      .bind(username).first<{id: string; password_hash: string; active: number; auth_version:number}>();
    stage='verify-password';
    const valid = await verifyPassword(body.password, user?.password_hash ?? null);
    if (!valid || !user || user.active !== 1) return json('Usuario o contraseña incorrectos.', 401);
    const token = createSessionToken();
    stage='create-session';
    await db.prepare('DELETE FROM auth_sessions WHERE expires_at<=?').bind(now).run();
    await db.prepare('INSERT INTO auth_sessions (token_hash, user_id, expires_at,auth_version) VALUES (?, ?, ?,?)')
      .bind(tokenHash(token), user.id, now+SESSION_SECONDS*1000,user.auth_version).run();
    return Response.json({ok: true}, {headers: {'Cache-Control': 'no-store', 'Set-Cookie': sessionCookie(token, req.url)}});
  } catch (error) {
    // Diagnostics deliberately omit passwords, request bodies, hashes and tokens.
    console.error('Login failure',stage,error instanceof Error?error.name:'UnknownError');
    return json('No se pudo iniciar sesión. Intenta nuevamente.', 503);
  }
}
