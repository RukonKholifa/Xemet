'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface UserActionsProps {
  userId: string;
  status: string;
  username: string;
}

export default function UserActions({ userId, status, username }: UserActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showAddPoints, setShowAddPoints] = useState(false);
  const [pointsAmount, setPointsAmount] = useState('');
  const [toast, setToast] = useState<string | null>(null);

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

  async function handleAddPoints() {
    const amount = parseInt(pointsAmount, 10);
    if (!amount || amount <= 0) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/addpoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      if (res.ok) {
        setToast(`Added ${amount} points to @${username}`);
        setShowAddPoints(false);
        setPointsAmount('');
        router.refresh();
        setTimeout(() => setToast(null), 3000);
      } else {
        const data = await res.json();
        setToast(data.error || 'Failed to add points');
        setTimeout(() => setToast(null), 3000);
      }
    } catch (error) {
      console.error('Failed to add points:', error);
      setToast('Failed to add points');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2 items-center relative">
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

      <button
        onClick={() => setShowAddPoints(true)}
        disabled={loading}
        className="px-3 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 disabled:opacity-50 transition"
      >
        Add Points
      </button>

      {showAddPoints && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-80">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Add Points to @{username}
            </h3>
            <input
              type="number"
              min="1"
              max="50"
              value={pointsAmount}
              onChange={(e) => setPointsAmount(e.target.value)}
              placeholder="Amount to add"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowAddPoints(false);
                  setPointsAmount('');
                }}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPoints}
                disabled={loading || !pointsAmount || parseInt(pointsAmount, 10) <= 0}
                className="px-4 py-2 text-sm text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 transition"
              >
                Add Points
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm">
          {toast}
        </div>
      )}
    </div>
  );
}
