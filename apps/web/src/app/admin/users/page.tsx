import { fetchApi, User } from '@/lib/api';
import UserActions from '@/components/UserActions';

async function getUsers(): Promise<User[]> {
  try {
    return await fetchApi<User[]>('/api/users');
  } catch {
    return [];
  }
}

export const dynamic = 'force-dynamic';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  BANNED: 'bg-gray-100 text-gray-800',
  INACTIVE: 'bg-orange-100 text-orange-800',
};

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Users</h1>
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
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Points
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Last Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
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
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[user.status] || 'bg-gray-100 text-gray-800'}`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{user.points}/50</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(user.lastActivity).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <UserActions userId={user.id} status={user.status} />
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No users found
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
