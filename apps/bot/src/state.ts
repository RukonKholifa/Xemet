type FlowType = 'profile' | 'claim_count' | 'claim_session' | 'use_count' | 'use_tweet' | 'admin_approve' | 'admin_reject' | 'admin_ban' | 'admin_unban' | 'admin_addpoints';

interface ClaimSession {
  tasks: Array<{ id: string; tweetUrl: string }>;
  pointsToEarn: number;
  startedAt: number;
}

interface UseSession {
  points: number;
}

const activeFlows = new Map<string, FlowType>();
const claimSessions = new Map<string, ClaimSession>();
const useSessions = new Map<string, UseSession>();

export function clearAllFlows(telegramId: string): void {
  activeFlows.delete(telegramId);
}

export function setFlow(telegramId: string, flow: FlowType): void {
  activeFlows.set(telegramId, flow);
}

export function getFlow(telegramId: string): FlowType | undefined {
  return activeFlows.get(telegramId);
}

export function isInFlow(telegramId: string, flow: FlowType): boolean {
  return activeFlows.get(telegramId) === flow;
}

export function setClaimSession(telegramId: string, session: ClaimSession): void {
  claimSessions.set(telegramId, session);
  setFlow(telegramId, 'claim_session');
}

export function getClaimSession(telegramId: string): ClaimSession | undefined {
  return claimSessions.get(telegramId);
}

export function clearClaimSession(telegramId: string): void {
  claimSessions.delete(telegramId);
  if (activeFlows.get(telegramId) === 'claim_session') {
    activeFlows.delete(telegramId);
  }
}

export function setUseSession(telegramId: string, session: UseSession): void {
  useSessions.set(telegramId, session);
}

export function getUseSession(telegramId: string): UseSession | undefined {
  return useSessions.get(telegramId);
}

export function clearUseSession(telegramId: string): void {
  useSessions.delete(telegramId);
  if (activeFlows.get(telegramId) === 'use_tweet') {
    activeFlows.delete(telegramId);
  }
}
