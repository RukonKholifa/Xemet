import { Context, Markup } from 'telegraf';
import { prisma } from '@reply-society/db';
import { messages } from '../messages';
import { config, getMaxPoints, isAdmin } from '../config';
import { clearAllFlows } from '../state';
import { Telegraf } from 'telegraf';

let botInstance: Telegraf | null = null;

export function setGiftBotInstance(bot: Telegraf): void {
  botInstance = bot;
}

export async function giftInfoCommand(ctx: Context) {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    clearAllFlows(telegramId);

    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) {
      await ctx.reply(messages.notApproved);
      return;
    }

    await ctx.reply(messages.giftInfo(user.points, isAdmin(telegramId)), Markup.inlineKeyboard([
      [Markup.button.callback('🏠 Back to Home', 'go_home')],
    ]));
  } catch (error) {
    console.error('Error in gift info command:', error);
    await ctx.reply(messages.error);
  }
}

export async function giftCommand(ctx: Context) {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    clearAllFlows(telegramId);

    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user || user.status !== 'APPROVED') {
      await ctx.reply(messages.notApproved);
      return;
    }

    const text = (ctx.message as { text?: string })?.text;
    if (!text) return;

    const match = text.match(/^\/gift\s+@(\S+)\s+(\d+)(?:\s+(.*))?$/);
    if (!match) {
      await ctx.reply(messages.giftUsage);
      return;
    }

    const recipientUsername = match[1];
    const amount = parseInt(match[2], 10);
    const giftMessage = match[3] || '';

    if (amount <= 0) {
      await ctx.reply(messages.numberTooLow);
      return;
    }

    if (amount > user.points) {
      await ctx.reply(messages.giftInsufficientPoints);
      return;
    }

    const recipient = await prisma.user.findFirst({
      where: { telegramUsername: recipientUsername },
    });

    if (!recipient) {
      await ctx.reply(messages.giftNotFoundError);
      return;
    }

    if (recipient.id === user.id) {
      await ctx.reply(messages.giftSelfError);
      return;
    }

    if (recipient.status !== 'APPROVED') {
      await ctx.reply(messages.giftNotApprovedError);
      return;
    }

    const recipientMax = getMaxPoints(recipient.telegramId);
    const cappedAmount = Math.min(amount, recipientMax - recipient.points);
    if (cappedAmount <= 0) {
      await ctx.reply(`❌ @${recipientUsername} is already at the maximum balance.`);
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const freshSender = await tx.user.findUnique({ where: { id: user.id } });
      const freshRecipient = await tx.user.findUnique({ where: { id: recipient.id } });
      if (!freshSender || !freshRecipient) return null;

      const actualCap = Math.min(amount, freshSender.points, getMaxPoints(freshRecipient.telegramId) - freshRecipient.points);
      if (actualCap <= 0) return null;

      await tx.user.update({
        where: { id: user.id },
        data: { points: { decrement: actualCap }, lastActivity: new Date() },
      });
      await tx.user.update({
        where: { id: recipient.id },
        data: { points: { increment: actualCap } },
      });
      return actualCap;
    });

    if (!result) {
      await ctx.reply(messages.giftInsufficientPoints);
      return;
    }

    await ctx.reply(messages.giftSuccess(result, recipientUsername), Markup.inlineKeyboard([
      [Markup.button.callback('🏠 Home', 'go_home')],
    ]));

    if (botInstance) {
      try {
        await botInstance.telegram.sendMessage(
          recipient.telegramId,
          messages.giftReceived(result, ctx.from?.username || 'someone', giftMessage),
        );
      } catch (err) {
        console.error('Failed to notify gift recipient:', err);
      }
    }
  } catch (error) {
    console.error('Error in gift command:', error);
    await ctx.reply(messages.error);
  }
}
