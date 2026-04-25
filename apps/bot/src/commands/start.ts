import { Context, Markup } from 'telegraf';
import { prisma } from '@reply-society/db';
import { messages } from '../messages';
import { clearAllFlows } from '../state';
import { isAdmin, ADMIN_X_PROFILE } from '../config';

const homeKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('📊 My Status', 'my_status'), Markup.button.callback('🔗 Set X Profile', 'set_profile')],
  [Markup.button.callback('+ Claim Points', 'claim_points'), Markup.button.callback('— Use Points', 'use_points')],
  [Markup.button.callback('📈 My Stats', 'my_stats'), Markup.button.callback('🎁 Gift Points', 'gift_points')],
  [Markup.button.callback('🎲 Point Gamble', 'point_gamble')],
  [Markup.button.callback('📋 Use History', 'use_history'), Markup.button.callback('📄 Claim History', 'claim_history')],
  [Markup.button.callback('🔄 Refresh Dashboard', 'refresh_home')],
]);

export async function startCommand(ctx: Context) {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    clearAllFlows(telegramId);

    let user = await prisma.user.findUnique({ where: { telegramId } });

    if (!user) {
      const adminUser = isAdmin(telegramId);
      user = await prisma.user.create({
        data: {
          telegramId,
          telegramUsername: ctx.from?.username || null,
          status: adminUser ? 'APPROVED' : 'PENDING',
          xProfileUrl: adminUser ? ADMIN_X_PROFILE : null,
        },
      });
      if (adminUser) {
        const activeTweets = await prisma.tweet.findMany({
          where: { ownerUserId: user.id, isComplete: false },
          select: { tweetUrl: true, filledSlots: true, totalSlots: true },
        });
        const text = messages.homeDashboard(user.points, user.status, activeTweets, true);
        await ctx.reply(text, homeKeyboard);
      } else {
        await ctx.reply(messages.welcomeNew, homeKeyboard);
      }
      return;
    }

    if (isAdmin(telegramId)) {
      const updates: Record<string, unknown> = {};
      if (user.status !== 'APPROVED') {
        updates.status = 'APPROVED';
        user.status = 'APPROVED';
      }
      if (!user.xProfileUrl) {
        updates.xProfileUrl = ADMIN_X_PROFILE;
      }
      if (Object.keys(updates).length > 0) {
        await prisma.user.update({ where: { id: user.id }, data: updates });
      }
    }

    if (user.status === 'INACTIVE') {
      await prisma.user.update({
        where: { id: user.id },
        data: { status: 'APPROVED', lastActivity: new Date() },
      });
      user.status = 'APPROVED';
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastActivity: new Date(),
        telegramUsername: ctx.from?.username || user.telegramUsername,
      },
    });

    const activeTweets = await prisma.tweet.findMany({
      where: { ownerUserId: user.id, isComplete: false },
      select: { tweetUrl: true, filledSlots: true, totalSlots: true },
    });

    const adminUser = isAdmin(telegramId);
    const text = messages.homeDashboard(user.points, user.status, activeTweets, adminUser);
    await ctx.reply(text, homeKeyboard);
  } catch (error) {
    console.error('Error in start command:', error);
    await ctx.reply(messages.error);
  }
}
