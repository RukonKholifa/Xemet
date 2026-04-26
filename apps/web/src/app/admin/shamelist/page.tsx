import { fetchApi, User } from '@/lib/api';
import UserActions from '@/components/UserActions';

interface FlaggedUser extends User {
  _count?: { tasks: number };
}

async function getFlaggedUsers(): Promise<FlaggedUser[]> {
  try {
    const users = await fetchApi<User[]>('/api/users');
    return users.filter((u) => u.status !== 'BANNED');
  } catch {
    return [];
  }
}

async function getFlaggedTasks(): Promise<
  Array<{ claimerUserId: string; count: number }>
> {
  try {
    const tasks = await fetchApi<
      Array<{
        claimerUserId: string;
        status: string;
        claimer: { telegramUsername: string | null };
      }>
    >('/api/tasks');
    const flagged = tasks.filter((t) => t.status === 'FLAGGED');
    const grouped = new Map<string, number>();
    for (const task of flagged) {
      grouped.set(task.claimerUserId, (grouped.get(task.claimerUserId) || 0) + 1);
    }
    return Array.from(grouped.entries()).map(([claimerUserId, count]) => ({
      claimerUserId,
      count,
    }));
  } catch {
    return [];
  }
}

export const dynamic = 'force-dynamic';

export default async function ShamelistPage() {
  const [users, flaggedTasks] = await Promise.all([
    getFlaggedUsers(),
    getFlaggedTasks(),
  ]);

  const flaggedUserIds = new Set(flaggedTasks.map((ft) => ft.claimerUserId));
  const flaggedUsers = users.filter((u) => flaggedUserIds.has(u.id));
  const flagCountMap = new Map(
    flaggedTasks.map((ft) => [ft.claimerUserId, ft.count]),
  );

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Shame List</h1>
      <p className="text-gray-600 mb-6">
        Users who have been flagged for incomplete or skipped engagement tasks.
      </p>
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  X Profile
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Flagged Tasks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {flaggedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    @{user.telegramUsername || 'unknown'}
                  </td>
                  <td className="px-6 py-4 text-sm text-blue-600">
                    {user.xProfileUrl ? (
                      <a
                        href={user.xProfileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {user.xProfileUrl}
                      </a>
                    ) : (
                      <span className="text-gray-400">Not set</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-red-600">
                    {flagCountMap.get(user.id) || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{user.status}</td>
                  <td className="px-6 py-4">
                    <UserActions userId={user.id} status={user.status} username={user.telegramUsername || 'unknown'} />
                  </td>
                </tr>
              ))}
              {flaggedUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No flagged users
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
