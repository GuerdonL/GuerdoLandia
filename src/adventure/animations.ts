// Animation registry. Every animation has a label like "hero-attack" or
// "monster-attack". Built-in labels are drawn by the SVG renderer. When the AI
// proposes a new label, we first look for an existing one that means the same
// thing (cheap, offline); only a truly new label is sent to the image generator,
// and its frames are cached on the device so it is never generated twice.

import { stem } from '../game/classifier';
import type { AnimationEntry } from './types';

const now = () => new Date().toISOString();

export const BUILT_IN_ANIMATIONS: AnimationEntry[] = [
  { label: 'hero-ready', description: 'hero in a ready stance with sword and shield', builtIn: { heroActivity: 'idle' }, createdAt: '' },
  { label: 'hero-attack', description: 'hero swings a sword to attack', builtIn: {}, createdAt: '' },
  { label: 'hero-hurt', description: 'hero flinches after being hit', builtIn: {}, createdAt: '' },
  { label: 'hero-meditate', description: 'hero meditates cross-legged, breathing calmly', builtIn: { heroActivity: 'meditate' }, createdAt: '' },
  { label: 'hero-train', description: 'hero exercises, doing jumping jacks or drills', builtIn: { heroActivity: 'exercise' }, createdAt: '' },
  { label: 'hero-forge', description: 'hero hammers at an anvil or builds something', builtIn: { heroActivity: 'build' }, createdAt: '' },
  { label: 'hero-sweep', description: 'hero sweeps and cleans with a broom', builtIn: { heroActivity: 'clean' }, createdAt: '' },
  { label: 'hero-cook', description: 'hero cooks, flipping food in a pan', builtIn: { heroActivity: 'cook' }, createdAt: '' },
  { label: 'hero-eat', description: 'hero eats a meal', builtIn: { heroActivity: 'eat' }, createdAt: '' },
  { label: 'hero-read', description: 'hero reads a book or studies a scroll', builtIn: { heroActivity: 'read' }, createdAt: '' },
  { label: 'hero-talk', description: 'hero talks and waves to friends', builtIn: { heroActivity: 'social' }, createdAt: '' },
  { label: 'hero-walk', description: 'hero walks along a road carrying a bag', builtIn: { heroActivity: 'walk' }, createdAt: '' },
  { label: 'hero-perform', description: 'hero paints, makes music or creates art', builtIn: { heroActivity: 'create' }, createdAt: '' },
  { label: 'hero-type', description: 'hero writes or works at a desk', builtIn: { heroActivity: 'desk' }, createdAt: '' },
  { label: 'hero-rest', description: 'hero sleeps or rests in bed', builtIn: { heroActivity: 'sleep' }, createdAt: '' },
  { label: 'hero-victory', description: 'hero celebrates a victory, arms raised', builtIn: { heroActivity: 'exercise' }, createdAt: '' },
  { label: 'monster-idle', description: 'monster waits, bobbing menacingly', builtIn: { monsterMotion: 'idle' }, createdAt: '' },
  { label: 'monster-attack', description: 'monster lunges forward to attack', builtIn: { monsterMotion: 'attack' }, createdAt: '' },
  { label: 'monster-hurt', description: 'monster recoils after being hit', builtIn: { monsterMotion: 'hurt' }, createdAt: '' },
  { label: 'monster-defeat', description: 'monster collapses and vanishes in a puff', builtIn: { monsterMotion: 'defeat' }, createdAt: '' },
];

const SYNONYMS: Record<string, string> = {
  strike: 'attack', swing: 'attack', slash: 'attack', fight: 'attack', hit: 'attack', lunge: 'attack', stab: 'attack',
  idle: 'ready', stance: 'ready', wait: 'ready', guard: 'ready',
  flinch: 'hurt', damage: 'hurt', recoil: 'hurt', wound: 'hurt',
  pray: 'meditate', breathe: 'meditate', calm: 'meditate', focus: 'meditate',
  workout: 'train', exercise: 'train', run: 'train', lift: 'train', drill: 'train',
  build: 'forge', hammer: 'forge', craft: 'forge', repair: 'forge',
  clean: 'sweep', tidy: 'sweep', scrub: 'sweep', wash: 'sweep',
  brew: 'cook', bake: 'cook', stir: 'cook',
  study: 'read', learn: 'read', scroll: 'read', book: 'read',
  chat: 'talk', social: 'talk', wave: 'talk', greet: 'talk',
  travel: 'walk', march: 'walk', journey: 'walk', errand: 'walk',
  paint: 'perform', sing: 'perform', play: 'perform', create: 'perform', art: 'perform', music: 'perform',
  write: 'type', work: 'type', desk: 'type', code: 'type',
  sleep: 'rest', nap: 'rest',
  celebrate: 'victory', cheer: 'victory', win: 'victory',
  die: 'defeat', vanish: 'defeat', fall: 'defeat', faint: 'defeat',
  player: 'hero', adventurer: 'hero', you: 'hero', character: 'hero',
  enemy: 'monster', foe: 'monster', creature: 'monster', adversary: 'monster',
};

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((t) => t.length > 1)
      .map((t) => SYNONYMS[t] ?? SYNONYMS[stem(t)] ?? stem(t)),
  );
}

function similarity(a: string, b: string) {
  const A = tokens(a);
  const B = tokens(b);
  const inter = [...A].filter((t) => B.has(t)).length;
  return inter / Math.max(1, Math.min(A.size, B.size));
}

/** The closest known animation for a label, and how close it is (0–1). */
export function matchAnimation(label: string, registry: AnimationEntry[] = BUILT_IN_ANIMATIONS): { entry: AnimationEntry; score: number } {
  const whole = label.replace(/[-_]/g, ' ');
  let best = registry[0];
  let bestScore = -1;
  for (const e of registry) {
    // The label carries most of the meaning; the description breaks ties.
    const score = Math.max(similarity(whole, e.label.replace(/-/g, ' ')), similarity(whole, e.description) * 0.8);
    // Hero animations must match hero labels and monster ones monster labels.
    const sameActor = tokens(whole).has('monster') === e.label.startsWith('monster');
    const s = sameActor ? score : score * 0.3;
    if (s > bestScore) {
      best = e;
      bestScore = s;
    }
  }
  return { entry: best, score: Math.round(bestScore * 100) / 100 };
}

/** Labels at or above this score reuse an existing animation instead of generating one. */
export const REUSE_THRESHOLD = 0.6;

export function newGeneratedEntry(label: string, description: string, frameKeys: string[]): AnimationEntry {
  return { label, description, frameKeys, createdAt: now() };
}
