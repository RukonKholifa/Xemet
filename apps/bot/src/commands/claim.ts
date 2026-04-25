import { Context, Markup } from 'telegraf';
import { prisma } from '@reply-society/db';
import { messages } from '../messages';
import { config, getMaxPoints, isAdmin } from '../config';
import { checkRateLimit, setRateLimit } from '../middleware/rateLimit';
import {
  clearAllFlows, setFlow, isInFlow,
  setClaimSession, getClaimSession, clearClaimSession,
} from '../state';

const CLAIM_AMOUNTS = [1, 5, 10, 15, 20, 25];
const CLAIM_TIMEOUT_MS = 4 * 60 * 60 * 1000;

async function getOrRejectUser(ctx: Context): Promise<{ id: string; points: number; telegramId: string } | null> {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return null;

  const user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user) {
    await ctx.reply(messages.notApproved);
    return null;
  }
  if (user.status === 'BANNED') {
    await ctx.reply(messages.alreadyBanned);
    return null;
  }
  if (user.status !== 'APPROVED') {
    await ctx.reply(messages.notApproved);
    return null;
  }
  return user;
}

export async function claimCommand(ctx: Context) {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const user = await getOrRejectUser(ctx);
    if (!user) return;

    if (!(await checkRateLimit(ctx, 'claim'))) return;

    if (getClaimSession(telegramId)) {
      await ctx.reply(messages.claimAlreadyInProgress);
      return;
    }

    clearAllFlows(telegramId);

    const userMax = getMaxPoints(telegramId);
    const maxClaim = userMax - user.points;
    if (maxClaim <= 0) {
      await ctx.reply(messages.atMaxBalance, Markup.inlineKeyboard([
        [Markup.button.callback('— Use Points', 'use_points')],
        [Markup.button.callback('🏠 Home', 'go_home')],
      ]));
      return;
    }

    const buttons: ReturnType<typeof Markup.button.callback>[][] = [];
    let row: ReturnType<typeof Markup.button.callback>[] = [];
    for (const amt of CLAIM_AMOUNTS) {
      if (amt <= maxClaim) {
        row.push(Markup.button.callback(`${amt}`, `claim_select:${amt}`));
        if (row.length === 3) {
          buttons.push(row);
          row = [];
        }
      }
    }
    if (row.length > 0) buttons.push(row);
    buttons.push([Markup.button.callback('🚫 Cancel', 'cancel_flow')]);

    await ctx.reply(
      messages.claimPromptButtons(user.points, isAdmin(telegramId)),
      Markup.inlineKeyboard(buttons),
    );
  } catch (error) {
    console.error('Error in claim command:', error);
    await ctx.reply(messages.error);
  }
}

export async function handleClaimSelect(ctx: Context, amount: number) {
  try {
    await ctx.answerCbQuery();
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    if (getClaimSession(telegramId)) {
      await ctx.reply(messages.claimAlreadyInProgress);
      return;
    }

    const user = await getOrRejectUser(ctx);
    if (!user) return;

    const maxClaim = getMaxPoints(telegramId) - user.points;
    if (amount > maxClaim || amount <= 0) {
      await ctx.reply(messages.numberTooHigh(maxClaim));
      return;
    }

    const availableTweets = await prisma.tweet.findMany({
      where: {
        isComplete: false,
        ownerUserId: { not: user.id },
        tasks: { none: { claimerUserId: user.id } },
      },
      take: amount,
      orderBy: { createdAt: 'asc' },
    });

    if (availableTweets.length === 0) {
      await ctx.reply(messages.claimNoTweets);
      return;
    }

    const actualAmount = Math.min(amount, availableTweets.length);

    const tasks = await Promise.all(
      availableTweets.slice(0, actualAmount).map((tweet) =>
        prisma.task.create({
          data: {
            claimerUserId: user.id,
            tweetId: tweet.id,
            status: 'IN_PROGRESS',
          },
        }),
      ),
    );

    const sessionTasks = tasks.map((task, i) => ({
      id: task.id,
      tweetUrl: availableTweets[i].tweetUrl,
    }));

    setClaimSession(telegramId, {
      tasks: sessionTasks,
      pointsToEarn: actualAmount,
      startedAt: Date.now(),
    });

    setRateLimit(telegramId, 'claim');

    const urls = sessionTasks.map((t) => t.tweetUrl);
    await ctx.reply(
      messages.claimMission(actualAmount, urls),
      Markup.inlineKeyboard([
        [Markup.button.callback('✅ Completed', 'claim_completed')],
        [Markup.button.callback('❌ Cancel', 'claim_cancel')],
      ]),
    );
  } catch (error) {
    console.error('Error handling claim select:', error);
    await ctx.reply(messages.error);
  }
}

export async function handleClaimCompleted(ctx: Context) {
  try {
    await ctx.answerCbQuery();
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const session = getClaimSession(telegramId);
    if (!session) {
      await ctx.reply('No active claim session.');
      return;
    }

    const elapsed = Date.now() - session.startedAt;
    if (elapsed > CLAIM_TIMEOUT_MS) {
      await Promise.all(
        session.tasks.map((t) =>
          prisma.task.update({
            where: { id: t.id },
            data: { status: 'EXPIRED' },
          }),
        ),
      );
      clearClaimSession(telegramId);
      await ctx.reply(messages.claimExpired, Markup.inlineKeyboard([
        [Markup.button.callback('🏠 Home', 'go_home')],
      ]));
      return;
    }

    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) return;

    await prisma.$transaction(async (tx) => {
      for (const task of session.tasks) {
        const taskRecord = await tx.task.update({
          where: { id: task.id },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });

        await tx.tweet.update({
          where: { id: taskRecord.tweetId },
          data: { filledSlots: { increment: 1 } },
        });

        const updatedTweet = await tx.tweet.findUnique({ where: { id: taskRecord.tweetId } });
        if (updatedTweet && updatedTweet.filledSlots >= updatedTweet.totalSlots) {
          await tx.tweet.update({
            where: { id: updatedTweet.id },
            data: { isComplete: true },
          });
        }
      }

      const freshUser = await tx.user.findUnique({ where: { id: user.id } });
      const userMax = getMaxPoints(telegramId);
      const cappedPoints = Math.min(session.pointsToEarn, userMax - (freshUser?.points || 0));
      if (cappedPoints > 0) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            points: { increment: cappedPoints },
            lastActivity: new Date(),
          },
        });
      }
    });

    clearClaimSession(telegramId);

    await ctx.reply(messages.claimCompleted, Markup.inlineKeyboard([
      [Markup.button.callback('🏠 Home', 'go_home')],
    ]));
  } catch (error) {
    console.error('Error handling claim completed:', error);
    await ctx.reply(messages.error);
  }
}

export async function handleClaimCancel(ctx: Context) {
  try {
    await ctx.answerCbQuery();
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const session = getClaimSession(telegramId);
    if (session) {
      await Promise.all(
        session.tasks.map((t) =>
          prisma.task.update({
            where: { id: t.id },
            data: { status: 'CANCELLED' },
          }),
        ),
      );
    }

    clearClaimSession(telegramId);

    await ctx.reply(messages.claimCancelled, Markup.inlineKeyboard([
      [Markup.button.callback('🏠 Home', 'go_home')],
    ]));
  } catch (error) {
    console.error('Error handling claim cancel:', error);
    await ctx.reply(messages.error);
  }
}
