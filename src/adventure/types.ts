// Data model for the fantasy layer: quest types, encounters, loot and generated assets.

import type { Activity, Stats } from '../types';

/** The kind of adventure a real-life task becomes. */
export type ArchetypeId =
  | 'battle'
  | 'arena'
  | 'forge'
  | 'cleansing'
  | 'shrine'
  | 'hearth'
  | 'library'
  | 'tavern'
  | 'journey'
  | 'bardic'
  | 'inn';

/** Monster shapes the built-in renderer can draw. */
export type MonsterKind =
  | 'slime'
  | 'goblin'
  | 'bat'
  | 'wisp'
  | 'golem'
  | 'imp'
  | 'mimic'
  | 'shade'
  | 'dragon'
  | 'dummy'
  | 'dustling'
  | 'stormcloud';

export interface AdversaryTemplate {
  name: string;
  kind: MonsterKind;
  hue: number;
}

export interface Monster {
  id: string;
  name: string;
  kind: MonsterKind;
  hue: number;
  maxHp: number;
  hp: number;
  /** Key of a generated image to draw instead of the built-in shape. */
  artKey?: string;
}

export type EncounterEvent =
  | { type: 'hit'; amount: number; targetId: string; at: number }
  | { type: 'glance'; at: number }
  | { type: 'hurt'; amount: number; at: number }
  | { type: 'knockdown'; at: number }
  | { type: 'spawn'; monsterId: string; at: number }
  | { type: 'slain'; monsterId: string; at: number }
  | { type: 'victory'; at: number };

export interface Encounter {
  questId: string;
  archetype: ArchetypeId;
  /** Self-reported progress through the real task, 0–100 in steps of 10. */
  progress: number;
  /** HP that stands for the whole task (100%). Remaining HP tracks remaining work. */
  pool: number;
  monsters: Monster[];
  heroHp: number;
  heroMaxHp: number;
  status: 'active' | 'cleared';
  lastEvent?: EncounterEvent;
  log: string[];
}

export type RewardKind = 'gold' | 'potion' | 'gear' | 'scroll' | 'charm' | 'food' | 'trophy' | 'material' | 'blessing';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type LootDelivery = 'monster-drop' | 'cave-chest' | 'treasure-room' | 'dragon-hoard' | 'shrine-blessing' | 'merchant' | 'grateful-villager';

/** What finishing the quest earns, fixed when the quest is written or edited. */
export interface RewardSpec {
  /** The real-life reward in the player's own words ("money", "peace of mind"). */
  realWorld: string;
  kind: RewardKind;
  name: string;
  icon: string;
  description: string;
  rarity: Rarity;
  delivery: LootDelivery;
  /** Gold coins for gold rewards. */
  amount?: number;
  /** Stat boost when a consumable (potion, food, blessing) is used. */
  effect?: Partial<Stats>;
  source: 'built-in' | 'ai';
}

export interface InventoryItem extends RewardSpec {
  id: string;
  questId: string;
  questTitle: string;
  wonAt: string;
  usedAt?: string;
}

/** A scene the AI invented for a quest that fits no built-in archetype. */
export interface CustomScene {
  title: string;
  setting: string;
  heroAction: string;
  adversaryName: string;
  adversaryLook: string;
  strikeVerb: string;
  adversaryVerb: string;
}

/** How a quest is staged in the fantasy world. */
export interface QuestStaging {
  archetype: ArchetypeId;
  /** Adversaries chosen for this quest (names can be AI-written). */
  adversaries: AdversaryTemplate[];
  /** Animation labels this quest uses, resolved against the animation registry. */
  animations: string[];
  customScene?: CustomScene;
  source: 'built-in' | 'ai';
}

/** One entry in the animation registry: built-in, or frames made by an image generator. */
export interface AnimationEntry {
  label: string;
  description: string;
  /** Built-in renderer to use (an avatar activity or a monster motion). */
  builtIn?: { heroActivity?: Activity; monsterMotion?: 'idle' | 'attack' | 'hurt' | 'defeat' };
  /** Keys of generated frames stored on the device. */
  frameKeys?: string[];
  createdAt: string;
}
