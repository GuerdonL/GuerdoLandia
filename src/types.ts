// Shared data model for the whole app.

import type { QuestStaging, RewardSpec } from './adventure/types';

export type Activity =
  | 'idle'
  | 'desk'
  | 'exercise'
  | 'build'
  | 'clean'
  | 'meditate'
  | 'cook'
  | 'eat'
  | 'read'
  | 'social'
  | 'walk'
  | 'create'
  | 'sleep';

export type FaceShape = 'round' | 'oval' | 'long' | 'square' | 'heart';
export type HairStyle =
  | 'bald'
  | 'buzz'
  | 'short'
  | 'side'
  | 'spiky'
  | 'curly'
  | 'afro'
  | 'bob'
  | 'long'
  | 'ponytail'
  | 'bun'
  | 'mohawk'
  | 'locs';
export type EyeStyle = 'dot' | 'round' | 'almond' | 'wide' | 'sleepy';
export type BrowStyle = 'thin' | 'thick' | 'arched' | 'flat' | 'none';
export type NoseStyle = 'button' | 'small' | 'long' | 'wide';
export type MouthStyle = 'smile' | 'grin' | 'flat' | 'small';
export type FacialHair = 'none' | 'stubble' | 'mustache' | 'goatee' | 'beard';
export type Glasses = 'none' | 'round' | 'square' | 'sunglasses';
export type Headwear = 'none' | 'beanie' | 'cap';
export type Build = 'slim' | 'average' | 'broad';

export interface Appearance {
  name: string;
  skinTone: string;
  faceShape: FaceShape;
  hairStyle: HairStyle;
  hairColor: string;
  eyeStyle: EyeStyle;
  eyeColor: string;
  brows: BrowStyle;
  nose: NoseStyle;
  mouth: MouthStyle;
  facialHair: FacialHair;
  glasses: Glasses;
  headwear: Headwear;
  headwearColor: string;
  freckles: boolean;
  blush: boolean;
  build: Build;
  /** 0 = short, 1 = average, 2 = tall */
  height: 0 | 1 | 2;
  shirtColor: string;
  pantsColor: string;
  shoeColor: string;
}

/** Need-style stats. 0 = urgent need, 100 = fully satisfied. */
export interface Stats {
  fullness: number; // hunger (inverse)
  hydration: number;
  energy: number; // restedness
  social: number; // connection vs isolation
  movement: number;
  joy: number;
}
export type StatKey = keyof Stats;

export type Health = 'unwell' | 'poor' | 'normal' | 'excellent';
export type Mood = 'happy' | 'okay' | 'sad' | 'tired' | 'hungry' | 'thirsty' | 'lonely' | 'sick' | 'restless';

export interface Quest {
  id: string;
  title: string;
  activity: Activity;
  /** True when the user picked the animation themselves instead of the classifier. */
  activityLocked: boolean;
  /** Countable quests ("apply to 10 jobs") track progress toward a target. */
  target?: number;
  progress: number;
  focusMinutes: number;
  createdAt: string;
  completedAt?: string;
  /** What finishing this gives you in real life, in your own words. */
  rewardText?: string;
  /** The in-game loot that stands for it, fixed when the quest is written or edited. */
  reward?: RewardSpec;
  /** How the quest is staged in the fantasy world. */
  staging?: QuestStaging;
  /** Self-reported progress, 0–100 in steps of 10. */
  progressPct?: number;
}

export interface TimeBlock {
  id: string;
  title: string;
  questId?: string;
  activity: Activity;
  start: string; // ISO
  end: string; // ISO
  /** Google Calendar event id once synced (or for events pulled from Google). */
  googleEventId?: string;
  source: 'local' | 'google';
  updatedAt: string;
  syncedAt?: string;
}

export type TimerPhase = 'focus' | 'shortBreak' | 'longBreak';

export interface TimerState {
  mode: 'pomodoro' | 'block' | 'free';
  phase: TimerPhase;
  questId?: string;
  blockId?: string;
  activity: Activity;
  label: string;
  /** Epoch ms when the current phase ends (while running). */
  endsAt?: number;
  /** Remaining ms while paused. */
  remainingMs: number;
  /** Total ms of the current phase, for progress display. */
  totalMs: number;
  running: boolean;
  /** Completed focus sessions in this pomodoro run. */
  cycle: number;
}

export interface PomodoroSettings {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  cyclesBeforeLong: number;
}

export interface LogEntry {
  at: string;
  text: string;
}
