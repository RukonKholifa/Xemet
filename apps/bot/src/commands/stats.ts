import { Context } from 'telegraf';
import { prisma } from '@reply-society/db';
import { messages } from '../messages';

export async function statsCommand(ctx: Context) {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) {
      await ctx.reply(messages.noProfile);
      return;
    }

    const engagementsGiven = await prisma.task.count({
      where: {
        claimerUserId: user.id,
        status: 'COMPLETED',
      },
    });

    const engagementsReceived = await prisma.task.count({
      where: {
        tweet: { ownerUserId: user.id },
        status: 'COMPLETED',
      },
    });

    await ctx.reply(messages.statsUser(engagementsGiven, engagementsReceived, user.points), {
      parse_mode: 'Markdown',
    });
  } catch (error) {
    console.error('Error in stats command:', error);
    await ctx.reply(messages.error);
  }
}
