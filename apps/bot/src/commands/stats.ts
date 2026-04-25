import { Context, Markup } from 'telegraf';
import { prisma } from '@reply-society/db';
import { messages } from '../messages';
import { clearAllFlows } from '../state';

export async function myStatusCommand(ctx: Context) {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    clearAllFlows(telegramId);

    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) {
      await ctx.reply(messages.notApproved);
      return;
    }

    const name = ctx.from?.first_name || 'Unknown';
    const text = messages.myStatus(name, user.telegramUsername, user.xProfileUrl, user.points, user.status);

    await ctx.reply(text, Markup.inlineKeyboard([
      [Markup.button.callback('⬅️ Back to Home', 'go_home')],
    ]));
  } catch (error) {
    console.error('Error in my status command:', error);
    await ctx.reply(messages.error);
  }
}

export async function myStatsCommand(ctx: Context) {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    clearAllFlows(telegramId);

    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) {
      await ctx.reply(messages.notApproved);
      return;
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [weeklyEngagements, weeklyTweetsUsed, allTimeEngagements, allTimeTweetsUsed, completedMissions, cancelledMissions, expiredMissions] =
      await Promise.all([
        prisma.task.count({
          where: { claimerUserId: user.id, status: 'COMPLETED', completedAt: { gte: sevenDaysAgo } },
        }),
        prisma.tweet.aggregate({
          where: { ownerUserId: user.id, createdAt: { gte: sevenDaysAgo } },
          _sum: { totalSlots: true },
        }),
        prisma.task.count({
          where: { claimerUserId: user.id, status: 'COMPLETED' },
        }),
        prisma.tweet.aggregate({
          where: { ownerUserId: user.id },
          _sum: { totalSlots: true },
        }),
        prisma.task.count({
          where: { claimerUserId: user.id, status: 'COMPLETED' },
        }),
        prisma.task.count({
          where: { claimerUserId: user.id, status: 'CANCELLED' },
        }),
        prisma.task.count({
          where: { claimerUserId: user.id, status: 'EXPIRED' },
        }),
      ]);

    const weekly = {
      engagements: weeklyEngagements,
      earned: weeklyEngagements,
      spent: weeklyTweetsUsed._sum.totalSlots || 0,
    };

    const allTime = {
      engagements: allTimeEngagements,
      earned: allTimeEngagements,
      spent: allTimeTweetsUsed._sum.totalSlots || 0,
      completed: completedMissions,
      cancelled: cancelledMissions,
      expired: expiredMissions,
    };

    const text = messages.myStats(weekly, allTime, user.points);

    await ctx.reply(text, Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Refresh', 'my_stats'), Markup.button.callback('🏠 Back to Home', 'go_home')],
    ]));
  } catch (error) {
    console.error('Error in my stats command:', error);
    await ctx.reply(messages.error);
  }
}
