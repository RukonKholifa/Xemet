import { fetchApi, Tweet } from '@/lib/api';

async function getTweets(): Promise<Tweet[]> {
  try {
    return await fetchApi<Tweet[]>('/api/tweets');
  } catch {
    return [];
  }
}

export const dynamic = 'force-dynamic';

export default async function TweetsPage() {
  const tweets = await getTweets();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Tweet Queue</h1>
      <div className="grid gap-4">
        {tweets.map((tweet) => {
          const progress =
            tweet.totalSlots > 0
              ? Math.round((tweet.filledSlots / tweet.totalSlots) * 100)
              : 0;

          return (
            <div key={tweet.id} className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <a
                    href={tweet.tweetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {tweet.tweetUrl}
                  </a>
                  <p className="text-sm text-gray-500 mt-1">
                    By @{tweet.owner.telegramUsername || 'unknown'} |{' '}
                    {new Date(tweet.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    tweet.isComplete
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {tweet.isComplete ? 'Complete' : 'Active'}
                </span>
              </div>
              <div className="mb-2 flex justify-between text-sm text-gray-600">
                <span>
                  {tweet.filledSlots}/{tweet.totalSlots} slots filled
                </span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    tweet.isComplete ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        })}
        {tweets.length === 0 && (
          <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-500">
            No tweets in queue
          </div>
        )}
      </div>
    </div>
  );
}
