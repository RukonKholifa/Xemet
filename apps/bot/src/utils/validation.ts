const X_PROFILE_REGEX = /^https?:\/\/(x\.com|twitter\.com)\/[a-zA-Z0-9_]+\/?$/;
const TWEET_URL_REGEX = /^https?:\/\/(x\.com|twitter\.com)\/[a-zA-Z0-9_]+\/status\/\d+\/?(?:\?.*)?$/;

export function isValidXProfileUrl(url: string): boolean {
  return X_PROFILE_REGEX.test(url.trim());
}

export function isValidTweetUrl(url: string): boolean {
  return TWEET_URL_REGEX.test(url.trim());
}

export function parseNumber(text: string): number | null {
  const num = parseInt(text.trim(), 10);
  if (isNaN(num)) return null;
  return num;
}
