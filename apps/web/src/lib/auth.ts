const SECRET = process.env.NEXTAUTH_SECRET || 'default-secret';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

export function getExpectedToken(): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(`admin-session:${SECRET}`);
  let hash = 0;
  for (const byte of data) {
    hash = ((hash << 5) - hash + byte) | 0;
  }
  return `admin_${Math.abs(hash).toString(36)}`;
}

export function validatePassword(password: string): boolean {
  if (!ADMIN_PASSWORD) return false;
  return password === ADMIN_PASSWORD;
}

export function isValidSession(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  return cookieValue === getExpectedToken();
}

export const SESSION_COOKIE = 'admin_session';
