import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
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
  const [code, setCode] = useState(inviteCode);
  const [seat, setSeat] = useState(savedSeat);
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState('');
  const [busy, setBusy] = useState(false);
  const [ultimate, setUltimate] = useState(false);
  const [copied, setCopied] = useState(false);
  const [playback, setPlayback] = useState<RoomSnapshot['playback']>();
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = reduceArenaMotion || prefersReducedMotion === true;
  const seenRoom = useRef<{ code: string; revision: number } | null>(null);

  useEffect(() => {
    if (!playback) return;
    const duration = playback.kind === 'exchange'
      ? reducedMotion ? 450 : playback.resolution.isUltimate || playback.resolution.attackTier === 'critical_strike' ? 2100 : 1500
      : reducedMotion ? 650 : 950;
    const timer = window.setTimeout(() => setPlayback(undefined), duration);
    return () => window.clearTimeout(timer);
  }, [playback, reducedMotion]);

  function update(next: RoomSnapshot) {
    const seen = seenRoom.current;
    if (seen?.code === next.code && next.revision <= seen.revision) return;
    if (seen?.code === next.code && next.playback && next.playback.revision > seen.revision) {
      setPlayback(next.playback);
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
    return run(async () => {
      const result = join ? await multiplayerTransport.join(code.trim().toUpperCase()) : await multiplayerTransport.create();
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
    if (!seat || (room?.ready && room.match.phase !== 'MATCH_OVER' &&
      !window.confirm('Leave this duel? Your seat will be cleared from this tab.'))) return;
    sessionStorage.removeItem(seatKey(seat.code));
    sessionStorage.removeItem(roomKey);
    const url = new URL(location.href);
    url.searchParams.delete('room');
    history.replaceState(null, '', url);
    seenRoom.current = null;
    setPlayback(undefined);
    setCode('');
    setSeat(null);
    setRoom(null);
    setError('');
    setConnection('');
    setCopied(false);
    setUltimate(false);
  }

  function act(intent: DuelIntent) {
    if (!seat || !room || busy || connection || playback) return;
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
  const acting = !playback && room && actor === room.seat;
  const player = room && state?.players[room.seat];
  const disabled = busy || !!connection || !!playback;
  const exchange = playback?.kind === 'exchange' ? playback.resolution : null;
  const clash = playback?.kind === 'clash' ? playback : null;
  const lastStand = playback?.kind === 'last-stand' ? playback : null;
  const resolution = exchange ?? clash?.resolution;

  return (
    <section className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Private duel</h1>
        <div className="flex flex-wrap gap-2">
          {seat && <button disabled={busy} className="rounded-lg bg-slate-800 px-3 py-2" onClick={leave}>
            {phase === 'MATCH_OVER' ? 'New duel' : 'Leave room'}
          </button>}
          <button className="rounded-lg bg-slate-800 px-3 py-2" onClick={onClose}>Arena Menu</button>
        </div>
      </div>
      {error && <p role="alert" className="text-rose-200">{error}</p>}
      {connection && <p role="status">{connection}</p>}
      {!seat && (
        <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); void enter(true); }}>
          <button type="button" className={button} disabled={busy} onClick={() => void enter(false)}>Host a duel</button>
          <label className="text-sm">Room code
            <input className="mt-1 block rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 uppercase"
              value={code} maxLength={10} onChange={(event) => setCode(event.currentTarget.value)} />
          </label>
          <button className={button} disabled={busy || !/^[A-Fa-f0-9]{10}$/.test(code.trim())}>Join a duel</button>
        </form>
      )}
      {seat && !room && !connection && <p role="status">Opening room…</p>}
      {room && !room.ready && (
        <div className="space-y-3">
          <p role="status">Waiting for a friend</p>
          <p>Room code <strong className="font-mono">{room.code}</strong></p>
          <button className={button} onClick={() => {
            const link = new URL(location.href);
            link.searchParams.set('room', room.code);
            void run(async () => { await navigator.clipboard.writeText(link.href); setCopied(true); });
          }}>{copied ? 'Link copied' : 'Copy invite link'}</button>
        </div>
      )}
      {room?.ready && state && player && (
        <>
          <p className="text-sm">Battle {state.battleNumber} · {state.players.p1.battlesWon}–{state.players.p2.battlesWon} · You’re {player.name}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(['p1', 'p2'] as const).map((id) => <PlayerHudCard key={id} player={state.players[id]} role={id === attacker ? 'attacker' : 'defender'} selectedElement={id === attacker ? state.selectedAttackElement : state.selectedDefenceElement} requiredWins={2} compact />)}
          </div>
          <ArenaStage p1={state.players.p1} p2={state.players.p2} activeAttackerId={resolution?.attackerId ?? state.activeAttackerId}
            activeActorId={playback ? null : actor ?? null} selectedAttackElement={resolution?.attackElement ?? state.selectedAttackElement} selectedDefenceElement={resolution?.defenceElement ?? state.selectedDefenceElement}
            selectedUseUltimate={resolution?.isUltimate ?? state.selectedUseUltimate} isAnimatingExchange={!!exchange} pendingResolution={exchange}
            clashRolls={clash?.rolls ?? (phase === 'ARCANE_CLASH_ROLL' ? {} : null)}
            lastStandId={lastStand?.playerId ?? (playback ? null : state.pendingLastStandPlayerId)}
            lastStandRoll={lastStand?.roll ?? null}
            reducedMotion={reducedMotion} onSkipAnimation={() => setPlayback(undefined)} />
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
          {!playback && phase === 'BATTLE_OVER' && (
            room.seat === 'p1' ? <button className={button} disabled={disabled} onClick={() => act({ type: 'next-battle' })}>Next battle</button>
              : <p>Waiting for the host to start the next battle.</p>
          )}
          {!playback && phase === 'MATCH_OVER' && state.matchWinnerId && <p className="text-xl font-bold">{state.players[state.matchWinnerId].name} wins!</p>}
          {!playback && !acting && actor && <p role="status">Waiting for {state.players[actor].name}…</p>}
          {state.attackRollResult !== null && <p>Attack roll {state.attackRollResult}</p>}
          {!playback && state.combatLog[0] && <p role="status">{state.combatLog[0].summary}</p>}
        </>
      )}
    </section>
  );
}
