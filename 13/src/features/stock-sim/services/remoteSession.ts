import type { LeaderboardEntry, PersistedSimulationSnapshot, Sector } from '@/features/stock-sim/types';

export type RemoteStockSimSession = {
  userId: string;
  participantCount: number;
  leaderboard: LeaderboardEntry[];
  snapshot: PersistedSimulationSnapshot | null;
};

function getCurrentSiteUser() {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    return String(window.localStorage.getItem('current_user') || '').trim();
  } catch {
    return '';
  }
}

function getStockSimSessionUrl(userId?: string) {
  if (typeof window === 'undefined') {
    return '';
  }

  const url = new URL('/api/stock-sim/session', window.location.origin);

  if (userId) {
    url.searchParams.set('userId', userId);
  }

  return url.toString();
}

function normalizeLeaderboardEntry(
  entry: unknown,
  currentUserId: string,
): LeaderboardEntry | null {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const candidate = entry as Record<string, unknown>;
  const id = String(candidate.id || '').trim();
  if (!id) {
    return null;
  }

  const focusSectors = Array.isArray(candidate.focusSectors)
    ? candidate.focusSectors.filter((item): item is Sector => typeof item === 'string')
    : [];
  const kind =
    String(candidate.kind || '').trim() === 'current-user' ||
    id.toLowerCase().endsWith(currentUserId.toLowerCase())
      ? 'current-user'
      : 'friend-preview';

  return {
    id,
    name: String(candidate.name || '참가자'),
    kind,
    netWorth: Number(candidate.netWorth || 0),
    returnRate: Number(candidate.returnRate || 0),
    style: String(candidate.style || '실시간 참가자'),
    focusSectors,
    volatility: Number(candidate.volatility || 0),
    lastDelta: Number(candidate.lastDelta || 0),
  };
}

function normalizeRemoteSessionPayload(
  payload: unknown,
  currentUserId: string,
): RemoteStockSimSession | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  if (!candidate.success) {
    return null;
  }

  const participant =
    candidate.participant && typeof candidate.participant === 'object'
      ? (candidate.participant as Record<string, unknown>)
      : null;
  const snapshot =
    participant &&
    participant.snapshot &&
    typeof participant.snapshot === 'object'
      ? (participant.snapshot as PersistedSimulationSnapshot)
      : null;
  const leaderboard = Array.isArray(candidate.leaderboard)
    ? candidate.leaderboard
        .map((entry) => normalizeLeaderboardEntry(entry, currentUserId))
        .filter((entry): entry is LeaderboardEntry => Boolean(entry))
    : [];

  return {
    userId: currentUserId,
    participantCount: Number(candidate.participantCount || leaderboard.length || 0),
    leaderboard,
    snapshot,
  };
}

export async function fetchRemoteStockSimSession(): Promise<RemoteStockSimSession | null> {
  const currentUserId = getCurrentSiteUser();
  if (!currentUserId || typeof window === 'undefined') {
    return null;
  }

  try {
    const response = await fetch(getStockSimSessionUrl(currentUserId), {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
    });

    if (!response.ok) {
      return null;
    }

    return normalizeRemoteSessionPayload(await response.json(), currentUserId);
  } catch {
    return null;
  }
}

export async function saveRemoteStockSimSession(
  snapshot: PersistedSimulationSnapshot,
): Promise<RemoteStockSimSession | null> {
  const currentUserId = getCurrentSiteUser();
  if (!currentUserId || typeof window === 'undefined') {
    return null;
  }

  try {
    const response = await fetch(getStockSimSessionUrl(), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        userId: currentUserId,
        snapshot,
      }),
    });

    if (!response.ok) {
      return null;
    }

    return normalizeRemoteSessionPayload(await response.json(), currentUserId);
  } catch {
    return null;
  }
}
