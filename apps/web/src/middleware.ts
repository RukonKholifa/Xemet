import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'admin_session';

async function getExpectedToken(): Promise<string> {
  const secret = process.env.NEXTAUTH_SECRET || 'default-secret';
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode('admin-session'));
  const hex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `admin_${hex}`;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin') || pathname.startsWith('/api/users')) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
    const expectedToken = await getExpectedToken();

    if (!sessionCookie || sessionCookie !== expectedToken) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/users/:path*'],
};
