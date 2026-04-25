import { fetchApi, Task } from '@/lib/api';

async function getTasks(): Promise<Task[]> {
  try {
    return await fetchApi<Task[]>('/api/tasks');
  } catch {
    return [];
  }
}

export const dynamic = 'force-dynamic';

const statusColors: Record<string, string> = {
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FLAGGED: 'bg-red-100 text-red-800',
};

export default async function TasksPage() {
  const tasks = await getTasks();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Tasks</h1>
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Claimer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tweet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Claimed At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Completed At
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    @{task.claimer.telegramUsername || 'unknown'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <a
                      href={task.tweet.tweetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {task.tweet.tweetUrl}
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[task.status] || 'bg-gray-100 text-gray-800'}`}
                    >
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(task.claimedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {task.completedAt
                      ? new Date(task.completedAt).toLocaleDateString()
                      : '-'}
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No tasks found
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
