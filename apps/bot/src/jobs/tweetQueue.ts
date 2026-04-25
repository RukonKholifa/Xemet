import { prisma } from '@reply-society/db';

export async function processTweetQueue() {
  try {
    const completedTweets = await prisma.tweet.findMany({
      where: {
        isComplete: false,
      },
    });

    let completedCount = 0;

    for (const tweet of completedTweets) {
      if (tweet.filledSlots >= tweet.totalSlots) {
        await prisma.tweet.update({
          where: { id: tweet.id },
          data: { isComplete: true },
        });
        completedCount++;
      }
    }

    console.log(`[CRON] Processed tweet queue: ${completedCount} tweets completed`);
  } catch (error) {
    console.error('[CRON] Error processing tweet queue:', error);
  }
}
