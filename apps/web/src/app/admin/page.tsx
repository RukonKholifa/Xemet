import { fetchApi, Stats } from '@/lib/api';

async function getStats(): Promise<Stats> {
  try {
    return await fetchApi<Stats>('/api/stats');
  } catch {
    return {
      totalUsers: 0,
      totalPoints: 0,
      activeUsers: 0,
      pendingUsers: 0,
      activeTweets: 0,
      flaggedTasks: 0,
    };
  }
}

export const dynamic = 'force-dynamic';

export default async function AdminOverview() {
  const stats = await getStats();

  const cards = [
    { label: 'Total Users', value: stats.totalUsers, color: 'bg-blue-500' },
    { label: 'Total Points Distributed', value: stats.totalPoints, color: 'bg-green-500' },
    { label: 'Active Users (7d)', value: stats.activeUsers, color: 'bg-purple-500' },
    { label: 'Pending Approval', value: stats.pendingUsers, color: 'bg-yellow-500' },
    { label: 'Active Tweets', value: stats.activeTweets, color: 'bg-indigo-500' },
    { label: 'Flagged Tasks', value: stats.flaggedTasks, color: 'bg-red-500' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className={`${card.color} h-2`} />
            <div className="p-6">
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{card.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
