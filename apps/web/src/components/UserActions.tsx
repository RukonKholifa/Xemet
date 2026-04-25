'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface UserActionsProps {
  userId: string;
  status: string;
}

export default function UserActions({ userId, status }: UserActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAction(action: string) {
    setLoading(true);
    try {
      await fetch(`/api/users/${userId}/${action}`, {
        method: 'POST',
      });
      router.refresh();
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2">
      {status === 'PENDING' && (
        <>
          <button
            onClick={() => handleAction('approve')}
            disabled={loading}
            className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-md hover:bg-green-200 disabled:opacity-50 transition"
          >
            Approve
          </button>
          <button
            onClick={() => handleAction('reject')}
            disabled={loading}
            className="px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50 transition"
          >
            Reject
          </button>
        </>
      )}
      {(status === 'APPROVED' || status === 'PENDING' || status === 'REJECTED') && (
        <button
          onClick={() => handleAction('ban')}
          disabled={loading}
          className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 transition"
        >
          Ban
        </button>
      )}
      {status === 'BANNED' && (
        <button
          onClick={() => handleAction('unban')}
          disabled={loading}
          className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50 transition"
        >
          Unban
        </button>
      )}
    </div>
  );
}
