import { prisma } from '@reply-society/db';

const CLAIM_TIMEOUT_MS = 4 * 60 * 60 * 1000;

export async function processTweetQueue() {
  try {
    // Mark expired tasks (4h deadline passed)
    const cutoff = new Date(Date.now() - CLAIM_TIMEOUT_MS);
    const expiredTasks = await prisma.task.updateMany({
      where: {
        status: 'IN_PROGRESS',
        claimedAt: { lt: cutoff },
      },
      data: { status: 'EXPIRED' },
    });
    if (expiredTasks.count > 0) {
      console.log(`[CRON] Expired ${expiredTasks.count} tasks past 4h deadline`);
    }

    // Mark fully completed tweets
    const incompleteTweets = await prisma.tweet.findMany({
      where: { isComplete: false },
    });

    let completedCount = 0;
    for (const tweet of incompleteTweets) {
      if (tweet.filledSlots >= tweet.totalSlots) {
        await prisma.tweet.update({
          where: { id: tweet.id },
          data: { isComplete: true },
        });
        completedCount++;
      }
    }

    if (completedCount > 0) {
      console.log(`[CRON] Completed ${completedCount} fully filled tweets`);
    }
  } catch (error) {
    console.error('[CRON] Error processing tweet queue:', error);
  }
}
