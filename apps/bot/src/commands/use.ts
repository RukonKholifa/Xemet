import { Context } from 'telegraf';
import { prisma } from '@reply-society/db';
import { messages } from '../messages';
import { parseNumber, isValidTweetUrl } from '../utils/validation';
import { checkRateLimit, setRateLimit } from '../middleware/rateLimit';

const awaitingUseCount = new Map<string, number>();
const awaitingTweetUrl = new Set<string>();

export function isAwaitingUseCount(telegramId: string): boolean {
  return awaitingUseCount.has(telegramId) || awaitingTweetUrl.has(telegramId);
}

export function clearAwaitingUse(telegramId: string): void {
  awaitingUseCount.delete(telegramId);
  awaitingTweetUrl.delete(telegramId);
}

export async function useCommand(ctx: Context) {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user || user.status !== 'APPROVED') {
      await ctx.reply(messages.notApproved, { parse_mode: 'Markdown' });
      return;
    }

    if (user.points <= 0) {
      await ctx.reply(messages.useInsufficientPoints(user.points), { parse_mode: 'Markdown' });
      return;
    }

    if (!(await checkRateLimit(ctx, 'use'))) return;

    awaitingUseCount.set(telegramId, 0);
    await ctx.reply(messages.usePrompt, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in use command:', error);
    await ctx.reply(messages.error);
  }
}

export async function handleUseCount(ctx: Context) {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const text = 'text' in (ctx.message || {}) ? (ctx.message as { text: string }).text : '';

    if (awaitingTweetUrl.has(telegramId)) {
      await handleTweetUrl(ctx, telegramId, text);
      return;
    }

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

    if (count > user.points) {
      await ctx.reply(messages.useInsufficientPoints(user.points), { parse_mode: 'Markdown' });
      return;
    }

    awaitingUseCount.set(telegramId, count);
    awaitingTweetUrl.add(telegramId);
    await ctx.reply(messages.useTweetPrompt, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error handling use count:', error);
    await ctx.reply(messages.error);
  }
}

async function handleTweetUrl(ctx: Context, telegramId: string, text: string) {
  try {
    if (!isValidTweetUrl(text)) {
      await ctx.reply(messages.useTweetInvalid);
      return;
    }

    const count = awaitingUseCount.get(telegramId) || 0;
    clearAwaitingUse(telegramId);
    setRateLimit(telegramId, 'use');

    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) return;

    if (count > user.points) {
      await ctx.reply(messages.useInsufficientPoints(user.points), { parse_mode: 'Markdown' });
      return;
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { telegramId },
        data: {
          points: { decrement: count },
          lastActivity: new Date(),
        },
      }),
      prisma.tweet.create({
        data: {
          ownerUserId: user.id,
          tweetUrl: text.trim(),
          totalSlots: count,
        },
      }),
    ]);

    await ctx.reply(messages.useSuccess(count, text.trim()), { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error handling tweet URL:', error);
    await ctx.reply(messages.error);
  }
}
