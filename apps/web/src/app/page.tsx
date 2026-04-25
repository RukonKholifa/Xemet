import { fetchApi, LeaderboardEntry } from '@/lib/api';

async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    return await fetchApi<LeaderboardEntry[]>('/api/leaderboard');
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const leaderboard = await getLeaderboard();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <nav className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Reply Society Champs</h1>
          <a
            href="/admin"
            className="text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition"
          >
            Admin Dashboard
          </a>
        </nav>
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h2 className="text-5xl font-extrabold mb-6">
            Grow Your Twitter/X Engagement
          </h2>
          <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
            Join the engagement exchange community. Earn points by engaging with others&apos;
            tweets, then spend them to boost your own content.
          </p>
          <a
            href={`https://t.me/${process.env.NEXT_PUBLIC_BOT_USERNAME || 'EngageSwapXBot'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-white text-blue-700 font-bold px-8 py-4 rounded-xl text-lg hover:bg-blue-50 transition shadow-lg"
          >
            Join via Telegram Bot
          </a>
        </div>
      </header>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center mb-12 text-gray-800">How It Works</h3>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="text-4xl mb-4">1</div>
            <h4 className="text-xl font-semibold mb-3 text-gray-800">Link Your X Profile</h4>
            <p className="text-gray-600">
              Start the bot on Telegram and link your Twitter/X profile. An admin will
              verify your account.
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="text-4xl mb-4">2</div>
            <h4 className="text-xl font-semibold mb-3 text-gray-800">Earn Points</h4>
            <p className="text-gray-600">
              Use /claim to receive engagement tasks. Like, reply, or repost others&apos;
              tweets to earn points. 1 task = 1 point (max 50).
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="text-4xl mb-4">3</div>
            <h4 className="text-xl font-semibold mb-3 text-gray-800">Spend Points</h4>
            <p className="text-gray-600">
              Use /use to spend your points. Submit a tweet and choose how many
              engagements you want. Others will engage with your content!
            </p>
          </div>
        </div>
      </section>

      {/* Rules */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12 text-gray-800">Rules</h3>
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md p-8">
            <ul className="space-y-4 text-gray-700">
              <li className="flex items-start">
                <span className="text-blue-600 font-bold mr-3">*</span>
                1 point = 1 engagement on your tweet
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 font-bold mr-3">*</span>
                Maximum 50 points per user at any time
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 font-bold mr-3">*</span>
                No activity for 7 days = automatic removal
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 font-bold mr-3">*</span>
                Incomplete tasks may result in being flagged or banned
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 font-bold mr-3">*</span>
                Rate limit: 1 claim or use per 10 minutes
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Leaderboard */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center mb-12 text-gray-800">
          Leaderboard - Top Engagers
        </h3>
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
          {leaderboard.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No engagements yet. Be the first to join!
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Engagements Given
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leaderboard.map((entry, index) => (
                  <tr key={entry.username} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      #{index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      @{entry.username}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {entry.engagementsGiven}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>Reply Society Champs Bot - Twitter/X Engagement Exchange</p>
          <p className="mt-2 text-sm">
            Powered by Telegram | Built with Next.js
          </p>
        </div>
      </footer>
    </div>
  );
}
