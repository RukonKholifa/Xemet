import { Context, Markup } from 'telegraf';
import { prisma } from '@reply-society/db';
import { clearAllFlows } from '../state';
import { messages } from '../messages';

const PAGE_SIZE = 5;

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function claimHistoryCommand(ctx: Context, page = 0) {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    clearAllFlows(telegramId);

    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) {
      await ctx.reply(messages.notApproved);
      return;
    }

    const tasks = await prisma.task.findMany({
      where: {
        claimerUserId: user.id,
        status: { in: ['COMPLETED', 'EXPIRED', 'CANCELLED', 'FLAGGED'] },
      },
      include: { tweet: { select: { tweetUrl: true } } },
      orderBy: { claimedAt: 'desc' },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
    });

    const totalCount = await prisma.task.count({
      where: {
        claimerUserId: user.id,
        status: { in: ['COMPLETED', 'EXPIRED', 'CANCELLED', 'FLAGGED'] },
      },
    });

    if (tasks.length === 0 && page === 0) {
      await ctx.reply('📄 Claim History\n\nNo claim history yet.', Markup.inlineKeyboard([
        [Markup.button.callback('🏠 Back to Home', 'go_home')],
      ]));
      return;
    }

    let text = `📄 Claim History (Page ${page + 1})\nYour earn missions (completed, expired, cancelled):\n`;

    tasks.forEach((task, i) => {
      const icon =
        task.status === 'COMPLETED' ? '✅ Completed' :
        task.status === 'EXPIRED' ? '⏰ Expired' :
        task.status === 'CANCELLED' ? '❌ Cancelled' :
        task.status === 'FLAGGED' ? '🚩 Flagged' : task.status;
      const pts = task.status === 'COMPLETED' ? '+1 pts' : '+0 pts';
      const date = formatDate(task.claimedAt);
      text += `\n${page * PAGE_SIZE + i + 1}. ${icon} | ${date} | ${pts}`;
    });

    const buttons: ReturnType<typeof Markup.button.callback>[][] = [];

    const tweetButtons: ReturnType<typeof Markup.button.callback>[] = [];
    tasks.forEach((task, i) => {
      tweetButtons.push(Markup.button.callback(`📨 #${page * PAGE_SIZE + i + 1}`, `claim_tweet:${task.id}`));
    });
    if (tweetButtons.length > 0) buttons.push(tweetButtons);

    const navRow: ReturnType<typeof Markup.button.callback>[] = [
      Markup.button.callback('🔄 Refresh', `claim_history:${page}`),
    ];
    if ((page + 1) * PAGE_SIZE < totalCount) {
      navRow.push(Markup.button.callback('Next ➡️', `claim_history:${page + 1}`));
    }
    buttons.push(navRow);
    buttons.push([Markup.button.callback('🏠 Back to Home', 'go_home')]);

    await ctx.reply(text, Markup.inlineKeyboard(buttons));
  } catch (error) {
    console.error('Error in claim history:', error);
    await ctx.reply(messages.error);
  }
}

export async function useHistoryCommand(ctx: Context, page = 0) {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    clearAllFlows(telegramId);

    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) {
      await ctx.reply(messages.notApproved);
      return;
    }

    const tweets = await prisma.tweet.findMany({
      where: { ownerUserId: user.id },
      orderBy: { createdAt: 'desc' },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
    });

    const totalCount = await prisma.tweet.count({
      where: { ownerUserId: user.id },
    });

    if (tweets.length === 0 && page === 0) {
      await ctx.reply('📋 My Tweet History\n\nNo tweets promoted yet.', Markup.inlineKeyboard([
        [Markup.button.callback('🏠 Back to Home', 'go_home')],
      ]));
      return;
    }

    let text = `📋 My Tweet History (Page ${page + 1})\nTweets you promoted using your points:\n`;

    tweets.forEach((tweet, i) => {
      const date = formatDate(tweet.createdAt);
      const short = tweet.tweetUrl.length > 35 ? tweet.tweetUrl.slice(0, 35) + '...' : tweet.tweetUrl;
      text += `\n${page * PAGE_SIZE + i + 1}. ${short} | ${date} | ${tweet.filledSlots}/${tweet.totalSlots} engagements`;
    });

    const buttons: ReturnType<typeof Markup.button.callback>[][] = [];

    const tweetButtons: ReturnType<typeof Markup.button.callback>[] = [];
    tweets.forEach((tweet, i) => {
      tweetButtons.push(Markup.button.callback(`📨 #${page * PAGE_SIZE + i + 1}`, `use_tweet_view:${tweet.id}`));
    });
    if (tweetButtons.length > 0) buttons.push(tweetButtons);

    const navRow: ReturnType<typeof Markup.button.callback>[] = [
      Markup.button.callback('🔄 Refresh', `use_history:${page}`),
    ];
    if ((page + 1) * PAGE_SIZE < totalCount) {
      navRow.push(Markup.button.callback('Next ➡️', `use_history:${page + 1}`));
    }
    buttons.push(navRow);
    buttons.push([Markup.button.callback('🏠 Back to Home', 'go_home')]);

    await ctx.reply(text, Markup.inlineKeyboard(buttons));
  } catch (error) {
    console.error('Error in use history:', error);
    await ctx.reply(messages.error);
  }
}

export async function viewClaimTweet(ctx: Context, taskId: string) {
  try {
    await ctx.answerCbQuery();
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { tweet: true },
    });
    if (!task) {
      await ctx.reply('Task not found.');
      return;
    }
    await ctx.reply(task.tweet.tweetUrl, Markup.inlineKeyboard([
      [Markup.button.callback('⬅️ Back', 'claim_history')],
    ]));
  } catch (error) {
    console.error('Error viewing claim tweet:', error);
    await ctx.reply(messages.error);
  }
}

export async function viewUseTweet(ctx: Context, tweetId: string) {
  try {
    await ctx.answerCbQuery();
    const tweet = await prisma.tweet.findUnique({ where: { id: tweetId } });
    if (!tweet) {
      await ctx.reply('Tweet not found.');
      return;
    }
    await ctx.reply(
      `${tweet.tweetUrl}\n\nEngagements: ${tweet.filledSlots}/${tweet.totalSlots}`,
      Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ Back', 'use_history')],
      ]),
    );
  } catch (error) {
    console.error('Error viewing use tweet:', error);
    await ctx.reply(messages.error);
  }
}
