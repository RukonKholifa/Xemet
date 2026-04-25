import { Telegraf } from 'telegraf';
import express from 'express';
import { config } from './config';
import {
  startCommand,
  setProfileCommand,
  handleProfileUrl,
  isAwaitingProfile,
  claimCommand,
  handleClaimCount,
  handleTaskDone,
  handleTaskSkip,
  isAwaitingClaimCount,
  useCommand,
  handleUseCount,
  isAwaitingUseCount,
  statsCommand,
  pendingCommand,
  approveCommand,
  rejectCommand,
  banCommand,
  unbanCommand,
  adminStatsCommand,
  shamelistCommand,
} from './commands';
import { startCronJobs } from './jobs';
import { apiAuthMiddleware } from './middleware/apiAuth';

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
      await bot.telegram.sendMessage(user.telegramId, '🎉 Your account has been *APPROVED*!', {
        parse_mode: 'Markdown',
      });
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

// Bot commands
bot.command('start', startCommand);
bot.command('home', startCommand);
bot.command('setprofile', setProfileCommand);
bot.command('claim', claimCommand);
bot.command('use', useCommand);
bot.command('stats', statsCommand);

// Admin commands
bot.command('pending', pendingCommand);
bot.command('approve', approveCommand);
bot.command('reject', rejectCommand);
bot.command('ban', banCommand);
bot.command('unban', unbanCommand);
bot.command('adminstats', adminStatsCommand);
bot.command('shamelist', shamelistCommand);

// Callback queries (inline keyboard buttons)
bot.action('set_profile', async (ctx) => {
  await ctx.answerCbQuery();
  await setProfileCommand(ctx);
});

bot.action('claim_points', async (ctx) => {
  await ctx.answerCbQuery();
  await claimCommand(ctx);
});

bot.action('use_points', async (ctx) => {
  await ctx.answerCbQuery();
  await useCommand(ctx);
});

bot.action('my_stats', async (ctx) => {
  await ctx.answerCbQuery();
  await statsCommand(ctx);
});

bot.action(/^task_done:(.+)$/, async (ctx) => {
  const taskId = ctx.match[1];
  await handleTaskDone(ctx, taskId);
});

bot.action(/^task_skip:(.+)$/, async (ctx) => {
  const taskId = ctx.match[1];
  await handleTaskSkip(ctx, taskId);
});

// Text message handler for conversation flows
bot.on('text', async (ctx) => {
  const telegramId = ctx.from.id.toString();

  if (isAwaitingProfile(telegramId)) {
    await handleProfileUrl(ctx);
    return;
  }

  if (isAwaitingClaimCount(telegramId)) {
    await handleClaimCount(ctx);
    return;
  }

  if (isAwaitingUseCount(telegramId)) {
    await handleUseCount(ctx);
    return;
  }
});

// Error handling
bot.catch((err) => {
  console.error('Bot error:', err);
});

// Start
async function main() {
  console.log('🤖 Starting Reply Society Champs Bot...');

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
