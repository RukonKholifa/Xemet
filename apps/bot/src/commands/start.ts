import { Context, Markup } from 'telegraf';
import { prisma } from '@reply-society/db';
import { messages } from '../messages';

export async function startCommand(ctx: Context) {
  try {
    const telegramId = ctx.from?.id.toString();
    const telegramUsername = ctx.from?.username || 'unknown';

    if (!telegramId) return;

    let user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId,
          telegramUsername,
        },
      });

      await ctx.reply(messages.welcomeNew, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📝 Set X Profile', 'set_profile')],
        ]),
      });
      return;
    }

    user = await prisma.user.update({
      where: { telegramId },
      data: {
        lastActivity: new Date(),
        telegramUsername,
        status: user.status === 'INACTIVE' ? 'APPROVED' : user.status,
      },
    });

    const keyboard = [];
    if (!user.xProfileUrl) {
      keyboard.push([Markup.button.callback('📝 Set X Profile', 'set_profile')]);
    }
    if (user.status === 'APPROVED') {
      keyboard.push([
        Markup.button.callback('📥 Claim Points', 'claim_points'),
        Markup.button.callback('📤 Use Points', 'use_points'),
      ]);
    }
    keyboard.push([Markup.button.callback('📊 My Stats', 'my_stats')]);

    await ctx.reply(messages.welcome(telegramUsername, user.points, user.status), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(keyboard),
    });
  } catch (error) {
    console.error('Error in start command:', error);
    await ctx.reply(messages.error);
  }
}
