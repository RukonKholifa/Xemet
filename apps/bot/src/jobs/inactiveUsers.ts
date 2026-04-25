import { Telegraf } from 'telegraf';
import { prisma } from '@reply-society/db';
import { config } from '../config';
import { messages } from '../messages';

export async function cleanupInactiveUsers(bot: Telegraf) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.inactivityDays);

    const inactiveUsers = await prisma.user.findMany({
      where: {
        lastActivity: { lt: cutoffDate },
        status: { in: ['APPROVED', 'PENDING'] },
      },
    });

    for (const user of inactiveUsers) {
      await prisma.user.update({
        where: { id: user.id },
        data: { status: 'INACTIVE' },
      });

      try {
        await bot.telegram.sendMessage(user.telegramId, messages.inactiveNotice, {
          parse_mode: 'Markdown',
        });
      } catch (err) {
        console.error(`Failed to notify inactive user ${user.telegramId}:`, err);
      }
    }

    console.log(`[CRON] Marked ${inactiveUsers.length} users as inactive`);
  } catch (error) {
    console.error('[CRON] Error cleaning up inactive users:', error);
  }
}
