'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="ml-2 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition"
    >
      Logout
    </button>
  );
}
