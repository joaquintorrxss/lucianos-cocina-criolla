import {cookies} from 'next/headers';
import {database} from '@/db/raw';
import {tokenHash} from '@/lib/password';
import {SESSION_COOKIE} from '@/lib/auth-http';

export type CurrentUser = {id: string; username: string};
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return database().prepare(`SELECT u.id, u.username FROM auth_sessions s
    JOIN auth_users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.expires_at>? AND u.active=1`)
    .bind(tokenHash(token), Date.now()).first<CurrentUser>();
}
