import type { Appearance } from '../types';

export const SKIN_TONES = ['#ffe0c7', '#f6cfae', '#eab98f', '#d9a074', '#c68a5c', '#a86d43', '#8a5432', '#6b3f24', '#4d2c19'];
export const HAIR_COLORS = ['#1c1714', '#3b2a20', '#5a3b26', '#8a5a34', '#b5803e', '#d9b26a', '#e8d6a6', '#a33a2a', '#c9562c', '#8c8c8c', '#e6e6e6', '#5b6fd6', '#d65bb5', '#4cb782'];
export const EYE_COLORS = ['#3b2a20', '#1c1714', '#3d6fa8', '#4c8a55', '#7a6a3a', '#8c8c8c'];
export const CLOTHES_COLORS = ['#e06363', '#f08c4a', '#e0b04a', '#4cb782', '#3fa7a0', '#4a8fe0', '#6b6fd6', '#9b6bd6', '#d65bb5', '#f2f2f2', '#9aa0a6', '#3a3f4b', '#1f2329', '#8a5a34', '#c9b48a'];

export const DEFAULT_APPEARANCE: Appearance = {
  name: '',
  skinTone: SKIN_TONES[2],
  faceShape: 'round',
  hairStyle: 'short',
  hairColor: HAIR_COLORS[2],
  eyeStyle: 'round',
  eyeColor: EYE_COLORS[0],
  brows: 'thick',
  nose: 'button',
  mouth: 'smile',
  facialHair: 'none',
  glasses: 'none',
  headwear: 'none',
  headwearColor: CLOTHES_COLORS[5],
  freckles: false,
  blush: true,
  build: 'average',
  height: 1,
  shirtColor: CLOTHES_COLORS[5],
  pantsColor: CLOTHES_COLORS[11],
  shoeColor: CLOTHES_COLORS[13],
};

const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];

export const FEATURE_OPTIONS = {
  faceShape: ['round', 'oval', 'long', 'square', 'heart'],
  hairStyle: ['bald', 'buzz', 'short', 'side', 'spiky', 'curly', 'afro', 'bob', 'long', 'ponytail', 'bun', 'mohawk', 'locs'],
  eyeStyle: ['dot', 'round', 'almond', 'wide', 'sleepy'],
  brows: ['thin', 'thick', 'arched', 'flat', 'none'],
  nose: ['button', 'small', 'long', 'wide'],
  mouth: ['smile', 'grin', 'flat', 'small'],
  facialHair: ['none', 'stubble', 'mustache', 'goatee', 'beard'],
  glasses: ['none', 'round', 'square', 'sunglasses'],
  headwear: ['none', 'beanie', 'cap'],
  build: ['slim', 'average', 'broad'],
} as const;

export function randomAppearance(name = ''): Appearance {
  const o = FEATURE_OPTIONS;
  return {
    name,
    skinTone: pick(SKIN_TONES),
    faceShape: pick(o.faceShape),
    hairStyle: pick(o.hairStyle),
    hairColor: pick(HAIR_COLORS.slice(0, 11)),
    eyeStyle: pick(o.eyeStyle),
    eyeColor: pick(EYE_COLORS),
    brows: pick(o.brows),
    nose: pick(o.nose),
    mouth: pick(o.mouth),
    facialHair: Math.random() < 0.7 ? 'none' : pick(o.facialHair),
    glasses: Math.random() < 0.6 ? 'none' : pick(o.glasses),
    headwear: Math.random() < 0.8 ? 'none' : pick(o.headwear),
    headwearColor: pick(CLOTHES_COLORS),
    freckles: Math.random() < 0.25,
    blush: Math.random() < 0.5,
    build: pick(o.build),
    height: pick([0, 1, 2] as const),
    shirtColor: pick(CLOTHES_COLORS),
    pantsColor: pick(CLOTHES_COLORS),
    shoeColor: pick(CLOTHES_COLORS),
  };
}

/** Darken/lighten a hex colour by a factor (-1..1). */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => {
    const c = (n >> shift) & 255;
    const v = amount < 0 ? c * (1 + amount) : c + (255 - c) * amount;
    return Math.round(Math.max(0, Math.min(255, v)));
  };
  return '#' + [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('');
}
