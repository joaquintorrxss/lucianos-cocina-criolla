import {cookies} from 'next/headers';
import {database} from '@/db/raw';
import {tokenHash} from '@/lib/password';
import {safeAuthOrigin, sessionCookie, SESSION_COOKIE} from '@/lib/auth-http';
export async function POST(req: Request) {
  if (!safeAuthOrigin(req)) return Response.json({error: 'Origen no permitido.'}, {status: 403});
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token && /^[a-f0-9]{64}$/.test(token)) await database().prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(tokenHash(token)).run();
    return Response.json({ok: true}, {headers: {'Cache-Control': 'no-store', 'Set-Cookie': sessionCookie('', req.url, true)}});
  } catch { return Response.json({error: 'No se pudo cerrar la sesión. Reintenta.'}, {status: 503}); }
}
