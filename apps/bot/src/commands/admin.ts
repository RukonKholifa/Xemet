import { Context, Markup } from 'telegraf';
import { prisma } from '@reply-society/db';
import { messages } from '../messages';
import { isAdmin, config, getMaxPoints } from '../config';
import { Telegraf } from 'telegraf';
import { setFlow, clearAllFlows, isInFlow } from '../state';

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

export async function adminPanelCommand(ctx: Context) {
  try {
    if (!checkAdmin(ctx)) return;

    const telegramId = ctx.from?.id.toString();
    if (telegramId) clearAllFlows(telegramId);

    const text =
      `🛡️ Admin Control Panel\n\n` +
      `Choose an admin action below:`;

    await ctx.reply(text, Markup.inlineKeyboard([
      [Markup.button.callback('📋 Pending Users', 'ap_pending')],
      [Markup.button.callback('📊 Admin Stats', 'ap_stats')],
      [Markup.button.callback('🚩 Shame List', 'ap_shamelist')],
      [Markup.button.callback('💎 Add Points', 'ap_addpoints')],
      [Markup.button.callback('✅ Approve User', 'ap_approve'), Markup.button.callback('❌ Reject User', 'ap_reject')],
      [Markup.button.callback('🚫 Ban User', 'ap_ban'), Markup.button.callback('🔓 Unban User', 'ap_unban')],
      [Markup.button.callback('👥 All Users', 'ap_allusers')],
      [Markup.button.callback('🏠 Home', 'go_home')],
    ]));
  } catch (error) {
    console.error('Error in admin panel:', error);
    await ctx.reply(messages.error);
  }
}

export async function allUsersCommand(ctx: Context) {
  try {
    if (!checkAdmin(ctx)) return;

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    if (users.length === 0) {
      await ctx.reply('No users found.');
      return;
    }

    let text = `👥 All Users (latest 20):\n\n`;
    for (const user of users) {
      const statusIcon =
        user.status === 'APPROVED' ? '✅' :
        user.status === 'PENDING' ? '⏳' :
        user.status === 'BANNED' ? '🚫' :
        user.status === 'REJECTED' ? '❌' :
        user.status === 'INACTIVE' ? '💤' : '❓';
      text += `${statusIcon} @${user.telegramUsername || 'unknown'} | ${user.points}pts | ID: ${user.telegramId}\n`;
    }

    await ctx.reply(text, Markup.inlineKeyboard([
      [Markup.button.callback('🛡️ Admin Panel', 'admin_panel')],
      [Markup.button.callback('🏠 Home', 'go_home')],
    ]));
  } catch (error) {
    console.error('Error in all users command:', error);
    await ctx.reply(messages.error);
  }
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
    if (!checkAdmin(ctx)) return;

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
    if (!checkAdmin(ctx)) return;

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

export async function addPointsCommand(ctx: Context) {
  try {
    if (!checkAdmin(ctx)) return;

    const text = (ctx.message as { text?: string })?.text || '';
    const match = text.match(/^\/addpoints\s+@(\S+)\s+(\d+)$/);
    if (!match) {
      await ctx.reply('Usage: /addpoints @username amount\nExample: /addpoints @Rukon19kholifa 25');
      return;
    }

    const targetUsername = match[1];
    const amount = parseInt(match[2], 10);

    if (amount <= 0) {
      await ctx.reply('❌ Amount must be greater than 0.');
      return;
    }

    const user = await prisma.user.findFirst({
      where: { telegramUsername: targetUsername },
    });

    if (!user) {
      await ctx.reply(`❌ User @${targetUsername} not found.`);
      return;
    }

    const targetMax = getMaxPoints(user.telegramId);
    const cappedAmount = Math.min(amount, targetMax - user.points);
    if (cappedAmount <= 0) {
      await ctx.reply(`❌ @${targetUsername} is already at the maximum balance.`);
      return;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { points: { increment: cappedAmount } },
    });

    await ctx.reply(`✅ Added ${cappedAmount} points to @${targetUsername}. New balance: ${updated.points}`);

    if (botInstance) {
      try {
        await botInstance.telegram.sendMessage(
          user.telegramId,
          `💎 ${cappedAmount} points have been added to your balance by admin!`,
        );
      } catch (err) {
        console.error('Failed to notify user about added points:', err);
      }
    }
  } catch (error) {
    console.error('Error in addpoints command:', error);
    await ctx.reply(messages.error);
  }
}

export async function adminPromptApprove(ctx: Context) {
  if (!checkAdmin(ctx)) return;
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;
  clearAllFlows(telegramId);
  setFlow(telegramId, 'admin_approve');
  await ctx.reply('✅ Send the Telegram ID of the user to approve:', Markup.inlineKeyboard([
    [Markup.button.callback('❌ Cancel', 'admin_panel')],
  ]));
}

export async function adminPromptReject(ctx: Context) {
  if (!checkAdmin(ctx)) return;
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;
  clearAllFlows(telegramId);
  setFlow(telegramId, 'admin_reject');
  await ctx.reply('❌ Send the Telegram ID of the user to reject:', Markup.inlineKeyboard([
    [Markup.button.callback('❌ Cancel', 'admin_panel')],
  ]));
}

export async function adminPromptBan(ctx: Context) {
  if (!checkAdmin(ctx)) return;
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;
  clearAllFlows(telegramId);
  setFlow(telegramId, 'admin_ban');
  await ctx.reply('🚫 Send the Telegram ID of the user to ban:', Markup.inlineKeyboard([
    [Markup.button.callback('❌ Cancel', 'admin_panel')],
  ]));
}

export async function adminPromptUnban(ctx: Context) {
  if (!checkAdmin(ctx)) return;
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;
  clearAllFlows(telegramId);
  setFlow(telegramId, 'admin_unban');
  await ctx.reply('🔓 Send the Telegram ID of the user to unban:', Markup.inlineKeyboard([
    [Markup.button.callback('❌ Cancel', 'admin_panel')],
  ]));
}

export async function adminPromptAddPoints(ctx: Context) {
  if (!checkAdmin(ctx)) return;
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;
  clearAllFlows(telegramId);
  setFlow(telegramId, 'admin_addpoints');
  await ctx.reply('💎 Send: @username amount\nExample: @Rukon19kholifa 25', Markup.inlineKeyboard([
    [Markup.button.callback('❌ Cancel', 'admin_panel')],
  ]));
}

export async function handleAdminTextInput(ctx: Context) {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId || !isAdmin(telegramId)) return false;

  const text = (ctx.message as { text?: string })?.text?.trim();
  if (!text) return false;

  if (isInFlow(telegramId, 'admin_approve')) {
    clearAllFlows(telegramId);
    const user = await prisma.user.findUnique({ where: { telegramId: text } });
    if (!user) {
      await ctx.reply(`❌ User with ID ${text} not found.`, Markup.inlineKeyboard([
        [Markup.button.callback('🛡️ Admin Panel', 'admin_panel')],
      ]));
      return true;
    }
    await prisma.user.update({ where: { id: user.id }, data: { status: 'APPROVED' } });
    await prisma.adminLog.create({ data: { adminTelegramId: telegramId, action: 'APPROVE', targetUserId: user.id } });
    await ctx.reply(`✅ @${user.telegramUsername || text} approved.`, Markup.inlineKeyboard([
      [Markup.button.callback('🛡️ Admin Panel', 'admin_panel')],
    ]));
    if (botInstance) {
      try { await botInstance.telegram.sendMessage(user.telegramId, messages.userApproved); } catch {}
    }
    return true;
  }

  if (isInFlow(telegramId, 'admin_reject')) {
    clearAllFlows(telegramId);
    const user = await prisma.user.findUnique({ where: { telegramId: text } });
    if (!user) {
      await ctx.reply(`❌ User with ID ${text} not found.`, Markup.inlineKeyboard([
        [Markup.button.callback('🛡️ Admin Panel', 'admin_panel')],
      ]));
      return true;
    }
    await prisma.user.update({ where: { id: user.id }, data: { status: 'REJECTED' } });
    await prisma.adminLog.create({ data: { adminTelegramId: telegramId, action: 'REJECT', targetUserId: user.id } });
    await ctx.reply(`❌ @${user.telegramUsername || text} rejected.`, Markup.inlineKeyboard([
      [Markup.button.callback('🛡️ Admin Panel', 'admin_panel')],
    ]));
    if (botInstance) {
      try { await botInstance.telegram.sendMessage(user.telegramId, messages.userRejected); } catch {}
    }
    return true;
  }

  if (isInFlow(telegramId, 'admin_ban')) {
    clearAllFlows(telegramId);
    const user = await prisma.user.findUnique({ where: { telegramId: text } });
    if (!user) {
      await ctx.reply(`❌ User with ID ${text} not found.`, Markup.inlineKeyboard([
        [Markup.button.callback('🛡️ Admin Panel', 'admin_panel')],
      ]));
      return true;
    }
    await prisma.user.update({ where: { id: user.id }, data: { status: 'BANNED' } });
    await prisma.adminLog.create({ data: { adminTelegramId: telegramId, action: 'BAN', targetUserId: user.id } });
    await ctx.reply(`🚫 @${user.telegramUsername || text} banned.`, Markup.inlineKeyboard([
      [Markup.button.callback('🛡️ Admin Panel', 'admin_panel')],
    ]));
    if (botInstance) {
      try { await botInstance.telegram.sendMessage(user.telegramId, messages.userBanned); } catch {}
    }
    return true;
  }

  if (isInFlow(telegramId, 'admin_unban')) {
    clearAllFlows(telegramId);
    const user = await prisma.user.findUnique({ where: { telegramId: text } });
    if (!user) {
      await ctx.reply(`❌ User with ID ${text} not found.`, Markup.inlineKeyboard([
        [Markup.button.callback('🛡️ Admin Panel', 'admin_panel')],
      ]));
      return true;
    }
    await prisma.user.update({ where: { id: user.id }, data: { status: 'APPROVED' } });
    await prisma.adminLog.create({ data: { adminTelegramId: telegramId, action: 'UNBAN', targetUserId: user.id } });
    await ctx.reply(`🔓 @${user.telegramUsername || text} unbanned.`, Markup.inlineKeyboard([
      [Markup.button.callback('🛡️ Admin Panel', 'admin_panel')],
    ]));
    if (botInstance) {
      try { await botInstance.telegram.sendMessage(user.telegramId, messages.userUnbanned); } catch {}
    }
    return true;
  }

  if (isInFlow(telegramId, 'admin_addpoints')) {
    clearAllFlows(telegramId);
    const match = text.match(/^@(\S+)\s+(\d+)$/);
    if (!match) {
      await ctx.reply('❌ Invalid format. Use: @username amount', Markup.inlineKeyboard([
        [Markup.button.callback('🛡️ Admin Panel', 'admin_panel')],
      ]));
      return true;
    }
    const targetUsername = match[1];
    const amount = parseInt(match[2], 10);
    const user = await prisma.user.findFirst({ where: { telegramUsername: targetUsername } });
    if (!user) {
      await ctx.reply(`❌ User @${targetUsername} not found.`, Markup.inlineKeyboard([
        [Markup.button.callback('🛡️ Admin Panel', 'admin_panel')],
      ]));
      return true;
    }
    const targetMax = getMaxPoints(user.telegramId);
    const cappedAmount = Math.min(amount, targetMax - user.points);
    if (cappedAmount <= 0) {
      await ctx.reply(`❌ @${targetUsername} is already at max balance.`, Markup.inlineKeyboard([
        [Markup.button.callback('🛡️ Admin Panel', 'admin_panel')],
      ]));
      return true;
    }
    const updated = await prisma.user.update({ where: { id: user.id }, data: { points: { increment: cappedAmount } } });
    await ctx.reply(`✅ Added ${cappedAmount} points to @${targetUsername}. New balance: ${updated.points}`, Markup.inlineKeyboard([
      [Markup.button.callback('🛡️ Admin Panel', 'admin_panel')],
    ]));
    if (botInstance) {
      try { await botInstance.telegram.sendMessage(user.telegramId, `💎 ${cappedAmount} points have been added to your balance by admin!`); } catch {}
    }
    return true;
  }

  return false;
}
