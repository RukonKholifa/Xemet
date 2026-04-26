import { Context } from 'telegraf';
import { messages } from '../messages';
import { config } from '../config';

const rateLimitMap = new Map<string, number>();

export function rateLimitKey(userId: string, command: string): string {
  return `${userId}:${command}`;
}

export function isRateLimited(userId: string, command: string): boolean {
  const key = rateLimitKey(userId, command);
  const lastUsed = rateLimitMap.get(key);
  if (!lastUsed) return false;

  const elapsed = Date.now() - lastUsed;
  return elapsed < config.rateLimitMinutes * 60 * 1000;
}

export function setRateLimit(userId: string, command: string): void {
  const key = rateLimitKey(userId, command);
  rateLimitMap.set(key, Date.now());
}

export function getRemainingMinutes(userId: string, command: string): number {
  const key = rateLimitKey(userId, command);
  const lastUsed = rateLimitMap.get(key);
  if (!lastUsed) return 0;

  const elapsed = Date.now() - lastUsed;
  const remaining = config.rateLimitMinutes * 60 * 1000 - elapsed;
  return Math.ceil(remaining / 60000);
}

export async function checkRateLimit(
  ctx: Context,
  command: string,
): Promise<boolean> {
  const userId = ctx.from?.id.toString();
  if (!userId) return false;

  if (isRateLimited(userId, command)) {
    const remaining = getRemainingMinutes(userId, command);
    await ctx.reply(messages.rateLimited(remaining), { parse_mode: 'Markdown' });
    return false;
  }

  return true;
}
