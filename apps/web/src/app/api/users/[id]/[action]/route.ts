import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_SECRET = process.env.API_SECRET || '';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; action: string } },
) {
  const { id, action } = params;

  const validActions = ['approve', 'reject', 'ban', 'unban', 'addpoints'];
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (API_SECRET) {
    headers['Authorization'] = `Bearer ${API_SECRET}`;
  }

  let body: string | undefined;
  if (action === 'addpoints') {
    const data = await req.json();
    body = JSON.stringify(data);
  }

  const res = await fetch(`${API_BASE}/api/users/${id}/${action}`, {
    method: 'POST',
    headers,
    body,
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
