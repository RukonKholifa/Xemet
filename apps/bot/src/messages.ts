function formatBalance(balance: number, isAdmin: boolean): string {
  return isAdmin ? '♾️ Unlimited' : `${balance}`;
}

export const messages = {
  homeDashboard: (
    balance: number,
    status: string,
    activeTweets: Array<{ tweetUrl: string; filledSlots: number; totalSlots: number }>,
    isAdminUser = false,
  ) => {
    const statusIcon =
      status === 'APPROVED' ? '✅ Active' :
      status === 'PENDING' ? '⏳ Pending' :
      status === 'REJECTED' ? '❌ Rejected' :
      status === 'BANNED' ? '🚫 Banned' :
      status === 'INACTIVE' ? '💤 Inactive' : status;

    let text =
      `👋 Welcome to EngageSwapBot!\n\n` +
      `💎 Points: ${formatBalance(balance, isAdminUser)}\n` +
      `📗 Status: ${statusIcon}\n\n` +
      `🚀 Mission: Earn points by engaging on X (Twitter).\n` +
      `Keeping your profile active helps the army grow!`;

    if (activeTweets.length > 0) {
      text += `\n\n📋 Your Active Tweets:`;
      for (const t of activeTweets) {
        const short = t.tweetUrl.length > 40 ? t.tweetUrl.slice(0, 40) + '...' : t.tweetUrl;
        text += `\n- ${short} (${t.filledSlots}/${t.totalSlots})`;
      }
    }

    text += `\n\n👇 Choose an action below:`;
    return text;
  },

  welcomeNew:
    `👋 Welcome to EngageSwapBot!\n\n` +
    `This is a Twitter/X engagement exchange system.\n` +
    `• Earn points by engaging with others' tweets\n` +
    `• Spend points to get engagements on your tweets\n\n` +
    `Start by setting your X profile using the button below.`,

  claimPromptButtons: (balance: number, isAdminUser = false) =>
    `💰 Claim Points\n💎 Current Balance: ${formatBalance(balance, isAdminUser)}\nSelect an amount to add to your balance:`,

  claimMission: (n: number, urls: string[]) => {
    let text = `🚀 Reply Mission: ${n} Tweets\n⏳ You have 4h 0m to complete this task.\nPlease reply to the following tweets:\n`;
    urls.forEach((url, i) => {
      text += `\n${i + 1}) ${url}`;
    });
    text += `\n\n👇 Press 'Completed' ONLY after you have replied to all!`;
    return text;
  },

  claimCompleted: `🎉 Mission Completed!\nPoints have been added to your balance.`,

  claimCancelled: `Task cancelled. No points awarded.`,

  claimExpired: `⏰ Your claim mission expired. No points awarded.`,

  claimNoTweets: `😕 No engagement tasks available right now. Check back later!`,

  claimAlreadyInProgress: `⚠️ You already have tasks in progress. Complete them first!`,

  usePromptButtons: (balance: number, isAdminUser = false) =>
    `💸 Use Points\n💎 Current Balance: ${formatBalance(balance, isAdminUser)}\nSelect an amount to spend:\n\n` +
    `💡 You can spend multiple points on the same tweet. ` +
    `The system will recognize it and won't show the same tweet to the same user twice.`,

  useTweetPrompt: (n: number) =>
    `💸 Spending ${n} Points\n` +
    `Please send the X (Twitter) Link of the tweet you want to promote.\n` +
    `Example: https://x.com/username/status/123456789`,

  useSuccess: (n: number) =>
    `✅ Tweet Promoted!\n` +
    `Points spent: ${n}\n` +
    `Your tweet is now in the pool. Others will reply to it soon!`,

  useTweetInvalid: `❌ Invalid tweet URL. Please send a valid Twitter/X tweet URL.\nExample: https://x.com/username/status/123456789`,

  useInsufficientPoints: (current: number) =>
    `❌ Insufficient points. You have ${current} points.`,

  myStatus: (
    name: string,
    username: string | null,
    xProfileUrl: string | null,
    balance: number,
    status: string,
    isAdminUser = false,
  ) => {
    const statusText =
      status === 'APPROVED' ? '✅ Authorized' :
      status === 'PENDING' ? '⏳ Pending' :
      status === 'REJECTED' ? '❌ Rejected' :
      status === 'BANNED' ? '🚫 Banned' :
      status === 'INACTIVE' ? '💤 Inactive' : status;

    return (
      `📊 Your Commander Profile\n\n` +
      `👤 Name: ${name}\n` +
      `🪪 Username: @${username || 'not set'}\n` +
      `🔗 X Profile: ${xProfileUrl || 'not linked'}\n\n` +
      `💰 Balance: ${formatBalance(balance, isAdminUser)} Points\n` +
      `🛡️ Approval: ${statusText}`
    );
  },

  myStats: (
    weekly: { engagements: number; earned: number; spent: number },
    allTime: {
      engagements: number;
      earned: number;
      spent: number;
      completed: number;
      cancelled: number;
      expired: number;
    },
    balance: number,
    isAdminUser = false,
  ) =>
    `📈 My Stats\n\n` +
    `🗓️ Last 7 Days:\n` +
    `└ 🤝 Engagements: ${weekly.engagements}\n` +
    `└ + Points Earned: ${weekly.earned}\n` +
    `└ — Points Spent: ${weekly.spent}\n\n` +
    `📊 All Time:\n` +
    `└ 🤝 Engagements: ${allTime.engagements}\n` +
    `└ + Points Earned: ${allTime.earned}\n` +
    `└ — Points Spent: ${allTime.spent}\n` +
    `└ ✅ Missions Completed: ${allTime.completed}\n` +
    `└ ❌ Missions Cancelled: ${allTime.cancelled}\n` +
    `└ ⏰ Missions Expired: ${allTime.expired}\n\n` +
    `💎 Current Balance: ${formatBalance(balance, isAdminUser)}`,

  giftInfo: (balance: number, isAdminUser = false) =>
    `🎁 Gift Points\nSend points to another member!\n\n` +
    `📋 How to use:\n/gift @telegramUsername {points} {message}\n\n` +
    `📌 Examples:\n/gift @john 5 Thanks for the help!\n/gift @alice 10 Great work this week\n\n` +
    `⚠️ Rules:\n` +
    `- You must have enough points in your balance\n` +
    `- You cannot gift points to yourself\n` +
    `- The recipient must be a registered member\n` +
    `- Gifts cannot be undone once confirmed\n\n` +
    `💎 Your current balance: ${formatBalance(balance, isAdminUser)}`,

  giftSuccess: (amount: number, recipient: string) =>
    `✅ Gift sent! ${amount} points transferred to @${recipient}.`,

  giftReceived: (amount: number, sender: string, message: string) =>
    `🎁 You received ${amount} points from @${sender}!${message ? ` Message: ${message}` : ''}`,

  giftSelfError: `❌ You cannot gift points to yourself.`,

  giftNotFoundError: `❌ Recipient not found. They must be a registered member.`,

  giftNotApprovedError: `❌ Recipient is not an approved member.`,

  giftInsufficientPoints: `❌ You don't have enough points for this gift.`,

  giftUsage: `❌ Usage: /gift @username amount message\nExample: /gift @john 5 Thanks!`,

  gamblePrompt: (balance: number, isAdminUser = false) =>
    `🎲 Point Gamble\n💎 Current Balance: ${formatBalance(balance, isAdminUser)}\n\n` +
    `Test your luck! Each play costs 1 point.\nChoose your risk level below:`,

  gambleWin: (n: number) =>
    `🎉 You won! +${n} points added to your balance!`,

  gambleLose: `😔 Better luck next time! -1 point`,

  gambleNoPoints: `❌ Not enough points to gamble. You need at least 1 point.`,

  setProfilePrompt:
    `🔗 Link your X Profile\n` +
    `Please reply with your X (Twitter) profile URL.\n` +
    `Example: https://x.com/elonmusk`,

  profileSet: (url: string) =>
    `✅ Profile saved! Waiting for admin approval.`,

  profileInvalid:
    `❌ Invalid URL format. Please send a valid X/Twitter profile URL:\n` +
    `• https://x.com/yourhandle\n• https://twitter.com/yourhandle`,

  notApproved: `⚠️ Your account has not been approved yet. Please wait for admin review.`,

  alreadyBanned: `🚫 You are banned from using this bot.`,

  noProfile: `⚠️ You haven't set your X profile yet. Use the Set X Profile button to get started.`,

  adminNewUser: (username: string, url: string, telegramId: string) =>
    `🆕 New user awaiting approval:\n\n` +
    `👤 @${username}\n` +
    `🔗 ${url}\n` +
    `🆔 Telegram ID: ${telegramId}\n\n` +
    `Use /approve ${telegramId} or /reject ${telegramId}`,

  userApproved: `✅ Account Approved! You can now use /claim and /use.`,

  userRejected: `❌ Your account has been REJECTED. Please contact an admin if you believe this is an error.`,

  userBanned: `🚫 Your account has been BANNED. You can no longer use this bot.`,

  userUnbanned: `✅ Your account has been UNBANNED. You can use the bot again.`,

  adminStats: (stats: {
    totalUsers: number;
    approved: number;
    pending: number;
    banned: number;
    totalPoints: number;
    activeTweets: number;
    tasksToday: number;
  }) =>
    `📊 Admin Stats\n\n` +
    `Total Users: ${stats.totalUsers}\n` +
    `Approved: ${stats.approved}\n` +
    `Pending: ${stats.pending}\n` +
    `Banned: ${stats.banned}\n` +
    `Total Points in Circulation: ${stats.totalPoints}\n` +
    `Active Tweets in Queue: ${stats.activeTweets}\n` +
    `Tasks Completed Today: ${stats.tasksToday}`,

  pendingList: (users: Array<{ telegramUsername: string | null; telegramId: string; xProfileUrl: string | null }>) => {
    if (users.length === 0) return '✅ No users pending approval.';
    const list = users
      .map((u) => `• @${u.telegramUsername || 'unknown'} — ${u.xProfileUrl || 'no profile'}`)
      .join('\n');
    return `📋 Pending Users:\n\n${list}`;
  },

  shameList: (users: Array<{ telegramUsername: string | null; telegramId: string; flagCount: number }>) => {
    if (users.length === 0) return '✅ No flagged users.';
    const list = users
      .map((u) => `• @${u.telegramUsername || 'unknown'} — ${u.flagCount} flagged tasks — /ban ${u.telegramId}`)
      .join('\n');
    return `🚩 Shame List (Flagged Users):\n\n${list}`;
  },

  rateLimited: (minutes: number) =>
    `⏳ You're doing that too fast! Please wait ${minutes} minutes before trying again.`,

  invalidNumber: `❌ Please send a valid number.`,

  numberTooHigh: (max: number) => `❌ Maximum allowed is ${max}.`,

  atMaxBalance: `❌ You're already at the maximum balance of 50 points! Spend some points first using — Use Points.`,

  numberTooLow: `❌ Please enter a number greater than 0.`,

  error: `❌ An error occurred. Please try again later.`,

  inactiveNotice: `⚠️ You were removed for inactivity. Start the bot again to reactivate.`,

  engagementNotification: (tweetUrl: string, engagerUsername: string) =>
    `🔔 Someone engaged with your tweet!\n\n` +
    `🔗 ${tweetUrl}\n` +
    `👤 @${engagerUsername}`,

  notAdmin: `❌ You are not authorized to use admin commands.`,
};
