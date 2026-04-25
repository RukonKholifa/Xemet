import { Context, Markup } from 'telegraf';
import { prisma } from '@reply-society/db';
import { messages } from '../messages';
import { config, isAdmin } from '../config';
import { checkRateLimit, setRateLimit } from '../middleware/rateLimit';
import { isValidTweetUrl } from '../utils/validation';
import {
  clearAllFlows, setFlow, isInFlow,
  setUseSession, getUseSession, clearUseSession,
} from '../state';

const USE_AMOUNTS = [1, 5, 10, 15, 20, 25, 30, 35, 40, 50];

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

export async function useCommand(ctx: Context) {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const user = await getOrRejectUser(ctx);
    if (!user) return;

    if (!(await checkRateLimit(ctx, 'use'))) return;

    clearAllFlows(telegramId);

    if (user.points <= 0) {
      await ctx.reply(messages.useInsufficientPoints(user.points));
      return;
    }

    const buttons: ReturnType<typeof Markup.button.callback>[][] = [];
    let row: ReturnType<typeof Markup.button.callback>[] = [];
    for (const amt of USE_AMOUNTS) {
      if (amt <= user.points) {
        row.push(Markup.button.callback(`${amt}`, `use_select:${amt}`));
        if (row.length === 3) {
          buttons.push(row);
          row = [];
        }
      }
    }
    if (row.length > 0) buttons.push(row);
    buttons.push([Markup.button.callback('🚫 Cancel', 'cancel_flow')]);

    await ctx.reply(
      messages.usePromptButtons(user.points, isAdmin(telegramId)),
      Markup.inlineKeyboard(buttons),
    );
  } catch (error) {
    console.error('Error in use command:', error);
    await ctx.reply(messages.error);
  }
}

export async function handleUseSelect(ctx: Context, amount: number) {
  try {
    await ctx.answerCbQuery();
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const user = await getOrRejectUser(ctx);
    if (!user) return;

    if (amount > user.points || amount <= 0) {
      await ctx.reply(messages.useInsufficientPoints(user.points));
      return;
    }

    clearAllFlows(telegramId);
    setUseSession(telegramId, { points: amount });
    setFlow(telegramId, 'use_tweet');

    await ctx.reply(
      messages.useTweetPrompt(amount),
      Markup.inlineKeyboard([
        [Markup.button.callback('❌ Cancel', 'cancel_flow')],
      ]),
    );
  } catch (error) {
    console.error('Error handling use select:', error);
    await ctx.reply(messages.error);
  }
}

export async function handleUseTweetUrl(ctx: Context) {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    if (!isInFlow(telegramId, 'use_tweet')) return;

    const text = (ctx.message as { text?: string })?.text;
    if (!text) return;

    const url = text.trim();
    if (!isValidTweetUrl(url)) {
      await ctx.reply(messages.useTweetInvalid);
      return;
    }

    const session = getUseSession(telegramId);
    if (!session) return;

    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) return;

    if (user.points < session.points) {
      clearUseSession(telegramId);
      clearAllFlows(telegramId);
      await ctx.reply(messages.useInsufficientPoints(user.points));
      return;
    }

    const success = await prisma.$transaction(async (tx) => {
      const freshUser = await tx.user.findUnique({ where: { id: user.id } });
      if (!freshUser || freshUser.points < session.points) return false;

      await tx.user.update({
        where: { id: user.id },
        data: {
          points: { decrement: session.points },
          lastActivity: new Date(),
        },
      });

      await tx.tweet.create({
        data: {
          ownerUserId: user.id,
          tweetUrl: url,
          totalSlots: session.points,
          filledSlots: 0,
        },
      });
      return true;
    });

    if (!success) {
      clearUseSession(telegramId);
      clearAllFlows(telegramId);
      await ctx.reply(messages.useInsufficientPoints(user.points));
      return;
    }

    setRateLimit(telegramId, 'use');
    clearUseSession(telegramId);
    clearAllFlows(telegramId);

    await ctx.reply(
      messages.useSuccess(session.points),
      Markup.inlineKeyboard([
        [Markup.button.callback('🏠 Home', 'go_home')],
      ]),
    );
  } catch (error) {
    console.error('Error handling use tweet URL:', error);
    await ctx.reply(messages.error);
  }
}
