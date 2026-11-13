import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import express from 'express';
import { ELEMENT_ORDER } from '../src/engine/elements';
import {
  isArenaId, openArenaShift, completeExchangeAnimation, createInitialMatchState, selectAttackMagic, selectDefenceMagic,
  startNextBattle, submitArcaneClashRolls, submitAttackRoll, submitDefenceRoll, submitLastStandRoll,
} from '../src/engine/matchController';
import type { ElementSchool, MatchState, PlayerId } from '../src/engine/types';
import type { RoomPlayback, RoomSnapshot } from '../src/multiplayer/transport';

const ROOM_LIFETIME_MS = 60 * 60 * 1000;
const MAX_ROOMS = 500;

interface Room {
  seats: Partial<Record<PlayerId, string>>;
  expiresAt: number;
  revision: number;
  match: MatchState;
  clashRoll: number | null;
  playback?: RoomPlayback;
  exitedBy?: PlayerId;
  lastRoll?: RoomSnapshot['lastRoll'];
}

const standalone = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
const dataDirectory = process.env.RIFTROLL_ROOM_DATA_DIR
  ? resolve(process.env.RIFTROLL_ROOM_DATA_DIR)
  : standalone ? fileURLToPath(new URL('../.riftroll-rooms/', import.meta.url)) : null;
const rooms = new Map<string, Room>();

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function saveRoom(code: string, room: Room): void {
  if (dataDirectory) {
    const file = join(dataDirectory, code + '.json');
    const temporary = file + '.tmp';
    writeFileSync(temporary, JSON.stringify(room), { mode: 0o600, flush: true });
    renameSync(temporary, file);
  }
  rooms.set(code, room);
}

function removeExpiredRooms(): void {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (room.expiresAt <= now) {
      if (dataDirectory) rmSync(join(dataDirectory, code + '.json'), { force: true });
      rooms.delete(code);
    }
  }
}

if (dataDirectory) {
  mkdirSync(dataDirectory, { recursive: true, mode: 0o700 });
  for (const file of readdirSync(dataDirectory)) {
    if (!/^[A-F0-9]{10}\.json$/.test(file)) continue;
    const room = JSON.parse(readFileSync(join(dataDirectory, file), 'utf8')) as Room;
    rooms.set(file.slice(0, -5), room);
  }
  removeExpiredRooms();
}

const api = express();
api.use(express.json({ limit: '2kb' }));
api.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  removeExpiredRooms();
  next();
});

function snapshot(code: string, room: Room, seat: PlayerId) {
  return {
    code, seat,
    expiresAt: room.expiresAt,
    revision: room.revision,
    ready: Boolean(room.seats.p2),
    clashActor: room.match.phase === "ARCANE_CLASH_ROLL" ? (room.clashRoll === null ? "p1" : "p2") : null,
    match: room.match,
    playback: room.playback,
    lastRoll: room.lastRoll,
    exitedBy: room.exitedBy,
  };
}

function guestName(name: unknown): string | undefined {
  return typeof name === 'string' ? name.trim().slice(0, 24) || undefined : undefined;
}

api.post('/rooms', (req, res) => {
  if (rooms.size >= MAX_ROOMS) {
    res.status(503).json({ error: 'All rooms are busy. Try again later.' });
    return;
  }
  let code: string;
  do {
    code = randomBytes(5).toString('hex').toUpperCase();
  } while (rooms.has(code));
  const token = randomBytes(32).toString('hex');
  const room: Room = {
    seats: { p1: hashToken(token) }, revision: 0, expiresAt: Date.now() + ROOM_LIFETIME_MS, clashRoll: null,
    match: createInitialMatchState({
      mode: 'online', format: 3, maxHp: 75, diceMode: 'digital',
      aiDifficulty: 'sorcerer', localLayout: 'side-by-side', reducedMotion: false,
      soundEnabled: true, playerNames: { p1: guestName(req.body?.name) },
    }),
  };
  saveRoom(code, room);
  res.status(201).json({ ...snapshot(code, room, 'p1'), token });
});

api.post('/rooms/:code/join', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    res.status(404).json({ error: 'Room expired or code is incorrect.' });
    return;
  }
  if (room.exitedBy) {
    res.status(409).json({ error: 'This room has ended.' });
    return;
  }
  if (room.seats.p2) {
    res.status(409).json({ error: 'This room is full.' });
    return;
  }
  const token = randomBytes(32).toString('hex');
  const joined = { ...room, seats: { ...room.seats, p2: hashToken(token) }, revision: room.revision + 1 };
  const name = guestName(req.body?.name);
  if (name) {
    joined.match = {
      ...room.match,
      players: { ...room.match.players, p2: { ...room.match.players.p2, name } },
    };
  }
  saveRoom(code, joined);
  res.status(201).json({ ...snapshot(code, joined, 'p2'), token });
});

api.use('/rooms/:code', (req, res, next) => {
  const code = req.params.code.toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    res.status(404).json({ error: 'Room expired or code is incorrect.' });
    return;
  }
  const authorization = req.get('Authorization');
  const tokenHash = authorization?.startsWith('Bearer ') ? hashToken(authorization.slice(7)) : null;
  const seat = (['p1', 'p2'] as const).find((id) =>
    tokenHash !== null && tokenHash === room.seats[id]
  );
  if (!seat) {
    res.status(403).json({ error: 'This seat is private.' });
    return;
  }
  res.locals.room = room;
  res.locals.seat = seat;
  next();
});

api.get('/rooms/:code', (req, res) => {
  res.json(snapshot(req.params.code.toUpperCase(), res.locals.room, res.locals.seat));
});

function applyIntent(room: Room, seat: PlayerId, body: Record<string, unknown>): boolean {
  const state = room.match;
  const attacker = state.activeAttackerId;
  const defender = attacker === 'p1' ? 'p2' : 'p1';
  const rollD20 = () => {
    const value = randomInt(1, 21);
    room.lastRoll = { revision: room.revision + 1, playerId: seat, value };
    return value;
  };
  let next = state;
  if (body.type === 'open-glacier-rift' && seat === attacker) {
    next = openArenaShift(state, 'glacier');
  } else if (body.type === 'open-arena' && seat === attacker && isArenaId(body.arena)) {
    next = openArenaShift(state, body.arena);
  } else if (body.type === 'attack' && seat === attacker && ELEMENT_ORDER.includes(body.element as ElementSchool)) {
    next = selectAttackMagic(state, body.element as ElementSchool, body.ultimate === true);
  } else if (body.type === 'defend' && seat === defender && ELEMENT_ORDER.includes(body.element as ElementSchool)) {
    next = selectDefenceMagic(state, body.element as ElementSchool);
  } else if (body.type === 'roll') {
    if (state.phase === 'ROLL_ATTACK_D20' && seat === attacker) {
      next = submitAttackRoll(state, rollD20());
    } else if (state.phase === 'ROLL_DEFENCE_D20' && seat === defender) {
      next = submitDefenceRoll(state, rollD20());
      if (next.phase === 'ANIMATING_EXCHANGE' && next.pendingResolution) {
        room.playback = { kind: 'exchange', revision: room.revision + 1, resolution: next.pendingResolution };
        next = completeExchangeAnimation(next);
      }
    } else if (state.phase === 'LAST_STAND_PROMPT' && seat === state.pendingLastStandPlayerId) {
      const roll = rollD20();
      next = submitLastStandRoll(state, roll);
      if (next !== state) {
        room.playback = { kind: 'last-stand', revision: room.revision + 1, playerId: seat, roll };
      }
    } else if (state.phase === 'ARCANE_CLASH_ROLL') {
      if (seat === 'p1' && room.clashRoll === null) {
        room.clashRoll = rollD20();
        return true;
      }
      if (seat === 'p2' && room.clashRoll !== null && state.pendingResolution) {
        const rolls = { p1: room.clashRoll, p2: rollD20() };
        next = submitArcaneClashRolls(state, rolls.p1, rolls.p2);
        room.playback = { kind: 'clash', revision: room.revision + 1, rolls, resolution: state.pendingResolution };
        room.clashRoll = null;
      }
    }
  } else if (body.type === 'next-battle' && seat === 'p1') {
    next = startNextBattle(state);
  }

  room.match = next;
  return next !== state;
}

api.post('/rooms/:code/exit', (req, res) => {
  const room: Room = res.locals.room;
  const seat: PlayerId = res.locals.seat;
  const code = req.params.code.toUpperCase();
  if (!room.exitedBy && room.match.phase !== 'MATCH_OVER') {
    saveRoom(code, { ...room, exitedBy: seat, revision: room.revision + 1 });
  }
  res.json({ ok: true });
});

api.post('/rooms/:code/intent', (req, res) => {
  const room: Room = res.locals.room;
  const seat: PlayerId = res.locals.seat;
  const updated = { ...room };
  if (room.exitedBy || !room.seats.p2 || req.body?.revision !== room.revision || !applyIntent(updated, seat, req.body)) {
    res.status(409).json({ error: 'This action is unavailable.', ...snapshot(req.params.code.toUpperCase(), room, seat) });
    return;
  }
  updated.revision++;
  const code = req.params.code.toUpperCase();
  saveRoom(code, updated);
  res.json(snapshot(code, updated, seat));
});

export { api };

if (standalone) {
  const app = express();
  app.use('/api', api);
  app.use(express.static(fileURLToPath(new URL('../dist/', import.meta.url))));
  app.listen(Number(process.env.PORT ?? 3002), process.env.RIFTROLL_HOST ?? '127.0.0.1');
}
