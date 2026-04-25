import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  botToken: process.env.BOT_TOKEN || '',
  databaseUrl: process.env.DATABASE_URL || '',
  adminTelegramIds: (process.env.ADMIN_TELEGRAM_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
  port: parseInt(process.env.BOT_PORT || '3001', 10),
  maxPoints: 50,
  inactivityDays: 7,
  rateLimitMinutes: 10,
};

export function isAdmin(telegramId: string): boolean {
  return config.adminTelegramIds.includes(telegramId);
}
