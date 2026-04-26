import { NextRequest, NextResponse } from 'next/server';
import { validatePassword, getExpectedToken, SESSION_COOKIE } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { password } = body;

  if (!password || !validatePassword(password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, getExpectedToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
