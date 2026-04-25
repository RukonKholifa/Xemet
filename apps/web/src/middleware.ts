import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'admin_session';

function getExpectedToken(): string {
  const secret = process.env.NEXTAUTH_SECRET || 'default-secret';
  const encoder = new TextEncoder();
  const data = encoder.encode(`admin-session:${secret}`);
  let hash = 0;
  for (const byte of data) {
    hash = ((hash << 5) - hash + byte) | 0;
  }
  return `admin_${Math.abs(hash).toString(36)}`;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin') || pathname.startsWith('/api/users')) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
    const expectedToken = getExpectedToken();

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
