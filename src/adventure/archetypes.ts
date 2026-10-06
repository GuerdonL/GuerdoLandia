// Built-in quest types. Each real-life activity maps to a place in the fantasy
// world, the foes you face there, and how the hero acts against them.

import type { Activity } from '../types';
import type { AdversaryTemplate, ArchetypeId, LootDelivery, RewardKind } from './types';

export interface Archetype {
  id: ArchetypeId;
  name: string;
  place: string;
  /** Sky/ground colours for the scene. */
  palette: { sky: [string, string]; ground: string; accent: string };
  /** What the hero does on screen (an avatar activity; 'fight' = sword and shield). */
  heroActivity: Activity | 'fight';
  strikeVerb: string;
  adversaryVerb: string;
  adversaries: AdversaryTemplate[];
  defaultReward: RewardKind;
  deliveries: LootDelivery[];
  /** Visual effect drawn when the hero lands a hit. */
  strikeFx: 'slash' | 'pulse' | 'sparkle' | 'note' | 'flame';
}

export const ARCHETYPES: Record<ArchetypeId, Archetype> = {
  battle: {
    id: 'battle',
    name: 'Skirmish',
    place: 'Goblin-held pass',
    palette: { sky: ['#cfe3ff', '#f2f7ff'], ground: '#7fae6b', accent: '#e06363' },
    heroActivity: 'fight',
    strikeVerb: 'Strike',
    adversaryVerb: 'lunges',
    adversaries: [
      { name: 'Paperwork Goblin', kind: 'goblin', hue: 110 },
      { name: 'Inbox Imp', kind: 'imp', hue: 0 },
      { name: 'Deadline Slime', kind: 'slime', hue: 140 },
      { name: 'Procrastination Bat', kind: 'bat', hue: 270 },
    ],
    defaultReward: 'gold',
    deliveries: ['monster-drop', 'treasure-room', 'dragon-hoard'],
    strikeFx: 'slash',
  },
  arena: {
    id: 'arena',
    name: 'Training Grounds',
    place: 'Sunlit training yard',
    palette: { sky: ['#ffe2cf', '#fff6ef'], ground: '#d6b483', accent: '#f08c4a' },
    heroActivity: 'exercise',
    strikeVerb: 'Train',
    adversaryVerb: 'wobbles back at you',
    adversaries: [
      { name: 'Straw Sparring Dummy', kind: 'dummy', hue: 40 },
      { name: 'Lethargy Golem', kind: 'golem', hue: 30 },
      { name: 'Couch Slime', kind: 'slime', hue: 20 },
    ],
    defaultReward: 'gear',
    deliveries: ['grateful-villager', 'treasure-room', 'monster-drop'],
    strikeFx: 'slash',
  },
  forge: {
    id: 'forge',
    name: 'The Forge',
    place: 'Dwarven forge',
    palette: { sky: ['#5a3a2a', '#8a5a3a'], ground: '#3a2a20', accent: '#f0a040' },
    heroActivity: 'build',
    strikeVerb: 'Hammer',
    adversaryVerb: 'creaks at you',
    adversaries: [
      { name: 'Rust Golem', kind: 'golem', hue: 20 },
      { name: 'Loose-Screw Imp', kind: 'imp', hue: 30 },
    ],
    defaultReward: 'gear',
    deliveries: ['treasure-room', 'merchant', 'monster-drop'],
    strikeFx: 'flame',
  },
  cleansing: {
    id: 'cleansing',
    name: 'Cleansing',
    place: 'Dusty cursed lair',
    palette: { sky: ['#d9efe9', '#f2fffb'], ground: '#9fb8a8', accent: '#3fa7a0' },
    heroActivity: 'clean',
    strikeVerb: 'Sweep',
    adversaryVerb: 'kicks up dust at you',
    adversaries: [
      { name: 'Dust Bunny Swarm', kind: 'dustling', hue: 0 },
      { name: 'Grime Slime', kind: 'slime', hue: 70 },
      { name: 'Clutter Mimic', kind: 'mimic', hue: 30 },
    ],
    defaultReward: 'charm',
    deliveries: ['cave-chest', 'grateful-villager', 'monster-drop'],
    strikeFx: 'sparkle',
  },
  shrine: {
    id: 'shrine',
    name: 'Shrine of Stillness',
    place: 'Mountain shrine at dusk',
    palette: { sky: ['#d9c7f5', '#f7f0ff'], ground: '#a99bc9', accent: '#9b6bd6' },
    heroActivity: 'meditate',
    strikeVerb: 'Breathe',
    adversaryVerb: 'whispers worries at you',
    adversaries: [
      { name: 'Restless Wisp', kind: 'wisp', hue: 200 },
      { name: 'Racing-Thought Cloud', kind: 'stormcloud', hue: 220 },
      { name: 'Worry Shade', kind: 'shade', hue: 260 },
    ],
    defaultReward: 'potion',
    deliveries: ['shrine-blessing'],
    strikeFx: 'pulse',
  },
  hearth: {
    id: 'hearth',
    name: 'The Hearth',
    place: 'Cottage kitchen',
    palette: { sky: ['#ffe6c4', '#fff7ec'], ground: '#c9a06b', accent: '#e0b04a' },
    heroActivity: 'cook',
    strikeVerb: 'Stir',
    adversaryVerb: 'bubbles over at you',
    adversaries: [
      { name: 'Hunger Gremlin', kind: 'imp', hue: 40 },
      { name: 'Unruly Stew Slime', kind: 'slime', hue: 30 },
    ],
    defaultReward: 'food',
    deliveries: ['grateful-villager', 'cave-chest'],
    strikeFx: 'flame',
  },
  library: {
    id: 'library',
    name: 'Arcane Library',
    place: 'Candlelit library',
    palette: { sky: ['#e3e9d6', '#f7fbf0'], ground: '#8a6a4a', accent: '#4a8fe0' },
    heroActivity: 'read',
    strikeVerb: 'Decipher',
    adversaryVerb: 'snaps its pages at you',
    adversaries: [
      { name: 'Tome Mimic', kind: 'mimic', hue: 210 },
      { name: 'Riddle Wisp', kind: 'wisp', hue: 50 },
      { name: 'Distraction Bat', kind: 'bat', hue: 300 },
    ],
    defaultReward: 'scroll',
    deliveries: ['treasure-room', 'cave-chest'],
    strikeFx: 'sparkle',
  },
  tavern: {
    id: 'tavern',
    name: 'The Tavern',
    place: 'Warm crowded tavern',
    palette: { sky: ['#ffd9e8', '#fff3f8'], ground: '#a8774d', accent: '#d65bb5' },
    heroActivity: 'social',
    strikeVerb: 'Connect',
    adversaryVerb: 'chills the air around you',
    adversaries: [
      { name: 'Shyness Shade', kind: 'shade', hue: 220 },
      { name: 'Fog of Isolation', kind: 'stormcloud', hue: 200 },
    ],
    defaultReward: 'charm',
    deliveries: ['grateful-villager', 'merchant'],
    strikeFx: 'note',
  },
  journey: {
    id: 'journey',
    name: 'The Road',
    place: 'Winding forest road',
    palette: { sky: ['#cfeaff', '#effaff'], ground: '#8fbf6f', accent: '#4a8fe0' },
    heroActivity: 'walk',
    strikeVerb: 'March',
    adversaryVerb: 'blocks your path',
    adversaries: [
      { name: 'Errand Bandit', kind: 'goblin', hue: 30 },
      { name: 'Road Slime', kind: 'slime', hue: 100 },
      { name: 'Detour Bat', kind: 'bat', hue: 20 },
    ],
    defaultReward: 'material',
    deliveries: ['merchant', 'cave-chest', 'monster-drop'],
    strikeFx: 'slash',
  },
  bardic: {
    id: 'bardic',
    name: "Bard's Stage",
    place: 'Enchanted glade stage',
    palette: { sky: ['#fff0c4', '#fffaea'], ground: '#9fc97a', accent: '#d65bb5' },
    heroActivity: 'create',
    strikeVerb: 'Create',
    adversaryVerb: 'jeers at you',
    adversaries: [
      { name: 'Blank Canvas Specter', kind: 'shade', hue: 0 },
      { name: 'Inner Critic Imp', kind: 'imp', hue: 280 },
    ],
    defaultReward: 'trophy',
    deliveries: ['grateful-villager', 'treasure-room'],
    strikeFx: 'note',
  },
  inn: {
    id: 'inn',
    name: 'The Inn',
    place: 'Cozy inn room',
    palette: { sky: ['#2c3366', '#4a528f'], ground: '#3a3060', accent: '#ffe9a8' },
    heroActivity: 'sleep',
    strikeVerb: 'Rest',
    adversaryVerb: 'rattles the shutters',
    adversaries: [
      { name: 'Nightmare Wisp', kind: 'wisp', hue: 260 },
      { name: 'Doomscroll Bat', kind: 'bat', hue: 230 },
    ],
    defaultReward: 'blessing',
    deliveries: ['shrine-blessing'],
    strikeFx: 'pulse',
  },
};

export const ARCHETYPE_FOR_ACTIVITY: Record<Activity, ArchetypeId> = {
  idle: 'battle',
  desk: 'battle',
  exercise: 'arena',
  build: 'forge',
  clean: 'cleansing',
  meditate: 'shrine',
  cook: 'hearth',
  eat: 'hearth',
  read: 'library',
  social: 'tavern',
  walk: 'journey',
  create: 'bardic',
  sleep: 'inn',
};

export const ALL_ARCHETYPES = Object.keys(ARCHETYPES) as ArchetypeId[];
