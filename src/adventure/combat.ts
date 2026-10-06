// Encounter rules. Pure functions: every action takes an encounter and returns a new one.
//
// The idea: the monsters' combined HP stands for the work left in the real task.
// `pool` is the HP of the whole task, so the HP that *should* be left at progress p
// is pool × (1 − p). Thumbs-up damage closes part of the gap towards that line but
// never crosses it, so you can't out-tap your actual progress. Reaching 100% slays
// everything. Moving the slider back summons reinforcements so HP again matches the
// work left.

import type { AdversaryTemplate, Encounter, EncounterEvent, Monster } from './types';

export const HERO_MAX_HP = 100;
const DEFAULT_POOL = 100;
/** Share of the remaining gap each thumbs-up closes (diminishing returns). */
const HIT_SHARE = 0.3;
/** Smallest hit while there is any gap left, as a share of the pool. */
const MIN_HIT = 0.01;
const HURT_RANGE: [number, number] = [8, 15];
const KNOCKDOWN_RECOVER = 40;

type Rng = () => number;
const newId = () => Math.random().toString(36).slice(2, 9);
const round1 = (n: number) => Math.round(n * 10) / 10;
export const clampProgress = (p: number) => Math.max(0, Math.min(100, Math.round(p / 10) * 10));

const living = (e: Encounter) => e.monsters.filter((m) => m.hp > 0);
export const remainingHp = (e: Encounter) => living(e).reduce((s, m) => s + m.hp, 0);
/** HP that should remain at the current progress. */
export const targetHp = (e: Encounter) => e.pool * (1 - e.progress / 100);

function makeMonster(t: AdversaryTemplate, hp: number): Monster {
  return { id: newId(), name: t.name, kind: t.kind, hue: t.hue, maxHp: round1(hp), hp: round1(hp) };
}

const withLog = (e: Encounter, line: string, event?: EncounterEvent): Encounter => ({
  ...e,
  log: [line, ...e.log].slice(0, 30),
  lastEvent: event ?? e.lastEvent,
});

/** Start (or restart) an encounter. HP of the wave matches the work already left. */
export function createEncounter(
  questId: string,
  archetype: Encounter['archetype'],
  adversaries: AdversaryTemplate[],
  progress = 0,
  pool = DEFAULT_POOL,
): Encounter {
  const p = clampProgress(progress);
  const base: Encounter = {
    questId,
    archetype,
    progress: p,
    pool,
    monsters: [],
    heroHp: HERO_MAX_HP,
    heroMaxHp: HERO_MAX_HP,
    status: p >= 100 ? 'cleared' : 'active',
    log: [],
  };
  if (p >= 100) return base;
  const left = pool * (1 - p / 100);
  // Split the remaining HP into one to three foes, the first one biggest.
  const count = Math.max(1, Math.min(3, adversaries.length, Math.ceil(left / 40)));
  const weights = [0.5, 0.3, 0.2].slice(0, count);
  const total = weights.reduce((a, b) => a + b, 0);
  const monsters = weights.map((w, i) => makeMonster(adversaries[i % adversaries.length], (left * w) / total));
  return { ...base, monsters, log: [`${monsters.map((m) => m.name).join(', ')} block${monsters.length === 1 ? 's' : ''} the way!`] };
}

/** Thumbs up: the hero strikes, rubber-banded to real progress. */
export function thumbsUp(e: Encounter, now = Date.now()): Encounter {
  if (e.status !== 'active') return e;
  const gap = remainingHp(e) - targetHp(e);
  if (gap <= 0.05) {
    return withLog(e, 'Your blow glances off. Move the progress slider when you get further along to hit harder.', { type: 'glance', at: now });
  }
  let damage = Math.min(gap, Math.max(gap * HIT_SHARE, e.pool * MIN_HIT));
  damage = round1(damage);
  const monsters = e.monsters.map((m) => ({ ...m }));
  let left = damage;
  let firstHit = '';
  const slain: Monster[] = [];
  for (const m of monsters) {
    if (left <= 0) break;
    if (m.hp <= 0) continue;
    const dealt = Math.min(m.hp, left);
    m.hp = round1(m.hp - dealt);
    left = round1(left - dealt);
    firstHit ||= m.id;
    if (m.hp <= 0) {
      m.hp = 0;
      slain.push(m);
    }
  }
  const heroHp = Math.min(e.heroMaxHp, e.heroHp + 2);
  let next: Encounter = { ...e, monsters, heroHp };
  next = withLog(next, `You hit for ${damage}!`, { type: 'hit', amount: damage, targetId: firstHit, at: now });
  for (const m of slain) next = withLog(next, `${m.name} is defeated!`, { type: 'slain', monsterId: m.id, at: now });
  return next;
}

/** Thumbs down: the monster lands a blow. A knocked-down hero simply gets back up. */
export function thumbsDown(e: Encounter, rng: Rng = Math.random, now = Date.now()): Encounter {
  if (e.status !== 'active' || living(e).length === 0) return e;
  const attacker = living(e)[Math.floor(rng() * living(e).length)];
  const amount = Math.round(HURT_RANGE[0] + rng() * (HURT_RANGE[1] - HURT_RANGE[0]));
  const hp = e.heroHp - amount;
  if (hp <= 0) {
    return withLog(
      { ...e, heroHp: KNOCKDOWN_RECOVER },
      `${attacker.name} knocks you down. You take a breath and stand back up. That's allowed.`,
      { type: 'knockdown', at: now },
    );
  }
  return withLog({ ...e, heroHp: hp }, `${attacker.name} hits you for ${amount}.`, { type: 'hurt', amount, at: now });
}

/**
 * Self-reported progress changed.
 * - Up: nothing is damaged directly, but thumbs-up can now hit harder. At 100 every monster falls.
 * - Down: reinforcements arrive. If the foes have x HP left at progress y, the work left grows
 *   from (1−y) to (1−y'), so x scales by (1−y')/(1−y): a new monster with x·(y−y')/(1−y) HP joins.
 */
export function setProgress(e: Encounter, progress: number, reinforcement: AdversaryTemplate, now = Date.now()): Encounter {
  const p = clampProgress(progress);
  if (p === e.progress) return e;
  const y = e.progress / 100;
  const y2 = p / 100;

  if (p >= 100) {
    const monsters = e.monsters.map((m) => ({ ...m, hp: 0 }));
    return withLog({ ...e, progress: p, monsters, status: 'cleared' }, 'The last foe falls. The way is clear!', { type: 'victory', at: now });
  }

  if (p > e.progress) {
    return withLog({ ...e, progress: p }, `Progress ${p}%. Your strikes grow stronger.`);
  }

  // Progress went down: summon reinforcements so HP matches the work left again.
  const x = remainingHp(e);
  const hp = y >= 1 || x <= 0 ? e.pool * (1 - y2) : (x * (y - y2)) / (1 - y);
  const monster = makeMonster(reinforcement, Math.max(1, hp));
  const monsters = [...e.monsters.filter((m) => m.hp > 0), monster];
  return withLog(
    { ...e, progress: p, monsters, status: 'active' },
    `${monster.name} joins the fight! (Progress set back to ${p}%.)`,
    { type: 'spawn', monsterId: monster.id, at: now },
  );
}
