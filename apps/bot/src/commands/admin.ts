import { Context, Markup } from 'telegraf';
import { prisma } from '@reply-society/db';
import { messages } from '../messages';
import { isAdmin } from '../config';
import { Telegraf } from 'telegraf';

let botInstance: Telegraf | null = null;

export function setAdminBotInstance(bot: Telegraf): void {
  botInstance = bot;
}

function checkAdmin(ctx: Context): boolean {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId || !isAdmin(telegramId)) {
    ctx.reply(messages.notAdmin);
    return false;
  }
  return true;
}

export async function pendingCommand(ctx: Context) {
  try {
    if (!checkAdmin(ctx)) return;

    const users = await prisma.user.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });

    if (users.length === 0) {
      await ctx.reply('✅ No users pending approval.');
      return;
    }

    for (const user of users) {
      const text =
        `👤 @${user.telegramUsername || 'unknown'}\n` +
        `🔗 ${user.xProfileUrl || 'no profile'}\n` +
        `🆔 ${user.telegramId}`;

      await ctx.reply(text, Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Approve', `admin_approve:${user.telegramId}`),
          Markup.button.callback('❌ Reject', `admin_reject:${user.telegramId}`),
        ],
      ]));
    }
  } catch (error) {
    console.error('Error in pending command:', error);
    await ctx.reply(messages.error);
  }
}

export async function approveCommand(ctx: Context) {
  try {
    if (!checkAdmin(ctx)) return;

    const text = (ctx.message as { text?: string })?.text || '';
    const targetId = text.replace(/^\/approve\s*/, '').trim();

    if (!targetId) {
      await ctx.reply('Usage: /approve <telegram_id>');
      return;
    }

    await handleApprove(ctx, targetId);
  } catch (error) {
    console.error('Error in approve command:', error);
    await ctx.reply(messages.error);
  }
}

export async function handleApprove(ctx: Context, targetTelegramId: string) {
  try {
    const user = await prisma.user.findUnique({ where: { telegramId: targetTelegramId } });
    if (!user) {
      await ctx.reply(`User with Telegram ID ${targetTelegramId} not found.`);
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'APPROVED' },
    });

    await prisma.adminLog.create({
      data: {
        adminTelegramId: ctx.from!.id.toString(),
        action: 'APPROVE',
        targetUserId: user.id,
      },
    });

    await ctx.reply(`✅ @${user.telegramUsername || targetTelegramId} has been approved.`);

    if (botInstance) {
      try {
        await botInstance.telegram.sendMessage(user.telegramId, messages.userApproved);
      } catch (err) {
        console.error('Failed to notify approved user:', err);
      }
    }
  } catch (error) {
    console.error('Error approving user:', error);
    await ctx.reply(messages.error);
  }
}

export async function rejectCommand(ctx: Context) {
  try {
    if (!checkAdmin(ctx)) return;

    const text = (ctx.message as { text?: string })?.text || '';
    const targetId = text.replace(/^\/reject\s*/, '').trim();

    if (!targetId) {
      await ctx.reply('Usage: /reject <telegram_id>');
      return;
    }

    await handleReject(ctx, targetId);
  } catch (error) {
    console.error('Error in reject command:', error);
    await ctx.reply(messages.error);
  }
}

export async function handleReject(ctx: Context, targetTelegramId: string) {
  try {
    const user = await prisma.user.findUnique({ where: { telegramId: targetTelegramId } });
    if (!user) {
      await ctx.reply(`User with Telegram ID ${targetTelegramId} not found.`);
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'REJECTED' },
    });

    await prisma.adminLog.create({
      data: {
        adminTelegramId: ctx.from!.id.toString(),
        action: 'REJECT',
        targetUserId: user.id,
      },
    });

    await ctx.reply(`❌ @${user.telegramUsername || targetTelegramId} has been rejected.`);

    if (botInstance) {
      try {
        await botInstance.telegram.sendMessage(user.telegramId, messages.userRejected);
      } catch (err) {
        console.error('Failed to notify rejected user:', err);
      }
    }
  } catch (error) {
    console.error('Error rejecting user:', error);
    await ctx.reply(messages.error);
  }
}

export async function banCommand(ctx: Context) {
  try {
    if (!checkAdmin(ctx)) return;

    const text = (ctx.message as { text?: string })?.text || '';
    const targetId = text.replace(/^\/ban\s*/, '').trim();

    if (!targetId) {
      await ctx.reply('Usage: /ban <telegram_id>');
      return;
    }

    const user = await prisma.user.findUnique({ where: { telegramId: targetId } });
    if (!user) {
      await ctx.reply(`User with Telegram ID ${targetId} not found.`);
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'BANNED' },
    });

    await prisma.adminLog.create({
      data: {
        adminTelegramId: ctx.from!.id.toString(),
        action: 'BAN',
        targetUserId: user.id,
      },
    });

    await ctx.reply(`🚫 @${user.telegramUsername || targetId} has been banned.`);

    if (botInstance) {
      try {
        await botInstance.telegram.sendMessage(user.telegramId, messages.userBanned);
      } catch (err) {
        console.error('Failed to notify banned user:', err);
      }
    }
  } catch (error) {
    console.error('Error in ban command:', error);
    await ctx.reply(messages.error);
  }
}

export async function unbanCommand(ctx: Context) {
  try {
    if (!checkAdmin(ctx)) return;

    const text = (ctx.message as { text?: string })?.text || '';
    const targetId = text.replace(/^\/unban\s*/, '').trim();

    if (!targetId) {
      await ctx.reply('Usage: /unban <telegram_id>');
      return;
    }

    const user = await prisma.user.findUnique({ where: { telegramId: targetId } });
    if (!user) {
      await ctx.reply(`User with Telegram ID ${targetId} not found.`);
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'APPROVED' },
    });

    await prisma.adminLog.create({
      data: {
        adminTelegramId: ctx.from!.id.toString(),
        action: 'UNBAN',
        targetUserId: user.id,
      },
    });

    await ctx.reply(`✅ @${user.telegramUsername || targetId} has been unbanned.`);

    if (botInstance) {
      try {
        await botInstance.telegram.sendMessage(user.telegramId, messages.userUnbanned);
      } catch (err) {
        console.error('Failed to notify unbanned user:', err);
      }
    }
  } catch (error) {
    console.error('Error in unban command:', error);
    await ctx.reply(messages.error);
  }
}

export async function adminStatsCommand(ctx: Context) {
  try {
    if (!checkAdmin(ctx)) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalUsers, approved, pending, banned, totalPointsResult, activeTweets, tasksToday] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: 'APPROVED' } }),
        prisma.user.count({ where: { status: 'PENDING' } }),
        prisma.user.count({ where: { status: 'BANNED' } }),
        prisma.user.aggregate({ _sum: { points: true } }),
        prisma.tweet.count({ where: { isComplete: false } }),
        prisma.task.count({ where: { status: 'COMPLETED', completedAt: { gte: today } } }),
      ]);

    const text = messages.adminStats({
      totalUsers,
      approved,
      pending,
      banned,
      totalPoints: totalPointsResult._sum.points || 0,
      activeTweets,
      tasksToday,
    });

    await ctx.reply(text);
  } catch (error) {
    console.error('Error in admin stats command:', error);
    await ctx.reply(messages.error);
  }
}

export async function shamelistCommand(ctx: Context) {
  try {
    if (!checkAdmin(ctx)) return;

    const flaggedTasks = await prisma.task.groupBy({
      by: ['claimerUserId'],
      where: { status: 'FLAGGED' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    if (flaggedTasks.length === 0) {
      await ctx.reply('✅ No flagged users.');
      return;
    }

    const users = await Promise.all(
      flaggedTasks.map(async (entry) => {
        const user = await prisma.user.findUnique({
          where: { id: entry.claimerUserId },
          select: { telegramUsername: true, telegramId: true },
        });
        return {
          telegramUsername: user?.telegramUsername || null,
          telegramId: user?.telegramId || 'unknown',
          flagCount: entry._count.id,
        };
      }),
    );

    const text = messages.shameList(users);
    await ctx.reply(text);
  } catch (error) {
    console.error('Error in shamelist command:', error);
    await ctx.reply(messages.error);
  }
}
