// The adventure view shown during a quest's time block: your hero against the
// foes standing in for the task, a progress slider you set yourself, and
// thumbs up / down for how it's going right now.

import { useEffect, useMemo, useState } from 'react';
import { Avatar } from '../avatar/Avatar';
import { useStore } from '../store';
import { formatDuration, useNow, useVitals } from '../hooks';
import { ARCHETYPES } from './archetypes';
import { MonsterSprite } from './Monster';
import { getImage } from './assets';
import type { EncounterEvent, Monster } from './types';
import './adventure.css';

const DECOR: Record<string, string[]> = {
  battle: ['⛰️', '🌲', '🏰'],
  arena: ['🎯', '🏳️', '🪵'],
  forge: ['🔥', '⚒️', '🪨'],
  cleansing: ['🕸️', '🪨', '🕯️'],
  shrine: ['⛩️', '🌙', '🌸'],
  hearth: ['🔥', '🍲', '🧄'],
  library: ['📚', '🕯️', '📜'],
  tavern: ['🍺', '🎻', '🕯️'],
  journey: ['🌲', '🌳', '🏡'],
  bardic: ['🎭', '✨', '🌼'],
  inn: ['🌙', '🕯️', '🛏️'],
};

const FX: Record<string, string> = { slash: '⚔️', pulse: '🌀', sparkle: '✨', note: '🎵', flame: '🔥' };

/** Plays a short CSS reaction each time a new event arrives. */
function useFlash(event: EncounterEvent | undefined, ms = 650) {
  const [active, setActive] = useState<EncounterEvent | undefined>();
  useEffect(() => {
    if (!event || Date.now() - event.at > 2000) return;
    setActive(event);
    const id = setTimeout(() => setActive(undefined), ms);
    return () => clearTimeout(id);
    // Only re-run for a new event.
  }, [event?.at]);
  return active;
}

export function Adventure({ questId }: { questId: string }) {
  const appearance = useStore((s) => s.appearance)!;
  const quest = useStore((s) => s.quests.find((q) => q.id === questId));
  const encounter = useStore((s) => s.encounters[questId]);
  const timer = useStore((s) => s.timer);
  const generated = useStore((s) => s.generatedAnimations);
  const { ensureEncounter, heroStrike, monsterStrike, setQuestProgress, completeQuest, pauseTimer, resumeTimer, stopTimer, skipPhase } = useStore();
  const { mood } = useVitals();
  const now = useNow(250);
  const [confirmDone, setConfirmDone] = useState(false);

  useEffect(() => {
    if (!encounter) ensureEncounter(questId);
  }, [encounter, ensureEncounter, questId]);

  const flash = useFlash(encounter?.lastEvent);
  const vignette = useVignette(quest?.staging?.animations ?? [], generated);

  if (!quest || !encounter) return null;
  const arch = ARCHETYPES[encounter.archetype];
  const custom = quest.staging?.customScene;
  const onBreak = timer && timer.phase !== 'focus';
  const remaining = timer ? (timer.running && timer.endsAt ? timer.endsAt - now : timer.remainingMs) : 0;
  const living = encounter.monsters.filter((m) => m.hp > 0);
  const recentlySlain = encounter.monsters.filter((m) => m.hp <= 0 && flash?.type === 'slain' && flash.monsterId === m.id);
  const shown: Monster[] = [...living, ...recentlySlain];
  const heroPose = onBreak ? 'idle' : arch.heroActivity;
  const cleared = encounter.status === 'cleared';
  const strikeVerb = custom?.strikeVerb || arch.strikeVerb;

  const motionFor = (m: Monster) => {
    if (!flash) return 'idle';
    if (flash.type === 'slain' && flash.monsterId === m.id) return 'defeat';
    if (flash.type === 'victory') return 'defeat';
    if (flash.type === 'spawn' && flash.monsterId === m.id) return 'spawn';
    if (flash.type === 'hit' && flash.targetId === m.id) return 'hurt';
    if ((flash.type === 'hurt' || flash.type === 'knockdown') && m === living[0]) return 'attack';
    return 'idle';
  };

  return (
    <section className={`card adventure arch-${arch.id}`}>
      <header className="adv-head">
        <span className="pill">
          {onBreak ? '🏕️ Resting at camp' : `${custom?.title || arch.name} · ${custom?.setting || arch.place}`}
        </span>
        <h1>{quest.title}</h1>
        {timer && (
          <div className="adv-timer" aria-label="Time left">
            ⏳ {formatDuration(remaining)}
            {!timer.running && ' (paused)'}
          </div>
        )}
      </header>

      <div
        className="stage"
        style={{ background: `linear-gradient(${arch.palette.sky[0]}, ${arch.palette.sky[1]} 70%, ${arch.palette.ground} 70%)` }}
      >
        <div className="decor" aria-hidden>
          {(DECOR[arch.id] ?? []).map((d, i) => (
            <span key={i} className={`decor-${i}`}>{d}</span>
          ))}
        </div>
        {vignette && <img className="vignette" src={vignette} alt="" aria-hidden />}

        <div className={`hero-slot ${flash?.type === 'hit' || flash?.type === 'slain' ? 'striking' : ''} ${flash?.type === 'hurt' || flash?.type === 'knockdown' ? 'hurting' : ''}`}>
          <Avatar appearance={appearance} activity={heroPose} mood={onBreak ? 'happy' : mood} size="100%" />
          {flash?.type === 'hurt' && <span className="dmg hero-dmg">−{flash.amount}</span>}
        </div>

        <div className="foes">
          {cleared && !shown.length ? (
            <div className="cleared-banner">🏳️ The way is clear!</div>
          ) : (
            shown.map((m) => (
              <div key={m.id} className="foe">
                <MonsterSprite monster={m} motion={motionFor(m)} />
                {flash?.type === 'hit' && flash.targetId === m.id && (
                  <>
                    <span className="fx">{FX[arch.strikeFx]}</span>
                    <span className="dmg">−{flash.amount}</span>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bars">
        <HpBar label={`${appearance.name || 'You'}`} hp={encounter.heroHp} max={encounter.heroMaxHp} hero />
        {living.map((m) => (
          <HpBar key={m.id} label={m.name} hp={m.hp} max={m.maxHp} />
        ))}
      </div>

      <p className="adv-log" aria-live="polite">{encounter.log[0]}</p>

      {!cleared && !onBreak && (
        <div className="thumbs">
          <button className="thumb up" onClick={() => heroStrike(questId)} aria-label={`Going well: ${strikeVerb}`}>
            👍<span>{strikeVerb}</span>
          </button>
          <button className="thumb down" onClick={() => monsterStrike(questId)} aria-label="Struggling: the foe strikes">
            👎<span>It's hard</span>
          </button>
        </div>
      )}

      <label className="progress-field" htmlFor={`progress-${questId}`}>
        <span>
          How far through the real task are you? <strong>{quest.progressPct ?? 0}%</strong>
        </span>
        <input
          id={`progress-${questId}`}
          type="range"
          min={0}
          max={100}
          step={10}
          value={quest.progressPct ?? 0}
          onChange={(e) => setQuestProgress(questId, Number(e.target.value))}
        />
        <small className="muted">Hits can only wear foes down as far as your progress. Sliding back calls in reinforcements.</small>
      </label>

      <div className="row gap wrap center">
        {confirmDone ? (
          <>
            <span>Is the real quest finished?</span>
            <button className="btn primary" onClick={() => { completeQuest(questId); stopTimer(); }}>
              🏆 Yes, claim the loot
            </button>
            <button className="btn" onClick={() => setConfirmDone(false)}>Not yet</button>
          </>
        ) : (
          <button className={`btn ${cleared ? 'primary big' : ''}`} onClick={() => setConfirmDone(true)}>
            🏆 Quest complete
          </button>
        )}
        {timer && (
          <>
            {timer.running ? (
              <button className="btn" onClick={pauseTimer}>⏸ Pause</button>
            ) : (
              <button className="btn primary" onClick={resumeTimer}>▶ {timer.remainingMs === timer.totalMs ? 'Start' : 'Resume'}</button>
            )}
            {timer.mode === 'pomodoro' && <button className="btn" onClick={skipPhase}>⏭ Skip</button>}
            <button className="btn ghost" onClick={stopTimer}>⏹ End session</button>
          </>
        )}
      </div>
      {quest.reward && (
        <p className="hint center">
          Loot waiting: {quest.reward.icon} <strong>{quest.reward.name}</strong>
        </p>
      )}
    </section>
  );
}

function HpBar({ label, hp, max, hero = false }: { label: string; hp: number; max: number; hero?: boolean }) {
  const pct = Math.max(0, Math.min(100, (hp / max) * 100));
  return (
    <div className={`hp ${hero ? 'hp-hero' : 'hp-foe'}`}>
      <span className="hp-label">{hero ? '🛡️' : '👾'} {label}</span>
      <div className="bar" role="meter" aria-valuenow={Math.round(hp)} aria-valuemin={0} aria-valuemax={Math.round(max)} aria-label={`${label} health`}>
        <div style={{ width: `${pct}%` }} />
      </div>
      <span className="hp-num">{Math.ceil(hp)}</span>
    </div>
  );
}

/** Frames from the image generator for this quest's custom animations, played as a flipbook. */
function useVignette(labels: string[], generated: { label: string; frameKeys?: string[] }[]) {
  const keys = useMemo(() => generated.filter((g) => labels.includes(g.label)).flatMap((g) => g.frameKeys ?? []), [labels, generated]);
  const [urls, setUrls] = useState<string[]>([]);
  const [i, setI] = useState(0);
  useEffect(() => {
    let made: string[] = [];
    Promise.all(keys.map(getImage)).then((blobs) => {
      made = blobs.filter((b): b is Blob => !!b).map((b) => URL.createObjectURL(b));
      setUrls(made);
    });
    return () => made.forEach((u) => URL.revokeObjectURL(u));
  }, [keys]);
  useEffect(() => {
    if (urls.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % urls.length), 400);
    return () => clearInterval(id);
  }, [urls]);
  return urls[i % Math.max(1, urls.length)];
}
