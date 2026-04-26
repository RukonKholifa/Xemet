import cron from 'node-cron';
import { Telegraf } from 'telegraf';
import { cleanupInactiveUsers } from './inactiveUsers';
import { processTweetQueue } from './tweetQueue';

export function startCronJobs(bot: Telegraf) {
  // Every day at midnight — cleanup inactive users
  cron.schedule('0 0 * * *', () => {
    console.log('[CRON] Running inactive user cleanup...');
    cleanupInactiveUsers(bot);
  });

  // Every hour — process tweet queue
  cron.schedule('0 * * * *', () => {
    console.log('[CRON] Processing tweet queue...');
    processTweetQueue();
  });

  console.log('[CRON] Scheduled jobs started');
}
