import { Context, Markup } from 'telegraf';
import { prisma } from '@reply-society/db';
import { messages } from '../messages';
import { isValidXProfileUrl } from '../utils/validation';
import { config } from '../config';
import { clearAllFlows, setFlow, isInFlow } from '../state';
import { Telegraf } from 'telegraf';

let botInstance: Telegraf | null = null;

export function setBotInstance(bot: Telegraf): void {
  botInstance = bot;
}

export async function setProfileCommand(ctx: Context) {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (user?.status === 'BANNED') {
      await ctx.reply(messages.alreadyBanned);
      return;
    }

    clearAllFlows(telegramId);
    setFlow(telegramId, 'profile');

    await ctx.reply(messages.setProfilePrompt, Markup.inlineKeyboard([
      [Markup.button.callback('❌ Cancel', 'cancel_flow')],
    ]));
  } catch (error) {
    console.error('Error in setprofile command:', error);
    await ctx.reply(messages.error);
  }
}

export async function handleProfileUrl(ctx: Context) {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    if (!isInFlow(telegramId, 'profile')) return;

    const text = (ctx.message as { text?: string })?.text;
    if (!text) return;

    const url = text.trim();
    if (!isValidXProfileUrl(url)) {
      await ctx.reply(messages.profileInvalid);
      return;
    }

    clearAllFlows(telegramId);

    let user = await prisma.user.findUnique({ where: { telegramId } });

    if (user) {
      const newStatus = user.status === 'APPROVED' ? 'APPROVED' :
                        user.status === 'BANNED' ? 'BANNED' : 'PENDING';
      await prisma.user.update({
        where: { id: user.id },
        data: {
          xProfileUrl: url,
          status: newStatus,
          lastActivity: new Date(),
          telegramUsername: ctx.from?.username || user.telegramUsername,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          telegramId,
          telegramUsername: ctx.from?.username || null,
          xProfileUrl: url,
          status: 'PENDING',
        },
      });
    }

    await ctx.reply(messages.profileSet(url), Markup.inlineKeyboard([
      [Markup.button.callback('🏠 Home', 'go_home')],
    ]));

    if (user.status !== 'APPROVED' && user.status !== 'BANNED' && botInstance) {
      for (const adminId of config.adminTelegramIds) {
        try {
          await botInstance.telegram.sendMessage(
            adminId,
            messages.adminNewUser(
              ctx.from?.username || 'unknown',
              url,
              telegramId,
            ),
          );
        } catch (err) {
          console.error(`Failed to notify admin ${adminId}:`, err);
        }
      }
    }
  } catch (error) {
    console.error('Error handling profile URL:', error);
    await ctx.reply(messages.error);
  }
}
