import { MatchState, PlayerId } from '../engine/types';

export type RoomStatus = 'disconnected' | 'lobby' | 'in_match' | 'finished';

export interface RoomParticipant {
  uid: string;
  displayName: string;
  role: PlayerId | 'spectator';
  connected: boolean;
  joinedAt: number;
}

export interface OnlineRoomInfo {
  roomCode: string;
  hostUid: string;
  status: RoomStatus;
  participants: RoomParticipant[];
  maxParticipants: number; // Supports 2-4 players (2 active duelists + up to 2 arena challengers/spectators)
  createdAt: number;
}

/**
 * Abstract transport interface for online private rooms (2–4 players).
 * Future online dice rolls and combat resolution must be server-authoritative
 * via Cloud Functions or an Express/WebSocket backend so client-supplied digital
 * rolls or damage calculations are never trusted.
 */
export interface MultiplayerTransport {
  readonly isConfigured: boolean;
  readonly providerName: string;

  createPrivateRoom(displayName: string): Promise<OnlineRoomInfo>;
  joinPrivateRoom(roomCode: string, displayName: string): Promise<OnlineRoomInfo>;
  leaveRoom(roomCode: string): Promise<void>;
  subscribeToRoom(
    roomCode: string,
    onRoomUpdate: (room: OnlineRoomInfo) => void,
    onMatchStateUpdate: (state: MatchState) => void
  ): () => void;

  /**
   * Server-authoritative action dispatch: clients send intent only
   * (e.g. selected element or request to roll server D20), never raw damage numbers.
   */
  dispatchIntent(
    roomCode: string,
    intent:
      | { type: 'SELECT_ATTACK'; element: string; useUltimate: boolean }
      | { type: 'SELECT_DEFENCE'; element: string }
      | { type: 'REQUEST_SERVER_D20_ROLL' }
  ): Promise<void>;
}

/**
 * Unconfigured offline placeholder implementation that transparently reports
 * that Firebase / server-authoritative backend is not provisioned yet,
 * avoiding any fake online multiplayer behavior (Section 9).
 */
export class OfflineMultiplayerAdapter implements MultiplayerTransport {
  public readonly isConfigured = false;
  public readonly providerName = 'Firebase Firestore + Cloud Functions (Unconfigured)';

  async createPrivateRoom(): Promise<OnlineRoomInfo> {
    throw new Error(
      'Online multiplayer requires a configured Firebase backend and server-authoritative roll endpoint.'
    );
  }

  async joinPrivateRoom(): Promise<OnlineRoomInfo> {
    throw new Error(
      'Online multiplayer requires a configured Firebase backend and server-authoritative roll endpoint.'
    );
  }

  async leaveRoom(): Promise<void> {
    return;
  }

  subscribeToRoom(): () => void {
    return () => {};
  }

  async dispatchIntent(): Promise<void> {
    throw new Error('Server-authoritative combat transport is not active.');
  }
}

export const multiplayerTransport = new OfflineMultiplayerAdapter();
