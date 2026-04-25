export const messages = {
  welcome: (username: string, points: number, status: string) =>
    `🏆 *Reply Society Champs Bot*\n\n` +
    `👤 Username: @${username}\n` +
    `💰 Points: ${points}/50\n` +
    `📋 Status: ${status}\n\n` +
    `Use the buttons below to navigate:`,

  welcomeNew:
    `🏆 Welcome to *Reply Society Champs Bot*!\n\n` +
    `This is a Twitter/X engagement exchange system.\n` +
    `• Earn points by engaging with others' tweets\n` +
    `• Spend points to get engagements on your tweets\n\n` +
    `Start by setting your X profile using the button below.`,

  setProfilePrompt: `📝 Please send your X (Twitter) profile URL.\n\nAccepted formats:\n• https://x.com/yourhandle\n• https://twitter.com/yourhandle`,

  profileSet: (url: string) =>
    `✅ Profile set to: ${url}\n\nYour account is now *PENDING REVIEW*. An admin will review your profile shortly.`,

  profileInvalid: `❌ Invalid URL format. Please send a valid X/Twitter profile URL:\n• https://x.com/yourhandle\n• https://twitter.com/yourhandle`,

  adminNewUser: (username: string, url: string, userId: string) =>
    `🆕 New user awaiting approval:\n\n` +
    `👤 @${username}\n` +
    `🔗 ${url}\n` +
    `🆔 ID: ${userId}\n\n` +
    `Use /approve ${userId} or /reject ${userId}`,

  userApproved: `🎉 Your account has been *APPROVED*! You can now claim and use points.\n\nUse /claim to start earning points or /use to spend them.`,

  userRejected: `❌ Your account has been *REJECTED*. Please contact an admin if you believe this is an error.`,

  userBanned: `🚫 Your account has been *BANNED*. You can no longer use this bot.`,

  userUnbanned: `✅ Your account has been *UNBANNED*. You can use the bot again.`,

  notApproved: `⚠️ Your account has not been approved yet. Please wait for admin review.`,

  alreadyBanned: `🚫 You are banned from using this bot.`,

  claimPrompt: (maxClaim: number) =>
    `📥 How many points do you want to claim?\n\nYou can claim up to *${maxClaim}* points.\n\nSend a number:`,

  claimNoSlots: `😕 No engagement tasks available right now. Check back later!`,

  claimTask: (tweetUrl: string, current: number, total: number) =>
    `📋 Task ${current}/${total}\n\n` +
    `🔗 ${tweetUrl}\n\n` +
    `Please engage with this tweet (like, reply, or repost), then tap ✅ Done.`,

  claimComplete: (points: number) =>
    `🎉 All tasks completed! You earned *${points}* points.\n\nYour new balance will be updated shortly.`,

  claimAlreadyInProgress: `⚠️ You already have tasks in progress. Complete them first!`,

  usePrompt: `📤 How many points do you want to spend?\n\nSend a number:`,

  useTweetPrompt: `📎 Now send the tweet URL you want to promote:`,

  useTweetInvalid: `❌ Invalid tweet URL. Please send a valid Twitter/X tweet URL.`,

  useSuccess: (points: number, tweetUrl: string) =>
    `✅ Success! Spent *${points}* points.\n\n` +
    `Tweet: ${tweetUrl}\n\n` +
    `You'll be notified as others engage with your tweet.`,

  useInsufficientPoints: (current: number) =>
    `❌ Insufficient points. You have *${current}* points.`,

  engagementNotification: (tweetUrl: string, engagerUsername: string) =>
    `🔔 Someone engaged with your tweet!\n\n` +
    `🔗 ${tweetUrl}\n` +
    `👤 @${engagerUsername}`,

  rateLimited: (minutes: number) =>
    `⏳ You're doing that too fast! Please wait *${minutes}* minutes before trying again.`,

  noProfile: `⚠️ You haven't set your X profile yet. Use /setprofile to get started.`,

  invalidNumber: `❌ Please send a valid number.`,

  numberTooHigh: (max: number) => `❌ Maximum allowed is *${max}*.`,

  numberTooLow: `❌ Please enter a number greater than 0.`,

  statsUser: (
    totalEngagementsGiven: number,
    totalEngagementsReceived: number,
    points: number,
  ) =>
    `📊 *Your Stats*\n\n` +
    `✅ Engagements Given: ${totalEngagementsGiven}\n` +
    `📥 Engagements Received: ${totalEngagementsReceived}\n` +
    `💰 Current Points: ${points}/50`,

  adminStats: (
    totalUsers: number,
    totalPoints: number,
    activeUsers: number,
    pendingUsers: number,
  ) =>
    `📊 *Bot Statistics*\n\n` +
    `👥 Total Users: ${totalUsers}\n` +
    `💰 Total Points Distributed: ${totalPoints}\n` +
    `🟢 Active Users (7d): ${activeUsers}\n` +
    `⏳ Pending Approval: ${pendingUsers}`,

  pendingList: (users: Array<{ telegramUsername: string | null; id: string }>) => {
    if (users.length === 0) return '✅ No users pending approval.';
    const list = users
      .map((u) => `• @${u.telegramUsername || 'unknown'} — /approve ${u.id}`)
      .join('\n');
    return `📋 *Pending Users:*\n\n${list}`;
  },

  shameList: (users: Array<{ telegramUsername: string | null; id: string; flagCount: number }>) => {
    if (users.length === 0) return '✅ No flagged users.';
    const list = users
      .map((u) => `• @${u.telegramUsername || 'unknown'} — ${u.flagCount} flagged tasks — /ban ${u.id}`)
      .join('\n');
    return `🚩 *Shame List (Flagged Users):*\n\n${list}`;
  },

  inactiveNotice: `⚠️ You've been marked as *INACTIVE* due to no activity in the past 7 days. Use /start to reactivate.`,

  error: `❌ Something went wrong. Please try again later.`,

  notAdmin: `⚠️ This command is only available to admins.`,

  userNotFound: `❌ User not found.`,

  actionSuccess: (action: string, target: string) =>
    `✅ ${action} successful for user ${target}.`,
};
