import { Context } from 'telegraf';
import { prisma } from '@reply-society/db';
import { messages } from '../messages';
import { isValidXProfileUrl } from '../utils/validation';
import { config } from '../config';

const awaitingProfile = new Set<string>();

export function isAwaitingProfile(telegramId: string): boolean {
  return awaitingProfile.has(telegramId);
}

export function clearAwaitingProfile(telegramId: string): void {
  awaitingProfile.delete(telegramId);
}

export async function setProfileCommand(ctx: Context) {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    awaitingProfile.add(telegramId);
    await ctx.reply(messages.setProfilePrompt, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in setprofile command:', error);
    await ctx.reply(messages.error);
  }
}

export async function handleProfileUrl(ctx: Context) {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const text = 'text' in (ctx.message || {}) ? (ctx.message as { text: string }).text : '';
    if (!text) return;

    if (!isValidXProfileUrl(text)) {
      await ctx.reply(messages.profileInvalid);
      return;
    }

    clearAwaitingProfile(telegramId);

    const user = await prisma.user.update({
      where: { telegramId },
      data: {
        xProfileUrl: text.trim(),
        status: 'PENDING',
        lastActivity: new Date(),
      },
    });

    await ctx.reply(messages.profileSet(text.trim()), { parse_mode: 'Markdown' });

    for (const adminId of config.adminTelegramIds) {
      try {
        await ctx.telegram.sendMessage(
          adminId,
          messages.adminNewUser(
            user.telegramUsername || 'unknown',
            text.trim(),
            user.id,
          ),
          { parse_mode: 'Markdown' },
        );
      } catch (err) {
        console.error(`Failed to notify admin ${adminId}:`, err);
      }
    }
  } catch (error) {
    console.error('Error handling profile URL:', error);
    await ctx.reply(messages.error);
  }
}
