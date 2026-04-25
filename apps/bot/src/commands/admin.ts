import { Context } from 'telegraf';
import { prisma } from '@reply-society/db';
import { messages } from '../messages';
import { isAdmin } from '../config';

async function requireAdmin(ctx: Context): Promise<boolean> {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId || !isAdmin(telegramId)) {
    await ctx.reply(messages.notAdmin);
    return false;
  }
  return true;
}

function extractTarget(text: string): string | null {
  const parts = text.split(/\s+/);
  if (parts.length < 2) return null;
  return parts[1].replace('@', '');
}

export async function pendingCommand(ctx: Context) {
  try {
    if (!(await requireAdmin(ctx))) return;

    const users = await prisma.user.findMany({
      where: { status: 'PENDING' },
      select: { telegramUsername: true, id: true },
    });

    await ctx.reply(messages.pendingList(users), { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in pending command:', error);
    await ctx.reply(messages.error);
  }
}

export async function approveCommand(ctx: Context) {
  try {
    if (!(await requireAdmin(ctx))) return;

    const text = 'text' in (ctx.message || {}) ? (ctx.message as { text: string }).text : '';
    const target = extractTarget(text);
    if (!target) {
      await ctx.reply('Usage: /approve <user_id or @username>');
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: target }, { telegramUsername: target }],
      },
    });

    if (!user) {
      await ctx.reply(messages.userNotFound);
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

    try {
      await ctx.telegram.sendMessage(user.telegramId, messages.userApproved, {
        parse_mode: 'Markdown',
      });
    } catch (err) {
      console.error('Failed to notify user:', err);
    }

    await ctx.reply(messages.actionSuccess('Approval', user.telegramUsername || user.id));
  } catch (error) {
    console.error('Error in approve command:', error);
    await ctx.reply(messages.error);
  }
}

export async function rejectCommand(ctx: Context) {
  try {
    if (!(await requireAdmin(ctx))) return;

    const text = 'text' in (ctx.message || {}) ? (ctx.message as { text: string }).text : '';
    const target = extractTarget(text);
    if (!target) {
      await ctx.reply('Usage: /reject <user_id or @username>');
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: target }, { telegramUsername: target }],
      },
    });

    if (!user) {
      await ctx.reply(messages.userNotFound);
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

    try {
      await ctx.telegram.sendMessage(user.telegramId, messages.userRejected, {
        parse_mode: 'Markdown',
      });
    } catch (err) {
      console.error('Failed to notify user:', err);
    }

    await ctx.reply(messages.actionSuccess('Rejection', user.telegramUsername || user.id));
  } catch (error) {
    console.error('Error in reject command:', error);
    await ctx.reply(messages.error);
  }
}

export async function banCommand(ctx: Context) {
  try {
    if (!(await requireAdmin(ctx))) return;

    const text = 'text' in (ctx.message || {}) ? (ctx.message as { text: string }).text : '';
    const target = extractTarget(text);
    if (!target) {
      await ctx.reply('Usage: /ban <user_id or @username>');
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: target }, { telegramUsername: target }],
      },
    });

    if (!user) {
      await ctx.reply(messages.userNotFound);
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

    try {
      await ctx.telegram.sendMessage(user.telegramId, messages.userBanned, {
        parse_mode: 'Markdown',
      });
    } catch (err) {
      console.error('Failed to notify user:', err);
    }

    await ctx.reply(messages.actionSuccess('Ban', user.telegramUsername || user.id));
  } catch (error) {
    console.error('Error in ban command:', error);
    await ctx.reply(messages.error);
  }
}

export async function unbanCommand(ctx: Context) {
  try {
    if (!(await requireAdmin(ctx))) return;

    const text = 'text' in (ctx.message || {}) ? (ctx.message as { text: string }).text : '';
    const target = extractTarget(text);
    if (!target) {
      await ctx.reply('Usage: /unban <user_id or @username>');
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: target }, { telegramUsername: target }],
      },
    });

    if (!user) {
      await ctx.reply(messages.userNotFound);
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

    try {
      await ctx.telegram.sendMessage(user.telegramId, messages.userUnbanned, {
        parse_mode: 'Markdown',
      });
    } catch (err) {
      console.error('Failed to notify user:', err);
    }

    await ctx.reply(messages.actionSuccess('Unban', user.telegramUsername || user.id));
  } catch (error) {
    console.error('Error in unban command:', error);
    await ctx.reply(messages.error);
  }
}

export async function adminStatsCommand(ctx: Context) {
  try {
    if (!(await requireAdmin(ctx))) return;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [totalUsers, totalPoints, activeUsers, pendingUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.aggregate({ _sum: { points: true } }),
      prisma.user.count({
        where: { lastActivity: { gte: sevenDaysAgo } },
      }),
      prisma.user.count({
        where: { status: 'PENDING' },
      }),
    ]);

    await ctx.reply(
      messages.adminStats(
        totalUsers,
        totalPoints._sum.points || 0,
        activeUsers,
        pendingUsers,
      ),
      { parse_mode: 'Markdown' },
    );
  } catch (error) {
    console.error('Error in admin stats command:', error);
    await ctx.reply(messages.error);
  }
}

export async function shamelistCommand(ctx: Context) {
  try {
    if (!(await requireAdmin(ctx))) return;

    const flaggedTasks = await prisma.task.groupBy({
      by: ['claimerUserId'],
      where: { status: 'FLAGGED' },
      _count: { id: true },
    });

    const users = await Promise.all(
      flaggedTasks.map(async (ft) => {
        const user = await prisma.user.findUnique({
          where: { id: ft.claimerUserId },
          select: { telegramUsername: true, id: true },
        });
        return {
          telegramUsername: user?.telegramUsername || null,
          id: user?.id || ft.claimerUserId,
          flagCount: ft._count.id,
        };
      }),
    );

    await ctx.reply(messages.shameList(users), { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in shamelist command:', error);
    await ctx.reply(messages.error);
  }
}
