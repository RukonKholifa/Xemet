const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export interface Stats {
  totalUsers: number;
  totalPoints: number;
  activeUsers: number;
  pendingUsers: number;
  activeTweets: number;
  flaggedTasks: number;
}

export interface User {
  id: string;
  telegramId: string;
  telegramUsername: string | null;
  xProfileUrl: string | null;
  status: string;
  points: number;
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tweet {
  id: string;
  ownerUserId: string;
  tweetUrl: string;
  totalSlots: number;
  filledSlots: number;
  isComplete: boolean;
  createdAt: string;
  owner: { telegramUsername: string | null };
}

export interface Task {
  id: string;
  claimerUserId: string;
  tweetId: string;
  status: string;
  claimedAt: string;
  completedAt: string | null;
  claimer: { telegramUsername: string | null };
  tweet: { tweetUrl: string };
}

export interface LeaderboardEntry {
  username: string;
  xProfileUrl: string | null;
  engagementsGiven: number;
}
