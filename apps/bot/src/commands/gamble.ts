import { Context, Markup } from 'telegraf';
import { prisma } from '@reply-society/db';
import { messages } from '../messages';
import { config, getMaxPoints, isAdmin } from '../config';
import { clearAllFlows } from '../state';

export async function gambleCommand(ctx: Context) {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    clearAllFlows(telegramId);

    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user || user.status !== 'APPROVED') {
      await ctx.reply(messages.notApproved);
      return;
    }

    if (user.points < 1) {
      await ctx.reply(messages.gambleNoPoints);
      return;
    }

    await ctx.reply(
      messages.gamblePrompt(user.points, isAdmin(telegramId)),
      Markup.inlineKeyboard([
        [
          Markup.button.callback('2x', 'gamble:2'),
          Markup.button.callback('3x', 'gamble:3'),
          Markup.button.callback('5x', 'gamble:5'),
        ],
        [Markup.button.callback('⬅️ Back to Home', 'go_home')],
      ]),
    );
  } catch (error) {
    console.error('Error in gamble command:', error);
    await ctx.reply(messages.error);
  }
}

export async function handleGamble(ctx: Context, multiplier: number) {
  try {
    await ctx.answerCbQuery();
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user || user.status !== 'APPROVED') {
      await ctx.reply(messages.notApproved);
      return;
    }

    if (user.points < 1) {
      await ctx.reply(messages.gambleNoPoints);
      return;
    }

    let winChance: number;
    let winAmount: number;
    switch (multiplier) {
      case 2:
        winChance = 0.5;
        winAmount = 1;
        break;
      case 3:
        winChance = 1 / 3;
        winAmount = 2;
        break;
      case 5:
        winChance = 0.2;
        winAmount = 4;
        break;
      default:
        return;
    }

    const won = Math.random() < winChance;

    if (won) {
      const cappedWin = await prisma.$transaction(async (tx) => {
        const fresh = await tx.user.findUnique({ where: { id: user.id } });
        if (!fresh || fresh.points < 1) return 0;
        const cap = Math.min(winAmount, getMaxPoints(telegramId) - fresh.points);
        if (cap > 0) {
          await tx.user.update({
            where: { id: user.id },
            data: { points: { increment: cap }, lastActivity: new Date() },
          });
        }
        return cap;
      });
      await ctx.reply(messages.gambleWin(cappedWin), Markup.inlineKeyboard([
        [Markup.button.callback('🎲 Play Again', 'point_gamble')],
        [Markup.button.callback('🏠 Home', 'go_home')],
      ]));
    } else {
      const lost = await prisma.$transaction(async (tx) => {
        const fresh = await tx.user.findUnique({ where: { id: user.id } });
        if (!fresh || fresh.points < 1) return false;
        await tx.user.update({
          where: { id: user.id },
          data: { points: { decrement: 1 }, lastActivity: new Date() },
        });
        return true;
      });
      if (!lost) {
        await ctx.reply(messages.gambleNoPoints);
        return;
      }
      await ctx.reply(messages.gambleLose, Markup.inlineKeyboard([
        [Markup.button.callback('🎲 Play Again', 'point_gamble')],
        [Markup.button.callback('🏠 Home', 'go_home')],
      ]));
    }
  } catch (error) {
    console.error('Error handling gamble:', error);
    await ctx.reply(messages.error);
  }
}
