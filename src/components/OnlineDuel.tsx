import type { PlayerId } from '../engine/types';
import { D20Face } from './D20Face';
import { soundFX } from '../utils/sound';
import { ExitMatchDialog } from './ExitMatchDialog';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { arenaAttackBonus, arenaShiftRemaining, getArenaShift, SHIFT_ARENAS, SHIFT_ARENA_IDS } from '../engine/matchController';
import { ArenaStage } from './ArenaStage';
import { PlayerHudCard } from './PlayerHudCard';
import { SpellSelector } from './SpellSelector';
import { multiplayerTransport, RoomError } from '../multiplayer/transport';
import type { DuelIntent, GuestSeat, RoomSnapshot } from '../multiplayer/transport';

const inviteCode = () => new URLSearchParams(location.search).get('room') ?? '';
const seatKey = (code: string) => `riftroll-seat-${code}`;
const roomKey = 'riftroll-current-room';

function savedSeat(): GuestSeat | null {
  const code = inviteCode().toUpperCase() || sessionStorage.getItem(roomKey);
  if (!code || !/^[A-F0-9]{10}$/.test(code)) return null;
  const token = sessionStorage.getItem(seatKey(code));
  return token ? { code, token } : null;
}

export function OnlineDuel({ onClose, reducedMotion: reduceArenaMotion }: {
  onClose: () => void;
  reducedMotion: boolean;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState(inviteCode);
  const [seat, setSeat] = useState(savedSeat);
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState('');
  const [busy, setBusy] = useState(false);
  const [ultimate, setUltimate] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [copied, setCopied] = useState(false);
  const [roll, setRoll] = useState<RoomSnapshot['lastRoll']>();
  const [rollingFace, setRollingFace] = useState<number | null>(null);
  const [playback, setPlayback] = useState<RoomSnapshot['playback']>();
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = reduceArenaMotion || prefersReducedMotion === true;
  const seenRoom = useRef<{ code: string; revision: number } | null>(null);

  useEffect(() => {
    if (!roll) return;
    soundFX.playDiceRoll();
    const animation = reducedMotion ? undefined : window.setInterval(() => {
      setRollingFace((value) => ((value ?? 1) + 6) % 20 + 1);
    }, 55);
    const reveal = window.setTimeout(() => {
      window.clearInterval(animation);
      setRollingFace(null);
    }, 480);
    const finish = window.setTimeout(() => setRoll(undefined), reducedMotion ? 650 : 1050);
    return () => {
      window.clearInterval(animation);
      window.clearTimeout(reveal);
      window.clearTimeout(finish);
    };
  }, [roll, reducedMotion]);

  useEffect(() => {
    if (!playback || roll) return;
    if (playback.kind === 'clash' || (playback.kind === 'last-stand' && playback.roll === 20)) {
      soundFX.playParryOrClash();
    } else if (playback.kind === 'last-stand') {
      soundFX.playSpellImpact(true);
    }
    const duration = playback.kind === 'exchange'
      ? reducedMotion ? 450 : playback.resolution.isUltimate || playback.resolution.attackTier === 'critical_strike' ? 2100 : 1500
      : reducedMotion ? 650 : 950;
    const timer = window.setTimeout(() => setPlayback(undefined), duration);
    return () => window.clearTimeout(timer);
  }, [playback, reducedMotion, roll]);

  function update(next: RoomSnapshot) {
    const seen = seenRoom.current;
    if (seen?.code === next.code && next.revision <= seen.revision) return;
    if (next.exitedBy) {
      setPlayback(undefined);
      setRoll(undefined);
      setRollingFace(null);
    } else if (seen?.code === next.code && next.playback && next.playback.revision > seen.revision) {
      setPlayback(next.playback);
    }
    if (!next.exitedBy && seen?.code === next.code && next.lastRoll && next.lastRoll.revision > seen.revision) {
      setRollingFace(reducedMotion ? null : 7);
      setRoll(next.lastRoll);
    }
    seenRoom.current = { code: next.code, revision: next.revision };
    setRoom(next);
  }

  useEffect(() => {
    if (!seat) return;
    const controller = new AbortController();
    let timer: number;
    async function poll() {
      try {
        const next = await multiplayerTransport.read(seat!, controller.signal);
        if (controller.signal.aborted) return;
        update(next);
        setConnection('');
      } catch (failure) {
        if (controller.signal.aborted) return;
        if (failure instanceof RoomError && [403, 404].includes(failure.status)) {
          sessionStorage.removeItem(seatKey(seat!.code));
          sessionStorage.removeItem(roomKey);
          setError(failure.message);
          setRoom(null);
          setSeat(null);
          return;
        }
        setConnection('Reconnecting…');
      }
      timer = window.setTimeout(poll, 600);
    }
    void poll();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [seat]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  function enter(join: boolean) {
    soundFX.unlock();
    return run(async () => {
      const result = join ? await multiplayerTransport.join(code.trim().toUpperCase(), name) : await multiplayerTransport.create(name);
      const { token, ...snapshot } = result;
      sessionStorage.setItem(seatKey(snapshot.code), token);
      sessionStorage.setItem(roomKey, snapshot.code);
      const url = new URL(location.href);
      url.searchParams.set('room', snapshot.code);
      history.replaceState(null, '', url);
      setSeat({ code: snapshot.code, token });
      update(snapshot);
    });
  }

  function leave() {
    if (!seat) return;
    sessionStorage.removeItem(seatKey(seat.code));
    sessionStorage.removeItem(roomKey);
    const url = new URL(location.href);
    url.searchParams.delete('room');
    history.replaceState(null, '', url);
    seenRoom.current = null;
    setPlayback(undefined);
    setRoll(undefined);
    setCode('');
    setSeat(null);
    setRoom(null);
    setError('');
    setConnection('');
    setCopied(false);
    setUltimate(false);
    setConfirmExit(false);
  }

  function act(intent: DuelIntent) {
    if (!seat || !room || busy || connection || playback || roll || room.exitedBy) return;
    soundFX.unlock();
    void run(async () => {
      update(await multiplayerTransport.act(seat, room.revision, intent));
      setUltimate(false);
    });
  }

  const button = 'rounded-lg bg-amber-400 px-4 py-2 font-bold text-slate-950 disabled:opacity-50';
  const state = room?.match;
  const attacker = state?.activeAttackerId;
  const defender = attacker === 'p1' ? 'p2' : 'p1';
  const phase = state?.phase;
  const actor = phase === 'SELECT_ATTACK_MAGIC' || phase === 'ROLL_ATTACK_D20' ? attacker
    : phase === 'SELECT_DEFENCE_MAGIC' || phase === 'ROLL_DEFENCE_D20' ? defender
    : phase === 'ARCANE_CLASH_ROLL' ? room?.clashActor
    : phase === 'LAST_STAND_PROMPT' ? state?.pendingLastStandPlayerId : null;
  const acting = !roll && !playback && room && actor === room.seat;
  const player = room && state?.players[room.seat];
  const disabled = busy || !!connection || !!playback;
  const exchange = !roll && playback?.kind === 'exchange' ? playback.resolution : null;
  const clash = !roll && playback?.kind === 'clash' ? playback : null;
  const lastStand = !roll && playback?.kind === 'last-stand' ? playback : null;
  const resolution = exchange ?? clash?.resolution;
  // ArenaStage draws p1 on the left. Translate only its presentation props.
  const localSeat = room?.seat ?? 'p1';
  const opponentSeat: PlayerId = localSeat === 'p1' ? 'p2' : 'p1';
  const arenaSide = (id: PlayerId): PlayerId => id === localSeat ? 'p1' : 'p2';
  const arenaActor = actor && !playback ? arenaSide(actor) : null;
  const lastStandPlayer = lastStand?.playerId ?? (playback ? null : state?.pendingLastStandPlayerId);
  const arenaExchange = useMemo(() => {
    if (!exchange || localSeat === 'p1') return exchange;
    return { ...exchange, attackerId: exchange.defenderId, defenderId: exchange.attackerId };
  }, [exchange, localSeat]);
  const arenaClashRolls = clash ? { p1: clash.rolls[localSeat], p2: clash.rolls[opponentSeat] }
    : phase === 'ARCANE_CLASH_ROLL' ? {} : null;


  return (
    <section className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Private duel</h1>
        <div className="flex flex-wrap gap-2">
          {seat && <button disabled={busy} className="rounded-lg bg-slate-800 px-3 py-2" onClick={() => {
            if (phase === 'MATCH_OVER' || room?.exitedBy) leave();
            else setConfirmExit(true);
          }}>
            {phase === 'MATCH_OVER' || room?.exitedBy ? 'New duel' : 'Exit Match'}
          </button>}
          <button className="rounded-lg bg-slate-800 px-3 py-2" onClick={onClose}>Arena Menu</button>
        </div>
      </div>
      {error && <p role="alert" className="text-rose-200">{error}</p>}
      {connection && <p role="status">{connection}</p>}
      {!seat && (
        <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); void enter(true); }}>
          <label className="text-sm">Mage name
            <input className="mt-1 block rounded-lg border border-slate-600 bg-slate-900 px-3 py-2"
              value={name} maxLength={24} onChange={(event) => setName(event.currentTarget.value)} />
          </label>
          <button type="button" className={button} disabled={busy || !name.trim()} onClick={() => void enter(false)}>Host a duel</button>
          <label className="text-sm">Room code
            <input className="mt-1 block rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 uppercase"
              value={code} maxLength={10} onChange={(event) => setCode(event.currentTarget.value)} />
          </label>
          <button className={button} disabled={busy || !name.trim() || !/^[A-Fa-f0-9]{10}$/.test(code.trim())}>Join a duel</button>
        </form>
      )}
      {seat && !room && !connection && <p role="status">Opening room…</p>}
      {room?.exitedBy && (
        <p role="status" className="rounded-lg border border-amber-500/60 bg-slate-900 p-4 font-bold">
          {room.exitedBy === room.seat ? 'You left the match.' : `${room.match.players[room.exitedBy].name} left the match.`}
        </p>
      )}
      {room && !room.exitedBy && !room.ready && (
        <div className="space-y-3">
          <p role="status">Waiting for a friend</p>
          <p>Room code <strong className="font-mono">{room.code}</strong></p>
          <label className="block max-w-lg text-sm">
            Invite link
            <input readOnly value={location.href} onFocus={(event) => event.currentTarget.select()}
              className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2" />
          </label>
          {navigator.clipboard?.writeText && (
            <button type="button" className={button} onClick={() => {
              void run(async () => { await navigator.clipboard.writeText(location.href); setCopied(true); });
            }}>{copied ? 'Link copied' : 'Copy invite link'}</button>
          )}
        </div>
      )}
      {room?.ready && !room.exitedBy && state && player && (
        <>
          <p className="text-sm">Battle {state.battleNumber} · {state.players[localSeat].battlesWon}–{state.players[opponentSeat].battlesWon} · You’re {player.name}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[localSeat, opponentSeat].map((id) => <PlayerHudCard key={id} player={state.players[id]} role={id === attacker ? 'attacker' : 'defender'} selectedElement={id === attacker ? state.selectedAttackElement : state.selectedDefenceElement} requiredWins={2} compact />)}
          </div>
          <ArenaStage p1={{ ...state.players[localSeat], id: 'p1' }}
            p2={{ ...state.players[opponentSeat], id: 'p2' }}
            activeAttackerId={arenaSide(resolution?.attackerId ?? state.activeAttackerId)}
            activeActorId={arenaActor} selectedAttackElement={resolution?.attackElement ?? state.selectedAttackElement} selectedDefenceElement={resolution?.defenceElement ?? state.selectedDefenceElement}
            selectedUseUltimate={resolution?.isUltimate ?? state.selectedUseUltimate} isAnimatingExchange={!!exchange} pendingResolution={arenaExchange}
            clashRolls={arenaClashRolls}
            lastStandId={lastStandPlayer ? arenaSide(lastStandPlayer) : null}
            lastStandRoll={lastStand?.roll ?? null}
            shiftArena={getArenaShift(state)?.id}
            shiftTurns={arenaShiftRemaining(state)}
            reducedMotion={reducedMotion} onSkipAnimation={() => setPlayback(undefined)} />
          {roll && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-3">
              <D20Face value={rollingFace ?? roll.value} isRolling={rollingFace !== null}
                accentHex={state.players[roll.playerId].avatarColor} />
              <p role="status" className="font-bold">
                {state.players[roll.playerId].name} {rollingFace !== null ? 'is rolling…' : `rolled ${roll.value}`}
              </p>
            </div>
          )}
          {acting && phase === 'SELECT_ATTACK_MAGIC' && !getArenaShift(state) && (
            <div className="flex flex-wrap gap-2">
              {SHIFT_ARENA_IDS.map((id) => (
                <button key={id} type="button" className={button} disabled={disabled} onClick={() => act({ type: 'open-arena', arena: id })}>
                  Open {SHIFT_ARENAS[id].name}
                </button>
              ))}
            </div>
          )}
          {acting && (phase === 'SELECT_ATTACK_MAGIC' || phase === 'SELECT_DEFENCE_MAGIC') && (
            <SpellSelector mode={phase === 'SELECT_ATTACK_MAGIC' ? 'attack' : 'defence'} playerName={player.name}
              arcaneMeter={player.arcaneMeter} useUltimate={ultimate} onToggleUltimate={setUltimate}
              opposingAttackElement={state.selectedAttackElement} lockedElement={phase === 'SELECT_DEFENCE_MAGIC' ? player.defenceLock : undefined}
              disabled={disabled} onSelectElement={(element) => act(phase === 'SELECT_ATTACK_MAGIC' ? { type: 'attack', element, ultimate } : { type: 'defend', element })} />
          )}
          {acting && phase !== 'SELECT_ATTACK_MAGIC' && phase !== 'SELECT_DEFENCE_MAGIC' && (
            <button className={button} disabled={disabled} onClick={() => act({ type: 'roll' })}>
              {phase === 'LAST_STAND_PROMPT' ? 'Roll 20 to survive' : phase === 'ARCANE_CLASH_ROLL' ? 'Roll again' : 'Roll'}
            </button>
          )}
          {!roll && !playback && phase === 'BATTLE_OVER' && (
            room.seat === 'p1' ? <button className={button} disabled={disabled} onClick={() => act({ type: 'next-battle' })}>Next battle</button>
              : <p>Waiting for the host to start the next battle.</p>
          )}
          {!roll && !playback && phase === 'MATCH_OVER' && state.matchWinnerId && <p className="text-xl font-bold">{state.players[state.matchWinnerId].name} wins!</p>}
          {!roll && !playback && !acting && actor && <p role="status">Waiting for {state.players[actor].name}…</p>}
          {state.attackRollResult !== null && (
            <p>Attack roll {state.attackRollResult}{arenaAttackBonus(state) > 0 && ' · Arena +2'}</p>
          )}
          {!roll && !playback && state.combatLog[0] && <p role="status">{state.combatLog[0].summary}</p>}
        </>
      )}
      {confirmExit && <ExitMatchDialog onCancel={() => setConfirmExit(false)} onExit={() => {
        if (!seat) return;
        setConfirmExit(false);
        void run(async () => {
          try {
            await multiplayerTransport.exit(seat);
          } catch (failure) {
            if (!(failure instanceof RoomError) || ![403, 404].includes(failure.status)) throw failure;
          }
          leave();
          onClose();
        });
      }} />}
    </section>
  );
}
