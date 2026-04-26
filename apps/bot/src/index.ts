import { Telegraf } from 'telegraf';
import express from 'express';
import { config, getMaxPoints } from './config';
import {
  startCommand,
  setProfileCommand, handleProfileUrl, setProfileBotInstance,
  claimCommand, handleClaimSelect, handleClaimCompleted, handleClaimCancel,
  useCommand, handleUseSelect, handleUseTweetUrl,
  myStatusCommand, myStatsCommand,
  giftInfoCommand, giftCommand, setGiftBotInstance,
  gambleCommand, handleGamble,
  claimHistoryCommand, useHistoryCommand, viewClaimTweet, viewUseTweet,
  pendingCommand, approveCommand, rejectCommand,
  banCommand, unbanCommand, adminStatsCommand, shamelistCommand,
  addPointsCommand, handleApprove, handleReject, setAdminBotInstance,
  adminPanelCommand, allUsersCommand,
  adminPromptApprove, adminPromptReject, adminPromptBan, adminPromptUnban,
  adminPromptAddPoints, handleAdminTextInput,
} from './commands';
import { startCronJobs } from './jobs';
import { apiAuthMiddleware } from './middleware/apiAuth';
import { getFlow } from './state';
import { clearAllFlows } from './state';

const bot = new Telegraf(config.botToken);
const app = express();

app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protect all /api routes with API secret authentication
app.use('/api', apiAuthMiddleware);

// API endpoints for the web dashboard
app.get('/api/stats', async (_req, res) => {
  try {
    const { prisma } = await import('@reply-society/db');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [totalUsers, totalPointsResult, activeUsers, pendingUsers, activeTweets, flaggedTasks] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.aggregate({ _sum: { points: true } }),
        prisma.user.count({ where: { lastActivity: { gte: sevenDaysAgo } } }),
        prisma.user.count({ where: { status: 'PENDING' } }),
        prisma.tweet.count({ where: { isComplete: false } }),
        prisma.task.count({ where: { status: 'FLAGGED' } }),
      ]);

    res.json({
      totalUsers,
      totalPoints: totalPointsResult._sum.points || 0,
      activeUsers,
      pendingUsers,
      activeTweets,
      flaggedTasks,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users', async (_req, res) => {
  try {
    const { prisma } = await import('@reply-society/db');
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/tweets', async (_req, res) => {
  try {
    const { prisma } = await import('@reply-society/db');
    const tweets = await prisma.tweet.findMany({
      include: { owner: { select: { telegramUsername: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tweets);
  } catch (error) {
    console.error('Error fetching tweets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/tasks', async (_req, res) => {
  try {
    const { prisma } = await import('@reply-society/db');
    const tasks = await prisma.task.findMany({
      include: {
        claimer: { select: { telegramUsername: true } },
        tweet: { select: { tweetUrl: true } },
      },
      orderBy: { claimedAt: 'desc' },
    });
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/leaderboard', async (_req, res) => {
  try {
    const { prisma } = await import('@reply-society/db');
    const leaderboard = await prisma.task.groupBy({
      by: ['claimerUserId'],
      where: { status: 'COMPLETED' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const users = await Promise.all(
      leaderboard.map(async (entry) => {
        const user = await prisma.user.findUnique({
          where: { id: entry.claimerUserId },
          select: { telegramUsername: true, xProfileUrl: true },
        });
        return {
          username: user?.telegramUsername || 'unknown',
          xProfileUrl: user?.xProfileUrl,
          engagementsGiven: entry._count.id,
        };
      }),
    );

    res.json(users);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users/:id/approve', async (req, res) => {
  try {
    const { prisma } = await import('@reply-society/db');
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED' },
    });

    try {
      await bot.telegram.sendMessage(user.telegramId, '✅ Account Approved! You can now use /claim and /use.');
    } catch (err) {
      console.error('Failed to notify user:', err);
    }

    res.json(user);
  } catch (error) {
    console.error('Error approving user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users/:id/reject', async (req, res) => {
  try {
    const { prisma } = await import('@reply-society/db');
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED' },
    });
    res.json(user);
  } catch (error) {
    console.error('Error rejecting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users/:id/ban', async (req, res) => {
  try {
    const { prisma } = await import('@reply-society/db');
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: 'BANNED' },
    });
    res.json(user);
  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users/:id/unban', async (req, res) => {
  try {
    const { prisma } = await import('@reply-society/db');
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED' },
    });
    res.json(user);
  } catch (error) {
    console.error('Error unbanning user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users/:id/addpoints', async (req, res) => {
  try {
    const { prisma } = await import('@reply-society/db');
    const amount = parseInt(req.body.amount, 10);
    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'Invalid amount' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const targetMax = getMaxPoints(user.telegramId);
    const cappedAmount = Math.min(amount, targetMax - user.points);
    if (cappedAmount <= 0) {
      res.status(400).json({ error: 'User is already at maximum balance' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { points: { increment: cappedAmount } },
    });

    try {
      await bot.telegram.sendMessage(
        user.telegramId,
        `💎 ${cappedAmount} points have been added to your balance by admin!`,
      );
    } catch (err) {
      console.error('Failed to notify user about added points:', err);
    }

    res.json(updated);
  } catch (error) {
    console.error('Error adding points:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Bot commands ---
bot.command('start', startCommand);
bot.command('home', startCommand);
bot.command('setprofile', setProfileCommand);
bot.command('claim', claimCommand);
bot.command('use', useCommand);
bot.command('stats', myStatsCommand);
bot.command('gift', giftCommand);

// Admin commands
bot.command('pending', pendingCommand);
bot.command('approve', approveCommand);
bot.command('reject', rejectCommand);
bot.command('ban', banCommand);
bot.command('unban', unbanCommand);
bot.command('adminstats', adminStatsCommand);
bot.command('shamelist', shamelistCommand);
bot.command('addpoints', addPointsCommand);

// --- Callback queries (inline keyboard buttons) ---

// Home / navigation
bot.action('go_home', async (ctx) => {
  await ctx.answerCbQuery();
  await startCommand(ctx);
});
bot.action('refresh_home', async (ctx) => {
  await ctx.answerCbQuery();
  await startCommand(ctx);
});

// Set profile
bot.action('set_profile', async (ctx) => {
  await ctx.answerCbQuery();
  await setProfileCommand(ctx);
});

// Claim flow
bot.action('claim_points', async (ctx) => {
  await ctx.answerCbQuery();
  await claimCommand(ctx);
});
bot.action(/^claim_select:(\d+)$/, async (ctx) => {
  const amount = parseInt(ctx.match[1], 10);
  await handleClaimSelect(ctx, amount);
});
bot.action('claim_completed', async (ctx) => {
  await handleClaimCompleted(ctx);
});
bot.action('claim_cancel', async (ctx) => {
  await handleClaimCancel(ctx);
});

// Use flow
bot.action('use_points', async (ctx) => {
  await ctx.answerCbQuery();
  await useCommand(ctx);
});
bot.action(/^use_select:(\d+)$/, async (ctx) => {
  const amount = parseInt(ctx.match[1], 10);
  await handleUseSelect(ctx, amount);
});

// My Status / My Stats
bot.action('my_status', async (ctx) => {
  await ctx.answerCbQuery();
  await myStatusCommand(ctx);
});
bot.action('my_stats', async (ctx) => {
  await ctx.answerCbQuery();
  await myStatsCommand(ctx);
});

// Gift
bot.action('gift_points', async (ctx) => {
  await ctx.answerCbQuery();
  await giftInfoCommand(ctx);
});

// Gamble
bot.action('point_gamble', async (ctx) => {
  await ctx.answerCbQuery();
  await gambleCommand(ctx);
});
bot.action(/^gamble:(\d+)$/, async (ctx) => {
  const multiplier = parseInt(ctx.match[1], 10);
  await handleGamble(ctx, multiplier);
});

// History
bot.action('claim_history', async (ctx) => {
  await ctx.answerCbQuery();
  await claimHistoryCommand(ctx, 0);
});
bot.action(/^claim_history:(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const page = parseInt(ctx.match[1], 10);
  await claimHistoryCommand(ctx, page);
});
bot.action(/^claim_tweet:(.+)$/, async (ctx) => {
  await viewClaimTweet(ctx, ctx.match[1]);
});

bot.action('use_history', async (ctx) => {
  await ctx.answerCbQuery();
  await useHistoryCommand(ctx, 0);
});
bot.action(/^use_history:(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const page = parseInt(ctx.match[1], 10);
  await useHistoryCommand(ctx, page);
});
bot.action(/^use_tweet_view:(.+)$/, async (ctx) => {
  await viewUseTweet(ctx, ctx.match[1]);
});

// Admin inline approve/reject
bot.action(/^admin_approve:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await handleApprove(ctx, ctx.match[1]);
});
bot.action(/^admin_reject:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await handleReject(ctx, ctx.match[1]);
});

// Admin Panel
bot.action('admin_panel', async (ctx) => {
  await ctx.answerCbQuery();
  await adminPanelCommand(ctx);
});
bot.action('ap_pending', async (ctx) => {
  await ctx.answerCbQuery();
  await pendingCommand(ctx);
});
bot.action('ap_stats', async (ctx) => {
  await ctx.answerCbQuery();
  await adminStatsCommand(ctx);
});
bot.action('ap_shamelist', async (ctx) => {
  await ctx.answerCbQuery();
  await shamelistCommand(ctx);
});
bot.action('ap_addpoints', async (ctx) => {
  await ctx.answerCbQuery();
  await adminPromptAddPoints(ctx);
});
bot.action('ap_approve', async (ctx) => {
  await ctx.answerCbQuery();
  await adminPromptApprove(ctx);
});
bot.action('ap_reject', async (ctx) => {
  await ctx.answerCbQuery();
  await adminPromptReject(ctx);
});
bot.action('ap_ban', async (ctx) => {
  await ctx.answerCbQuery();
  await adminPromptBan(ctx);
});
bot.action('ap_unban', async (ctx) => {
  await ctx.answerCbQuery();
  await adminPromptUnban(ctx);
});
bot.action('ap_allusers', async (ctx) => {
  await ctx.answerCbQuery();
  await allUsersCommand(ctx);
});

// Cancel flow
bot.action('cancel_flow', async (ctx) => {
  await ctx.answerCbQuery();
  const telegramId = ctx.from?.id.toString();
  if (telegramId) {
    clearAllFlows(telegramId);
  }
  await startCommand(ctx);
});

// Text message handler for conversation flows
bot.on('text', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const flow = getFlow(telegramId);

  // Admin flows first
  if (flow?.startsWith('admin_')) {
    const handled = await handleAdminTextInput(ctx);
    if (handled) return;
  }

  if (flow === 'profile') {
    await handleProfileUrl(ctx);
    return;
  }

  if (flow === 'use_tweet') {
    await handleUseTweetUrl(ctx);
    return;
  }
});

// Error handling
bot.catch((err) => {
  console.error('Bot error:', err);
});

// Start
async function main() {
  console.log('🤖 Starting EngageSwapBot...');

  // Set bot instances for modules that need to send notifications
  setProfileBotInstance(bot);
  setGiftBotInstance(bot);
  setAdminBotInstance(bot);

  startCronJobs(bot);

  app.listen(config.port, () => {
    console.log(`📡 API server running on port ${config.port}`);
  });

  console.log('✅ Launching bot...');
  bot.launch().then(() => {
    console.log('✅ Bot polling stopped');
  }).catch((err) => {
    console.error('❌ Bot launch error:', err);
  });
  console.log('✅ Bot is running!');

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

main().catch(console.error);
