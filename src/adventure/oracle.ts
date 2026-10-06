// The oracle decides how a real-life quest is staged in the fantasy world.
//
// 1. Built-in (free, offline, instant): the keyword classifier picks a quest type,
//    and the loot table turns the real-life reward into an item.
// 2. AI (optional, uses the player's own Claude API key): when the built-in guess is
//    weak, or the player asks, Claude picks a quest type or invents a new scene,
//    names the foes and the reward, and lists the animations the scene needs.
// 3. Animations the AI asks for are matched against the registry first; only truly
//    new ones go to the image generator, and the frames are cached on the device.

import { classifyActivity, parseTarget } from '../game/classifier';
import { STAT_KEYS } from '../game/stats';
import type { StatKey } from '../types';
import { ALL_ARCHETYPES, ARCHETYPE_FOR_ACTIVITY, ARCHETYPES } from './archetypes';
import { BUILT_IN_ANIMATIONS, REUSE_THRESHOLD, matchAnimation, newGeneratedEntry } from './animations';
import { assetKey, getImage, putImage } from './assets';
import { builtInReward, rarityFor } from './loot';
import type { AnimationEntry, ArchetypeId, LootDelivery, MonsterKind, QuestStaging, RewardKind, RewardSpec } from './types';

export const MONSTER_KINDS: MonsterKind[] = ['slime', 'goblin', 'bat', 'wisp', 'golem', 'imp', 'mimic', 'shade', 'dragon', 'dummy', 'dustling', 'stormcloud'];
const REWARD_KINDS: RewardKind[] = ['gold', 'potion', 'gear', 'scroll', 'charm', 'food', 'trophy', 'material', 'blessing'];
const DELIVERIES: LootDelivery[] = ['monster-drop', 'cave-chest', 'treasure-room', 'dragon-hoard', 'shrine-blessing', 'merchant', 'grateful-villager'];

/** Below this classifier confidence the AI is consulted automatically (when set up). */
export const AI_CONFIDENCE_THRESHOLD = 0.35;

export interface AiSettings {
  apiKey: string;
  model: string;
  imageGen: boolean;
}

export interface Staged {
  staging: QuestStaging;
  reward: RewardSpec;
  confidence: number;
  /** From the AI: what new animations and foes should look like, for the image generator. */
  looks?: { animations: { label: string; description: string }[]; adversaries: { name: string; look: string }[] };
}

/** Instant, offline staging. */
export function stageBuiltIn(title: string, rewardText: string, archetypeOverride?: ArchetypeId): Staged {
  const c = classifyActivity(title);
  const archetype = archetypeOverride ?? ARCHETYPE_FOR_ACTIVITY[c.activity];
  const a = ARCHETYPES[archetype];
  const animations = a.heroActivity === 'fight' ? ['hero-ready', 'hero-attack', 'hero-hurt'] : [heroLabelFor(archetype), 'hero-hurt'];
  return {
    staging: {
      archetype,
      adversaries: a.adversaries,
      animations: [...animations, 'monster-idle', 'monster-attack', 'monster-hurt', 'monster-defeat'],
      source: 'built-in',
    },
    reward: builtInReward(title, archetype, rewardText, parseTarget(title)),
    confidence: archetypeOverride ? 1 : c.confidence,
  };
}

function heroLabelFor(id: ArchetypeId) {
  const act = ARCHETYPES[id].heroActivity;
  return BUILT_IN_ANIMATIONS.find((e) => e.builtIn?.heroActivity === act && e.label.startsWith('hero'))?.label ?? 'hero-ready';
}

// ---------- AI staging ----------

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['archetype', 'custom_scene', 'adversaries', 'animations', 'reward'],
  properties: {
    archetype: { type: 'string', enum: [...ALL_ARCHETYPES, 'custom'] },
    custom_scene: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'setting', 'hero_action', 'adversary_name', 'adversary_look', 'strike_verb', 'adversary_verb'],
      properties: {
        title: { type: 'string' },
        setting: { type: 'string' },
        hero_action: { type: 'string' },
        adversary_name: { type: 'string' },
        adversary_look: { type: 'string' },
        strike_verb: { type: 'string' },
        adversary_verb: { type: 'string' },
      },
    },
    adversaries: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'kind', 'look'],
        properties: { name: { type: 'string' }, kind: { type: 'string', enum: MONSTER_KINDS }, look: { type: 'string' } },
      },
    },
    animations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'description'],
        properties: { label: { type: 'string' }, description: { type: 'string' } },
      },
    },
    reward: {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'name', 'icon', 'description', 'delivery', 'boosts'],
      properties: {
        kind: { type: 'string', enum: REWARD_KINDS },
        name: { type: 'string' },
        icon: { type: 'string' },
        description: { type: 'string' },
        delivery: { type: 'string', enum: DELIVERIES },
        boosts: { type: 'string', enum: [...STAT_KEYS, 'none'] },
      },
    },
  },
} as const;

interface AiResult {
  archetype: ArchetypeId | 'custom';
  custom_scene: { title: string; setting: string; hero_action: string; adversary_name: string; adversary_look: string; strike_verb: string; adversary_verb: string };
  adversaries: { name: string; kind: MonsterKind; look: string }[];
  animations: { label: string; description: string }[];
  reward: { kind: RewardKind; name: string; icon: string; description: string; delivery: LootDelivery; boosts: StatKey | 'none' };
}

function systemPrompt(registry: AnimationEntry[]) {
  const types = ALL_ARCHETYPES.map((id) => `- ${id}: ${ARCHETYPES[id].name} (${ARCHETYPES[id].place}); foes like ${ARCHETYPES[id].adversaries.map((x) => x.name).join(', ')}`).join('\n');
  const labels = registry.map((e) => `- ${e.label}: ${e.description}`).join('\n');
  return `You stage real-life tasks as quests in a gentle fantasy game. The player's character is a small adventurer version of themselves. The game exists to make self-kindness explicit, so the tone is warm and playful, never shaming.

Pick the quest type that fits the real task best:
${types}
Only use "custom" when none of these fit; then describe a new scene in custom_scene. When you pick an existing type, still fill custom_scene with short flavour text for that type.

Foes stand for what makes the task hard (avoidance, clutter, worry, tedium). Give 1–3 adversaries with short playful names, a kind from the list, and a one-line visual description.

Animations: list the hero and monster animation labels this scene needs, as lowercase kebab-case labels starting with "hero-" or "monster-". Reuse these existing labels whenever one fits, since new ones cost an image generation:
${labels}

Reward: the player says what finishing the task gives them in real life. Turn that into one fitting in-game item: money becomes gold, peace of mind becomes a calming potion, a clean home becomes a hearth charm, and so on. The icon is a single emoji. "boosts" is the need a consumable reward restores, or "none".`;
}

/** Ask Claude to stage the quest. Throws with a readable message on failure. */
export async function stageWithAi(
  title: string,
  rewardText: string,
  settings: AiSettings,
  registry: AnimationEntry[],
): Promise<Staged> {
  if (!settings.apiKey) throw new Error('Add your Claude API key in More → AI helpers first.');
  // Loaded on demand so the app stays small and fast for people who don't use AI.
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  // The key belongs to the player and stays on their device; the browser talks to the API directly.
  const client = new Anthropic({ apiKey: settings.apiKey, dangerouslyAllowBrowser: true });
  let response;
  try {
    response = await client.beta.messages.create({
      model: settings.model,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA as unknown as Record<string, unknown> } },
      system: systemPrompt(registry),
      messages: [
        {
          role: 'user',
          content: `Task: ${title}\nWhat finishing it gives me in real life: ${rewardText.trim() || '(not given; infer something fitting)'}`,
        },
      ],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error('Claude rejected the API key. Check it in More → AI helpers.');
    if (e instanceof Anthropic.RateLimitError) throw new Error('Claude is busy right now. Try again in a minute.');
    if (e instanceof Anthropic.APIConnectionError) throw new Error('Couldn’t reach Claude. Check your connection.');
    if (e instanceof Anthropic.APIError) throw new Error(`Claude returned an error (${e.status}).`);
    throw e;
  }
  if (response.stop_reason === 'refusal') throw new Error('Claude declined to stage this quest. The built-in version is still used.');
  const text = response.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error('Claude sent an empty answer.');
  const r = JSON.parse(text.text) as AiResult;

  const archetype: ArchetypeId = r.archetype === 'custom' ? ARCHETYPE_FOR_ACTIVITY[classifyActivity(title).activity] : r.archetype;
  const base = ARCHETYPES[archetype];
  const hueFor = (name: string) => Math.abs([...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0)) % 360;
  const adversaries = (r.adversaries.length ? r.adversaries : base.adversaries.map((x) => ({ ...x, look: '' })))
    .slice(0, 3)
    .map((x) => ({ name: x.name.slice(0, 40), kind: MONSTER_KINDS.includes(x.kind) ? x.kind : 'slime', hue: hueFor(x.name), look: x.look }));
  const boost = r.reward.boosts !== 'none' ? { [r.reward.boosts]: 18, joy: r.reward.boosts === 'joy' ? 18 : 6 } : undefined;
  const fallback = builtInReward(title, archetype, rewardText, parseTarget(title));
  return {
    staging: {
      archetype,
      adversaries: adversaries.map(({ name, kind, hue }) => ({ name, kind, hue })),
      animations: r.animations.map((x) => x.label),
      customScene:
        r.archetype === 'custom'
          ? {
              title: r.custom_scene.title,
              setting: r.custom_scene.setting,
              heroAction: r.custom_scene.hero_action,
              adversaryName: r.custom_scene.adversary_name,
              adversaryLook: r.custom_scene.adversary_look,
              strikeVerb: r.custom_scene.strike_verb,
              adversaryVerb: r.custom_scene.adversary_verb,
            }
          : undefined,
      source: 'ai',
    },
    reward: {
      realWorld: rewardText.trim(),
      kind: r.reward.kind,
      name: r.reward.name.slice(0, 60),
      icon: [...r.reward.icon][0] ?? fallback.icon,
      description: r.reward.description.slice(0, 200),
      rarity: rarityFor(parseTarget(title), title.split(/\s+/).length),
      delivery: r.reward.delivery,
      amount: r.reward.kind === 'gold' ? fallback.amount ?? 25 : undefined,
      effect: boost,
      source: 'ai',
    },
    confidence: 1,
    looks: { animations: r.animations, adversaries: adversaries.map(({ name, look }) => ({ name, look })) },
  };
}

// ---------- Image generation (optional, free provider) ----------

const STYLE = 'cute chibi fantasy game sprite, full body, centered, simple flat shading, plain white background';

/**
 * The free service allows about one request at a time per person and sometimes
 * turns requests away, so images are made one by one with a few patient retries.
 */
async function generateImage(prompt: string, seed: number, attempts = 4): Promise<Blob> {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(`${prompt}, ${STYLE}`)}?width=256&height=256&nologo=true&seed=${seed}`;
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    if (i) await new Promise((r) => setTimeout(r, 2500 * 2 ** (i - 1)));
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      if (res.ok && blob.type.startsWith('image/')) return blob;
      lastError = new Error(`Image generator returned ${res.status}`);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Image generator unavailable');
}

/** Make (or reuse) portrait art for a foe. Returns its storage key. */
export async function ensureMonsterArt(name: string, look: string): Promise<string> {
  const key = assetKey('monster', name);
  if (await getImage(key)) return key;
  await putImage(key, await generateImage(`${name}, ${look || 'a small fantasy monster'}`, seedFor(name)));
  return key;
}

const seedFor = (s: string) => Math.abs([...s].reduce((h, c) => (h * 33 + c.charCodeAt(0)) | 0, 7)) % 100000;

export interface ResolvedAnimation {
  label: string;
  /** The animation actually used (an existing one when close enough). */
  entry: AnimationEntry;
  generated: boolean;
}

/**
 * Resolve the animations a quest asks for. Close matches reuse existing entries;
 * new ones get three frames from the image generator when it is switched on.
 */
export async function resolveAnimations(
  wanted: { label: string; description: string }[],
  registry: AnimationEntry[],
  imageGen: boolean,
): Promise<{ resolved: ResolvedAnimation[]; added: AnimationEntry[] }> {
  const resolved: ResolvedAnimation[] = [];
  const added: AnimationEntry[] = [];
  for (const w of wanted) {
    const all = [...registry, ...added];
    const exact = all.find((e) => e.label === w.label);
    const match = exact ? { entry: exact, score: 1 } : matchAnimation(`${w.label} ${w.description}`, all);
    if (match.score >= REUSE_THRESHOLD || !imageGen) {
      resolved.push({ label: w.label, entry: match.entry, generated: false });
      continue;
    }
    const poses = ['start of the motion', 'middle of the motion', 'end of the motion'];
    const keys: string[] = [];
    for (let i = 0; i < poses.length; i++) {
      const key = assetKey('anim', w.label, i);
      if (!(await getImage(key))) await putImage(key, await generateImage(`${w.description}, ${poses[i]}`, seedFor(w.label)));
      keys.push(key);
    }
    const entry = newGeneratedEntry(w.label, w.description, keys);
    added.push(entry);
    resolved.push({ label: w.label, entry, generated: true });
  }
  return { resolved, added };
}
