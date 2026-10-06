// Need decay, care actions, derived health/mood and gentle alerts.

import type { Activity, Health, Mood, StatKey, Stats } from '../types';

export const STAT_INFO: Record<StatKey, { label: string; emoji: string; low: string }> = {
  fullness: { label: 'Fed', emoji: '🍽️', low: 'Hungry' },
  hydration: { label: 'Hydrated', emoji: '💧', low: 'Thirsty' },
  energy: { label: 'Rested', emoji: '🔋', low: 'Exhausted' },
  social: { label: 'Connected', emoji: '🫂', low: 'Isolated' },
  movement: { label: 'Moved', emoji: '🏃', low: 'Stiff' },
  joy: { label: 'Joy', emoji: '✨', low: 'Glum' },
};
export const STAT_KEYS = Object.keys(STAT_INFO) as StatKey[];

/** Points lost per hour while awake. Tuned so that a normal day of meals,
 * water, sleep and a little contact keeps everything comfortably green. */
export const DECAY_PER_HOUR: Stats = {
  fullness: 7, // a meal (+45) lasts ~6h
  hydration: 9,
  energy: 5, // ~16h awake from full
  social: 2.5, // a real conversation lasts about a day
  movement: 3,
  joy: 2.5,
};

/** While asleep: energy recovers, most needs decay much slower. */
const SLEEP_RATE: Stats = {
  fullness: -2,
  hydration: -2.5,
  energy: +13,
  social: 0,
  movement: -0.5,
  joy: 0,
};

/** Small effect per focused minute of an activity in the timer. */
export const ACTIVITY_EFFECT_PER_MIN: Partial<Record<Activity, Partial<Stats>>> = {
  exercise: { movement: 1.2, energy: -0.15, hydration: -0.2, joy: 0.15 },
  walk: { movement: 0.8, joy: 0.15 },
  meditate: { joy: 0.4, energy: 0.1 },
  social: { social: 1.0, joy: 0.2 },
  create: { joy: 0.35 },
  read: { joy: 0.2 },
  cook: { joy: 0.15 },
  clean: { movement: 0.3, joy: 0.1 },
  build: { movement: 0.25, joy: 0.15 },
  eat: { fullness: 1.5, hydration: 0.5 },
  sleep: { energy: 0.6 },
  desk: { energy: -0.08 },
};

export interface CareAction {
  id: string;
  label: string;
  emoji: string;
  effect: Partial<Stats>;
  activity: Activity;
}

export const CARE_ACTIONS: CareAction[] = [
  { id: 'meal', label: 'Ate a meal', emoji: '🍲', effect: { fullness: 45, joy: 4 }, activity: 'eat' },
  { id: 'snack', label: 'Had a snack', emoji: '🍎', effect: { fullness: 15 }, activity: 'eat' },
  { id: 'water', label: 'Drank water', emoji: '💧', effect: { hydration: 30 }, activity: 'eat' },
  { id: 'nap', label: 'Took a nap', emoji: '😴', effect: { energy: 25 }, activity: 'sleep' },
  { id: 'move', label: 'Moved my body', emoji: '🤸', effect: { movement: 35, joy: 5, energy: -3 }, activity: 'exercise' },
  { id: 'outside', label: 'Went outside', emoji: '🌳', effect: { movement: 15, joy: 12 }, activity: 'walk' },
  { id: 'text', label: 'Messaged someone', emoji: '📱', effect: { social: 15, joy: 3 }, activity: 'social' },
  { id: 'talk', label: 'Talked with someone', emoji: '🗣️', effect: { social: 40, joy: 8 }, activity: 'social' },
  { id: 'fun', label: 'Did something fun', emoji: '🎈', effect: { joy: 30 }, activity: 'create' },
  { id: 'shower', label: 'Showered', emoji: '🚿', effect: { joy: 10, energy: 4 }, activity: 'clean' },
  { id: 'breathe', label: 'Paused & breathed', emoji: '🫁', effect: { joy: 8, energy: 3 }, activity: 'meditate' },
];

export const clamp = (n: number) => Math.max(0, Math.min(100, n));

export function applyEffect(stats: Stats, effect: Partial<Stats>, scale = 1): Stats {
  const next = { ...stats };
  for (const k of STAT_KEYS) if (effect[k] !== undefined) next[k] = clamp(next[k] + effect[k]! * scale);
  return next;
}

/** Advance stats by elapsed time. */
export function decay(stats: Stats, elapsedMs: number, asleep: boolean): Stats {
  const hours = Math.max(0, elapsedMs) / 3_600_000;
  if (hours === 0) return stats;
  const next = { ...stats };
  for (const k of STAT_KEYS) {
    const rate = asleep ? SLEEP_RATE[k] : -DECAY_PER_HOUR[k];
    next[k] = clamp(next[k] + rate * hours);
  }
  return next;
}

export function healthOf(stats: Stats, feelingSick: boolean): Health {
  if (feelingSick) return 'unwell';
  const values = STAT_KEYS.map((k) => stats[k]);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const critical = values.filter((v) => v < 15).length;
  if (critical >= 2 || avg < 30) return 'poor';
  if (avg >= 72 && min >= 45) return 'excellent';
  if (min < 15 || avg < 45) return 'poor';
  return 'normal';
}

export const HEALTH_INFO: Record<Health, { label: string; color: string }> = {
  unwell: { label: 'Unwell', color: '#9b6bd6' },
  poor: { label: 'Poor', color: '#e06363' },
  normal: { label: 'Normal', color: '#e0b04a' },
  excellent: { label: 'Excellent', color: '#4cb782' },
};

export function moodOf(stats: Stats, health: Health, asleep: boolean): Mood {
  if (health === 'unwell') return 'sick';
  if (asleep) return 'okay';
  const lows: [Mood, number][] = [
    ['tired', stats.energy],
    ['hungry', stats.fullness],
    ['thirsty', stats.hydration],
    ['lonely', stats.social],
    ['restless', stats.movement],
    ['sad', stats.joy],
  ];
  const worst = lows.reduce((a, b) => (b[1] < a[1] ? b : a));
  if (worst[1] < 30) return worst[0];
  if (health === 'excellent') return 'happy';
  if (health === 'poor') return 'sad';
  return 'okay';
}

export interface Alert {
  stat: StatKey | 'health';
  severity: 'gentle' | 'urgent';
  message: string;
  suggestion?: string; // care action id
}

const ALERT_COPY: Record<StatKey, { gentle: string; urgent: string; action: string }> = {
  fullness: {
    gentle: "I'm getting peckish. Could we eat something soon?",
    urgent: "I'm really hungry. Please stop and eat something — you deserve a real meal.",
    action: 'meal',
  },
  hydration: {
    gentle: 'A glass of water would be lovely right now.',
    urgent: "I'm parched! Let's drink some water before anything else.",
    action: 'water',
  },
  energy: {
    gentle: "I'm getting tired. Maybe plan an early night?",
    urgent: "I'm running on empty. Rest isn't a reward, it's maintenance — nap or head to bed.",
    action: 'nap',
  },
  social: {
    gentle: "I miss people. Who could we send a message to?",
    urgent: "I'm feeling really isolated. Let's reach out to someone today, even briefly.",
    action: 'text',
  },
  movement: {
    gentle: 'My body feels stiff. A stretch or short walk?',
    urgent: "I've been still for a long time. Even five minutes of moving would help.",
    action: 'outside',
  },
  joy: {
    gentle: "Let's do one small thing just because it's nice.",
    urgent: "I'm feeling low. Be gentle with us — pick something comforting to do.",
    action: 'fun',
  },
};

export function alertsFor(stats: Stats, health: Health, asleep: boolean): Alert[] {
  if (asleep) return [];
  const alerts: Alert[] = [];
  if (health === 'unwell') {
    alerts.push({
      stat: 'health',
      severity: 'urgent',
      message: "I'm not feeling well. Today's only quest is to rest, hydrate and take care of us.",
      suggestion: 'water',
    });
  }
  for (const k of STAT_KEYS) {
    const v = stats[k];
    if (v < 20) alerts.push({ stat: k, severity: 'urgent', message: ALERT_COPY[k].urgent, suggestion: ALERT_COPY[k].action });
    else if (v < 40) alerts.push({ stat: k, severity: 'gentle', message: ALERT_COPY[k].gentle, suggestion: ALERT_COPY[k].action });
  }
  return alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'urgent' ? -1 : 1));
}

export const INITIAL_STATS: Stats = {
  fullness: 70,
  hydration: 70,
  energy: 75,
  social: 65,
  movement: 60,
  joy: 70,
};

/** XP needed to go from level n to n+1. */
export const xpForLevel = (level: number) => 50 + level * 25;
