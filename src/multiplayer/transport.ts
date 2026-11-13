import type { ElementSchool, MatchState, PlayerId } from '../engine/types';

export interface GuestSeat {
  code: string;
  token: string;
}

export interface RoomSnapshot {
  code: string;
  seat: PlayerId;
  revision: number;
  ready: boolean;
  match: MatchState;
  clashActor: PlayerId | null;
}

export type DuelIntent =
  | { type: 'attack'; element: ElementSchool; ultimate: boolean }
  | { type: 'defend'; element: ElementSchool }
  | { type: 'roll' }
  | { type: 'next-battle' };

export class RoomError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

async function request<T>(path: string, options?: RequestInit, seat?: GuestSeat): Promise<T> {
  const response = await fetch('/api/rooms' + path, {
    ...options,
    headers: {
      ...(seat && { Authorization: `Bearer ${seat.token}` }),
      ...(options?.body && { 'Content-Type': 'application/json' }),
    },
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) {
    throw new RoomError(result?.error ?? 'The room server is unavailable.', response.status);
  }
  return result;
}

export const multiplayerTransport = {
  create: () => request<RoomSnapshot & GuestSeat>('', { method: 'POST' }),
  join: (code: string) => request<RoomSnapshot & GuestSeat>(`/${encodeURIComponent(code)}/join`, { method: 'POST' }),
  read: (seat: GuestSeat, signal: AbortSignal) => request<RoomSnapshot>(`/${seat.code}`, { signal }, seat),
  act: (seat: GuestSeat, revision: number, intent: DuelIntent) =>
    request<RoomSnapshot>(`/${seat.code}/intent`, {
      method: 'POST', body: JSON.stringify({ revision, ...intent }),
    }, seat),
};
