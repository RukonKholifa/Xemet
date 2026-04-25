import { Context, Markup } from 'telegraf';
import { prisma } from '@reply-society/db';
import { messages } from '../messages';
import { parseNumber } from '../utils/validation';
import { config } from '../config';
import { checkRateLimit, setRateLimit } from '../middleware/rateLimit';

const awaitingClaimCount = new Set<string>();
const activeClaimSessions = new Map<
  string,
  { tasks: Array<{ id: string; tweetUrl: string }>; currentIndex: number }
>();

export function isAwaitingClaimCount(telegramId: string): boolean {
  return awaitingClaimCount.has(telegramId);
}

export function clearAwaitingClaimCount(telegramId: string): void {
  awaitingClaimCount.delete(telegramId);
}

export function hasActiveClaimSession(telegramId: string): boolean {
  return activeClaimSessions.has(telegramId);
}

export async function claimCommand(ctx: Context) {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) {
      await ctx.reply(messages.notApproved, { parse_mode: 'Markdown' });
      return;
    }

    if (user.status === 'BANNED') {
      await ctx.reply(messages.alreadyBanned);
      return;
    }

    if (user.status !== 'APPROVED') {
      await ctx.reply(messages.notApproved, { parse_mode: 'Markdown' });
      return;
    }

    if (!(await checkRateLimit(ctx, 'claim'))) return;

    if (activeClaimSessions.has(telegramId)) {
      await ctx.reply(messages.claimAlreadyInProgress);
      return;
    }

    const maxClaim = config.maxPoints - user.points;
    if (maxClaim <= 0) {
      await ctx.reply(messages.numberTooHigh(0), { parse_mode: 'Markdown' });
      return;
    }

    awaitingClaimCount.add(telegramId);
    await ctx.reply(messages.claimPrompt(maxClaim), { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in claim command:', error);
    await ctx.reply(messages.error);
  }
}

export async function handleClaimCount(ctx: Context) {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const text = 'text' in (ctx.message || {}) ? (ctx.message as { text: string }).text : '';
    const count = parseNumber(text);

    if (count === null) {
      await ctx.reply(messages.invalidNumber);
      return;
    }

    if (count <= 0) {
      await ctx.reply(messages.numberTooLow);
      return;
    }

    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) return;

    const maxClaim = config.maxPoints - user.points;
    if (count > maxClaim) {
      await ctx.reply(messages.numberTooHigh(maxClaim), { parse_mode: 'Markdown' });
      return;
    }

    clearAwaitingClaimCount(telegramId);
    setRateLimit(telegramId, 'claim');

    const availableTweets = await prisma.$queryRaw<
      Array<{ id: string; tweetUrl: string }>
    >`SELECT id, "tweetUrl" FROM tweets WHERE "isComplete" = false AND "ownerUserId" != ${user.id} AND "filledSlots" < "totalSlots" ORDER BY "createdAt" ASC LIMIT ${count}`;


    if (availableTweets.length === 0) {
      await ctx.reply(messages.claimNoSlots);
      return;
    }

    const tasks = [];
    for (const tweet of availableTweets) {
      const task = await prisma.task.create({
        data: {
          claimerUserId: user.id,
          tweetId: tweet.id,
          status: 'IN_PROGRESS',
        },
      });
      tasks.push({ id: task.id, tweetUrl: tweet.tweetUrl });
    }

    activeClaimSessions.set(telegramId, { tasks, currentIndex: 0 });

    await sendNextTask(ctx, telegramId);
  } catch (error) {
    console.error('Error handling claim count:', error);
    await ctx.reply(messages.error);
  }
}

export async function sendNextTask(ctx: Context, telegramId: string) {
  const session = activeClaimSessions.get(telegramId);
  if (!session) return;

  if (session.currentIndex >= session.tasks.length) {
    const pointsEarned = session.tasks.length;

    await prisma.user.update({
      where: { telegramId },
      data: {
        points: { increment: pointsEarned },
        lastActivity: new Date(),
      },
    });

    activeClaimSessions.delete(telegramId);
    await ctx.reply(messages.claimComplete(pointsEarned), { parse_mode: 'Markdown' });
    return;
  }

  const task = session.tasks[session.currentIndex];
  await ctx.reply(
    messages.claimTask(task.tweetUrl, session.currentIndex + 1, session.tasks.length),
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('✅ Done', `task_done:${task.id}`)],
        [Markup.button.callback('⏭ Skip', `task_skip:${task.id}`)],
      ]),
    },
  );
}

export async function handleTaskDone(ctx: Context, taskId: string) {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const session = activeClaimSessions.get(telegramId);
    if (!session) return;

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      include: { tweet: { include: { owner: true } } },
    });

    await prisma.tweet.update({
      where: { id: task.tweetId },
      data: {
        filledSlots: { increment: 1 },
      },
    });

    const updatedTweet = await prisma.tweet.findUnique({ where: { id: task.tweetId } });
    if (updatedTweet && updatedTweet.filledSlots >= updatedTweet.totalSlots) {
      await prisma.tweet.update({
        where: { id: task.tweetId },
        data: { isComplete: true },
      });
    }

    try {
      const claimer = await prisma.user.findUnique({ where: { telegramId } });
      await ctx.telegram.sendMessage(
        task.tweet.owner.telegramId,
        messages.engagementNotification(
          task.tweet.tweetUrl,
          claimer?.telegramUsername || 'unknown',
        ),
        { parse_mode: 'Markdown' },
      );
    } catch (err) {
      console.error('Failed to notify tweet owner:', err);
    }

    session.currentIndex++;
    await ctx.answerCbQuery('Task completed!');
    await sendNextTask(ctx, telegramId);
  } catch (error) {
    console.error('Error handling task done:', error);
    await ctx.answerCbQuery('Error processing task');
  }
}

export async function handleTaskSkip(ctx: Context, taskId: string) {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const session = activeClaimSessions.get(telegramId);
    if (!session) return;

    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'FLAGGED' },
    });

    session.tasks.splice(session.currentIndex, 1);

    await ctx.answerCbQuery('Task skipped and flagged');
    await sendNextTask(ctx, telegramId);
  } catch (error) {
    console.error('Error handling task skip:', error);
    await ctx.answerCbQuery('Error processing skip');
  }
}
