import { createHmac } from 'crypto';

const SECRET = process.env.NEXTAUTH_SECRET || 'default-secret';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

export function getExpectedToken(): string {
  const hmac = createHmac('sha256', SECRET);
  hmac.update('admin-session');
  return `admin_${hmac.digest('hex')}`;
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
