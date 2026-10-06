// Natural-language quest → animation classifier.
//
// Runs fully offline: a weighted lexicon of words and phrases per activity,
// with light stemming so "applying", "applied" and "applies" all match "apply".
// The highest-scoring activity wins; ties and no-matches fall back to 'desk'
// (most life admin happens at a desk) or 'idle' for empty text.

import type { Activity } from '../types';

type Lexicon = Record<Exclude<Activity, 'idle'>, Record<string, number>>;

const LEXICON: Lexicon = {
  desk: {
    job: 2, apply: 2, application: 2, resume: 3, cv: 3, 'cover letter': 3, email: 3, inbox: 3,
    write: 2, essay: 3, report: 3, code: 3, program: 2, debug: 3, project: 1, work: 1, study: 2,
    homework: 3, tax: 3, taxes: 3, budget: 3, bill: 2, invoice: 3, spreadsheet: 3, research: 2,
    laptop: 3, computer: 3, admin: 2, paperwork: 3, form: 2, grant: 2, thesis: 3, draft: 2,
    edit: 2, plan: 1, schedule: 1, linkedin: 3, portfolio: 2, meeting: 1, zoom: 2, document: 2,
    online: 1, website: 2, slide: 2, presentation: 2, deck: 1, review: 1, file: 1, submit: 1,
  },
  exercise: {
    exercise: 3, workout: 3, gym: 3, run: 3, jog: 3, lift: 3, weights: 3, yoga: 2, stretch: 2,
    pushup: 3, 'push up': 3, squat: 3, cardio: 3, swim: 3, bike: 2, cycle: 2, hike: 2, sport: 2,
    train: 2, training: 2, pilates: 3, dance: 2, climb: 2, tennis: 3, soccer: 3, basketball: 3,
    fitness: 3, abs: 2, physio: 2, 'physical therapy': 3, steps: 1, sweat: 2, crossfit: 3,
  },
  build: {
    build: 3, fix: 2, repair: 3, assemble: 3, furniture: 2, ikea: 3, diy: 3, woodwork: 3,
    hammer: 3, tool: 2, install: 2, construct: 3, shelf: 2, garden: 2, plant: 1, maker: 2,
    solder: 3, craft: 2, renovate: 3, paint: 1, wall: 1, bike: 1, prototype: 2, robot: 2,
  },
  clean: {
    clean: 3, tidy: 3, vacuum: 3, sweep: 3, mop: 3, dust: 3, laundry: 3, wash: 2, dishes: 3,
    declutter: 3, organize: 2, organise: 2, trash: 3, garbage: 3, recycle: 2, chore: 3,
    bathroom: 2, kitchen: 1, closet: 2, room: 1, scrub: 3, fold: 2, iron: 2, bed: 1, sheets: 2,
  },
  meditate: {
    meditate: 3, meditation: 3, breathe: 3, breathing: 3, mindful: 3, mindfulness: 3, calm: 2,
    relax: 2, journal: 2, gratitude: 3, pray: 3, prayer: 3, therapy: 2, reflect: 2, rest: 1,
    'self care': 2, selfcare: 2, decompress: 3, quiet: 1, affirmation: 3, yoga: 1,
  },
  cook: {
    cook: 3, cooking: 3, bake: 3, recipe: 3, 'meal prep': 3, mealprep: 3, dinner: 2, lunch: 2,
    breakfast: 2, kitchen: 2, soup: 2, bread: 2, groceries: 1, prep: 1, chop: 2, fry: 2,
  },
  eat: {
    eat: 3, meal: 2, snack: 3, food: 2, hydrate: 2, water: 2, drink: 2, vitamin: 2, medicine: 2,
    meds: 2, nourish: 3, fruit: 2,
  },
  read: {
    read: 3, book: 3, novel: 3, chapter: 3, article: 2, paper: 2, learn: 2, course: 2,
    lesson: 2, lecture: 2, textbook: 3, notes: 1, library: 2, kindle: 3, audiobook: 2,
    language: 1, duolingo: 2, podcast: 1, 'study for': 1,
  },
  social: {
    call: 3, phone: 2, text: 2, friend: 3, friends: 3, family: 3, mom: 3, dad: 3, parent: 2,
    sister: 3, brother: 3, partner: 2, date: 2, visit: 2, party: 3, hang: 2, 'hang out': 3,
    coffee: 2, chat: 3, catch: 1, 'catch up': 3, network: 3, networking: 3, interview: 2,
    reach: 1, 'reach out': 3, message: 2, birthday: 2, meetup: 3, club: 2, volunteer: 2, team: 1,
    neighbor: 2, neighbour: 2, letter: 1,
  },
  walk: {
    walk: 3, errand: 3, errands: 3, grocery: 2, groceries: 2, shop: 2, shopping: 2, store: 2,
    pharmacy: 3, post: 1, 'post office': 3, bank: 2, outside: 2, commute: 2, dog: 2, park: 2,
    stroll: 3, appointment: 2, doctor: 2, dentist: 2, pickup: 2, 'pick up': 2, drop: 1,
    'drop off': 2, mail: 1, fresh: 1, 'fresh air': 3, drive: 1,
  },
  create: {
    draw: 3, drawing: 3, paint: 2, painting: 3, art: 3, sketch: 3, music: 3, guitar: 3,
    piano: 3, song: 3, sing: 3, compose: 3, photo: 2, photography: 3, film: 2, video: 2,
    design: 2, poem: 3, poetry: 3, story: 2, novel: 1, knit: 3, crochet: 3, sew: 3,
    create: 2, creative: 3, practice: 1, instrument: 3, illustrate: 3, pottery: 3,
  },
  sleep: {
    sleep: 3, nap: 3, bed: 2, bedtime: 3, rest: 2, 'lie down': 3, 'wind down': 3, snooze: 3,
    'early night': 3, recover: 1,
  },
};

// Strip common English suffixes so inflections share a stem.
export function stem(word: string): string {
  let w = word.toLowerCase();
  if (w.length <= 3) return w;
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
  if (w.endsWith('ied') && w.length > 4) return w.slice(0, -3) + 'y';
  for (const suf of ['ing', 'ed', 'es', 's']) {
    if (w.endsWith(suf) && w.length - suf.length >= 3) {
      w = w.slice(0, -suf.length);
      // running → runn → run, swimming → swim
      if (suf !== 's' && w.length >= 3 && w[w.length - 1] === w[w.length - 2]) w = w.slice(0, -1);
      return w;
    }
  }
  // bake/baking → bak, write/writing → writ (both sides of the match are stemmed).
  if (w.endsWith('e') && w.length > 3) w = w.slice(0, -1);
  return w;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

interface Entry {
  activity: Exclude<Activity, 'idle'>;
  weight: number;
}
const singleIndex = new Map<string, Entry[]>();
const phraseIndex: { stems: string[]; entry: Entry }[] = [];

for (const [activity, words] of Object.entries(LEXICON) as [Exclude<Activity, 'idle'>, Record<string, number>][]) {
  for (const [term, weight] of Object.entries(words)) {
    const stems = tokenize(term).map(stem);
    if (stems.length === 1) {
      const list = singleIndex.get(stems[0]) ?? [];
      list.push({ activity, weight });
      singleIndex.set(stems[0], list);
    } else {
      phraseIndex.push({ stems, entry: { activity, weight } });
    }
  }
}

export interface Classification {
  activity: Activity;
  /** 0–1, how strongly the winner beat the alternatives. */
  confidence: number;
  matched: string[];
  scores: Partial<Record<Activity, number>>;
}

export function classifyActivity(text: string): Classification {
  const tokens = tokenize(text);
  const stems = tokens.map(stem);
  const scores: Partial<Record<Activity, number>> = {};
  const matched: string[] = [];
  const add = (e: Entry, label: string) => {
    scores[e.activity] = (scores[e.activity] ?? 0) + e.weight;
    matched.push(label);
  };

  stems.forEach((s, i) => {
    for (const e of singleIndex.get(s) ?? []) add(e, tokens[i]);
  });
  for (const { stems: ps, entry } of phraseIndex) {
    for (let i = 0; i + ps.length <= stems.length; i++) {
      if (ps.every((p, j) => stems[i + j] === p)) add(entry, tokens.slice(i, i + ps.length).join(' '));
    }
  }

  const ranked = (Object.entries(scores) as [Activity, number][]).sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) {
    return { activity: tokens.length ? 'desk' : 'idle', confidence: 0, matched: [], scores };
  }
  const [best, second] = ranked;
  const total = ranked.reduce((sum, [, v]) => sum + v, 0);
  const margin = second ? (best[1] - second[1]) / best[1] : 1;
  const confidence = Math.min(1, (best[1] / total) * 0.6 + margin * 0.4) * Math.min(1, best[1] / 3);
  return { activity: best[0], confidence: Math.round(confidence * 100) / 100, matched: [...new Set(matched)], scores };
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, fifty: 50, hundred: 100,
  a: 1, an: 1, // only used if followed by a countable noun, see below
};

/**
 * Find a count in quests like "find 10 jobs to apply to" or "read three chapters".
 * Durations ("for 20 minutes") are ignored — those belong to the timer.
 */
export function parseTarget(text: string): number | undefined {
  const tokens = tokenize(text);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const next = tokens[i + 1];
    if (!next || /^(min|mins|minute|minutes|hour|hours|hr|hrs|h|m|am|pm|sec|seconds|days?|weeks?)$/.test(next)) continue;
    let n: number | undefined;
    if (/^\d+$/.test(t)) n = parseInt(t, 10);
    else if (t !== 'a' && t !== 'an' && t in NUMBER_WORDS) n = NUMBER_WORDS[t];
    if (n !== undefined && n > 1 && n <= 1000) return n;
  }
  return undefined;
}

export const ACTIVITY_INFO: Record<Activity, { label: string; emoji: string }> = {
  idle: { label: 'Hanging out', emoji: '🙂' },
  desk: { label: 'Desk work', emoji: '💻' },
  exercise: { label: 'Exercise', emoji: '🏋️' },
  build: { label: 'Building', emoji: '🔨' },
  clean: { label: 'Cleaning', emoji: '🧹' },
  meditate: { label: 'Meditating', emoji: '🧘' },
  cook: { label: 'Cooking', emoji: '🍳' },
  eat: { label: 'Eating', emoji: '🍎' },
  read: { label: 'Reading', emoji: '📖' },
  social: { label: 'Socializing', emoji: '💬' },
  walk: { label: 'Out & about', emoji: '🚶' },
  create: { label: 'Creating', emoji: '🎨' },
  sleep: { label: 'Sleeping', emoji: '😴' },
};

export const ALL_ACTIVITIES = Object.keys(ACTIVITY_INFO) as Activity[];
