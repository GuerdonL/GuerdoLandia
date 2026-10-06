// Built-in reward generator: turns the player's real-life reward ("money",
// "peace of mind", "a clean kitchen") into an in-game item. The AI oracle can
// replace these with richer items; this always works offline.

import { stem } from '../game/classifier';
import type { Stats } from '../types';
import { ARCHETYPES } from './archetypes';
import type { ArchetypeId, LootDelivery, Rarity, RewardKind, RewardSpec } from './types';

const KIND_WORDS: Record<RewardKind, string[]> = {
  gold: ['money', 'pay', 'paycheck', 'salary', 'cash', 'income', 'wage', 'dollar', 'job', 'work', 'rent', 'bill', 'savings', 'gold', 'raise', 'client', 'invoice'],
  potion: ['peace', 'calm', 'mind', 'clarity', 'energy', 'focus', 'relax', 'relief', 'stress', 'serenity', 'mood', 'happy', 'happiness', 'confidence', 'courage', 'rest'],
  gear: ['strength', 'strong', 'fit', 'fitness', 'muscle', 'stamina', 'health', 'healthy', 'tool', 'bike', 'shelf', 'desk', 'gear', 'shoes'],
  scroll: ['knowledge', 'learn', 'skill', 'understand', 'wisdom', 'degree', 'certificate', 'language', 'insight', 'idea'],
  charm: ['clean', 'tidy', 'home', 'friend', 'friendship', 'love', 'connection', 'family', 'belonging', 'cozy', 'order', 'space'],
  food: ['food', 'meal', 'dinner', 'lunch', 'breakfast', 'snack', 'treat', 'coffee', 'cake', 'cookie', 'tea', 'pizza', 'ice cream', 'chocolate'],
  trophy: ['pride', 'proud', 'done', 'finished', 'achievement', 'portfolio', 'publish', 'launch', 'show', 'art', 'song', 'project', 'win'],
  material: ['groceries', 'supplies', 'stock', 'package', 'parcel', 'prescription', 'errand', 'stuff'],
  blessing: ['sleep', 'rested', 'recovery', 'heal', 'healing', 'better', 'well'],
};

const ICONS: Record<RewardKind, string[]> = {
  gold: ['💰', '🪙'],
  potion: ['🧪', '⚗️'],
  gear: ['🗡️', '🛡️', '🥾'],
  scroll: ['📜', '📘'],
  charm: ['🧿', '💎', '🔮'],
  food: ['🍖', '🥧', '🍯'],
  trophy: ['🏆', '👑'],
  material: ['🧺', '🪵', '📦'],
  blessing: ['✨', '🌙'],
};

const NAMES: Record<RewardKind, (w: string) => string> = {
  gold: () => 'Pouch of Hard-Earned Gold',
  potion: (w) => `Potion of ${titleCase(w || 'Quiet Mind')}`,
  gear: (w) => `${titleCase(w || 'Sturdy')} Gauntlets`,
  scroll: (w) => `Scroll of ${titleCase(w || 'New Knowledge')}`,
  charm: (w) => `Charm of ${titleCase(w || 'Hearth and Home')}`,
  food: (w) => `Hearty ${titleCase(w || 'Feast')}`,
  trophy: (w) => `Trophy of ${titleCase(w || 'Finished Work')}`,
  material: (w) => `Bundle of ${titleCase(w || 'Supplies')}`,
  blessing: (w) => `Blessing of ${titleCase(w || 'Deep Rest')}`,
};

/** Consumables nudge needs when used. */
const EFFECTS: Partial<Record<RewardKind, Partial<Stats>>> = {
  potion: { joy: 15, energy: 5 },
  food: { fullness: 20, joy: 8 },
  blessing: { energy: 15, joy: 5 },
};

const FLAVOR: Record<RewardKind, string> = {
  gold: 'Coins earned the honest way. They clink when you walk.',
  potion: 'It glows softly. One sip and the noise in your head settles.',
  gear: 'Well made and well earned. You feel sturdier just holding it.',
  scroll: 'The ink still shimmers with what you learned.',
  charm: 'Warm to the touch, like a lit window on a cold night.',
  food: 'Still warm. Somebody made this with care, and that somebody was you.',
  trophy: 'Proof that you finished something. Put it somewhere you can see it.',
  material: 'Everything you set out to fetch, bundled up neatly.',
  blessing: 'A quiet light that settles on your shoulders and stays a while.',
};

const DELIVERY_TEXT: Record<LootDelivery, string> = {
  'monster-drop': 'dropped by the defeated foe',
  'cave-chest': 'found in a chest at the back of a cave',
  'treasure-room': 'discovered in a hidden treasure room',
  'dragon-hoard': "plucked from a sleeping dragon's hoard",
  'shrine-blessing': 'granted by the shrine',
  merchant: 'given by a grateful merchant',
  'grateful-villager': 'pressed into your hands by a grateful villager',
};
export const deliveryText = (d: LootDelivery) => DELIVERY_TEXT[d];

function titleCase(s: string) {
  return s.replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export function rewardKindFor(realWorld: string): RewardKind | undefined {
  const stems = new Set(realWorld.toLowerCase().split(/[^a-z]+/).filter(Boolean).map(stem));
  let best: RewardKind | undefined;
  let bestScore = 0;
  for (const [kind, words] of Object.entries(KIND_WORDS) as [RewardKind, string[]][]) {
    const score = words.filter((w) => stems.has(stem(w))).length;
    if (score > bestScore) {
      best = kind;
      bestScore = score;
    }
  }
  return best;
}

/** Bigger quests earn rarer loot. */
export function rarityFor(target: number | undefined, words: number): Rarity {
  const size = (target ?? 1) + words / 4;
  if (size >= 20) return 'legendary';
  if (size >= 10) return 'epic';
  if (size >= 5) return 'rare';
  if (size >= 3) return 'uncommon';
  return 'common';
}

export function builtInReward(questTitle: string, archetype: ArchetypeId, realWorld: string, target?: number): RewardSpec {
  const a = ARCHETYPES[archetype];
  const kind = rewardKindFor(realWorld) ?? a.defaultReward;
  const seed = hash(questTitle + realWorld);
  // Use the player's own words as the item's flavour when they gave some.
  const phrase = realWorld
    .replace(/^(a|an|the|some|my|more)\s+/i, '')
    .split(/\s+/)
    .slice(0, 3)
    .join(' ');
  const rarity = rarityFor(target, questTitle.split(/\s+/).length);
  const delivery = a.deliveries[seed % a.deliveries.length];
  const amount = kind === 'gold' ? { common: 10, uncommon: 25, rare: 50, epic: 100, legendary: 250 }[rarity] : undefined;
  return {
    realWorld: realWorld.trim(),
    kind,
    name: NAMES[kind](kind === 'gold' ? '' : phrase),
    icon: ICONS[kind][seed % ICONS[kind].length],
    description: FLAVOR[kind],
    rarity,
    delivery,
    amount,
    effect: EFFECTS[kind],
    source: 'built-in',
  };
}

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#9aa0a6',
  uncommon: '#4cb782',
  rare: '#4a8fe0',
  epic: '#9b6bd6',
  legendary: '#f0a040',
};
