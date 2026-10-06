export const SESSION_COOKIE = 'lucianos_session';
export const SESSION_SECONDS = 12 * 60 * 60;
export function safeAuthOrigin(req: Request): boolean {
  const url = new URL(req.url);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  return (url.protocol === 'https:' || loopback) && req.headers.get('origin') === url.origin;
}
export function sessionCookie(token: string, url: string, clear = false): string {
  const secure = new URL(url).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${clear ? '' : token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : SESSION_SECONDS}${secure}`;
}
