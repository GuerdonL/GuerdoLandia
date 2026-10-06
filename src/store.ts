import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Activity,
  Appearance,
  LogEntry,
  PomodoroSettings,
  Quest,
  Stats,
  TimeBlock,
  TimerPhase,
  TimerState,
} from './types';
import {
  ACTIVITY_EFFECT_PER_MIN,
  CARE_ACTIONS,
  INITIAL_STATS,
  applyEffect,
  decay,
  xpForLevel,
} from './game/stats';
import { classifyActivity, parseTarget } from './game/classifier';
import type { AnimationEntry, ArchetypeId, Encounter, InventoryItem } from './adventure/types';
import { createEncounter, setProgress as encounterSetProgress, thumbsDown, thumbsUp } from './adventure/combat';
import { ARCHETYPE_FOR_ACTIVITY, ARCHETYPES } from './adventure/archetypes';
import { ensureMonsterArt, resolveAnimations, stageBuiltIn, stageWithAi, type AiSettings } from './adventure/oracle';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const XP = { care: 8, questDone: 30, countStep: 3, perFocusMin: 0.5 };

export interface AppState {
  appearance: Appearance | null;
  stats: Stats;
  lastTick: number;
  asleep: boolean;
  feelingSick: boolean;
  xp: number;
  level: number;
  quests: Quest[];
  blocks: TimeBlock[];
  /** Google event ids whose local block was deleted and still need deleting remotely. */
  pendingGoogleDeletes: string[];
  timer: TimerState | null;
  pomodoro: PomodoroSettings;
  log: LogEntry[];
  googleClientId: string;
  notifications: boolean;
  /** Bumped when something celebratory happens so the UI can react. */
  celebrate: { at: number; text: string } | null;

  // --- Adventure ---
  encounters: Record<string, Encounter>;
  inventory: InventoryItem[];
  gold: number;
  /** Animations made by the image generator (built-ins live in code). */
  generatedAnimations: AnimationEntry[];
  /** Foe name → stored portrait key. */
  monsterArt: Record<string, string>;
  ai: AiSettings;
  /** Time blocks that already started an adventure on their own. */
  autoStartedBlocks: string[];
  /** Loot being shown in the reward ceremony. */
  lootReveal: InventoryItem | null;

  setAppearance: (a: Appearance) => void;
  tick: (now?: number) => void;
  care: (actionId: string) => void;
  toggleSleep: () => void;
  setSick: (sick: boolean) => void;

  addQuest: (title: string, activity?: Activity, rewardText?: string) => Quest;
  updateQuest: (id: string, patch: Partial<Quest>) => void;
  stepQuest: (id: string, delta: number) => void;
  completeQuest: (id: string) => void;
  reopenQuest: (id: string) => void;
  deleteQuest: (id: string) => void;
  /** Re-stage a quest after its title, reward or quest type changed. */
  restageQuest: (id: string, opts?: { rewardText?: string; archetype?: ArchetypeId }) => void;
  /** Ask the AI to stage the quest (and generate art if switched on). */
  /** Resolves with how many pictures could not be generated. */
  restageQuestWithAi: (id: string) => Promise<{ imagesFailed: number }>;

  ensureEncounter: (questId: string) => Encounter | undefined;
  heroStrike: (questId: string) => void;
  monsterStrike: (questId: string) => void;
  setQuestProgress: (questId: string, pct: number) => void;
  useItem: (itemId: string) => void;
  dismissLoot: () => void;
  setAi: (patch: Partial<AiSettings>) => void;
  markAutoStarted: (blockId: string) => void;

  addBlock: (b: Omit<TimeBlock, 'id' | 'updatedAt' | 'source'> & Partial<Pick<TimeBlock, 'source'>>) => TimeBlock;
  updateBlock: (id: string, patch: Partial<TimeBlock>) => void;
  deleteBlock: (id: string) => void;
  mergeGoogleBlocks: (incoming: TimeBlock[], rangeStart: string, rangeEnd: string) => void;
  markSynced: (localId: string, googleEventId: string) => void;
  clearPendingDeletes: (ids: string[]) => void;

  startTimer: (opts: { mode: TimerState['mode']; questId?: string; blockId?: string; minutes?: number; activity?: Activity; label?: string }) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  skipPhase: () => void;
  timerTick: (now?: number) => void;

  setPomodoro: (p: Partial<PomodoroSettings>) => void;
  setGoogleClientId: (id: string) => void;
  setNotifications: (on: boolean) => void;
  resetEverything: () => void;
}

function addXp(state: Pick<AppState, 'xp' | 'level'>, amount: number) {
  let { xp, level } = state;
  xp += amount;
  let leveled = false;
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level += 1;
    leveled = true;
  }
  return { xp, level, leveled };
}

const logLine = (log: LogEntry[], text: string) => [{ at: new Date().toISOString(), text }, ...log].slice(0, 100);

function phaseMinutes(p: PomodoroSettings, phase: TimerPhase) {
  return phase === 'focus' ? p.focusMin : phase === 'shortBreak' ? p.shortBreakMin : p.longBreakMin;
}

const initialData = () => ({
  appearance: null,
  stats: INITIAL_STATS,
  lastTick: Date.now(),
  asleep: false,
  feelingSick: false,
  xp: 0,
  level: 1,
  quests: [] as Quest[],
  blocks: [] as TimeBlock[],
  pendingGoogleDeletes: [] as string[],
  timer: null,
  pomodoro: { focusMin: 25, shortBreakMin: 5, longBreakMin: 15, cyclesBeforeLong: 4 },
  log: [] as LogEntry[],
  googleClientId: (import.meta.env?.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '',
  notifications: false,
  celebrate: null,
  encounters: {} as Record<string, Encounter>,
  inventory: [] as InventoryItem[],
  gold: 0,
  generatedAnimations: [] as AnimationEntry[],
  monsterArt: {} as Record<string, string>,
  ai: { apiKey: '', model: 'claude-opus-5-5', imageGen: false } as AiSettings,
  autoStartedBlocks: [] as string[],
  lootReveal: null as InventoryItem | null,
});

export const useStore = create<AppState>()(
  persist(
    (set, get) => {
      /** Credit focused minutes to stats, the quest and XP. */
      const creditFocus = (minutes: number) => {
        const s = get();
        const t = s.timer;
        if (!t || minutes <= 0) return;
        const effect = ACTIVITY_EFFECT_PER_MIN[t.activity];
        const stats = effect ? applyEffect(s.stats, effect, minutes) : s.stats;
        const quests = t.questId
          ? s.quests.map((q) => (q.id === t.questId ? { ...q, focusMinutes: q.focusMinutes + minutes } : q))
          : s.quests;
        const { xp, level, leveled } = addXp(s, Math.round(minutes * XP.perFocusMin));
        set({
          stats,
          quests,
          xp,
          level,
          log: logLine(s.log, `Focused ${Math.round(minutes)} min on “${t.label}”`),
          celebrate: leveled ? { at: Date.now(), text: `Level ${level}!` } : s.celebrate,
        });
      };

      const elapsedFocusMin = (t: TimerState, now: number) => {
        if (t.phase !== 'focus') return 0;
        const remaining = t.running && t.endsAt ? Math.max(0, t.endsAt - now) : t.remainingMs;
        return (t.totalMs - remaining) / 60_000;
      };

      /** Move the timer to its next phase (or finish it). Focus time must already be credited. */
      const advance = (now: number) => {
        const s = get();
        const t = s.timer;
        if (!t) return;
        if (t.mode !== 'pomodoro') {
          set({ timer: null, celebrate: { at: now, text: 'Time block complete!' } });
          return;
        }
        let phase: TimerPhase;
        let cycle = t.cycle;
        if (t.phase === 'focus') {
          cycle += 1;
          phase = cycle % s.pomodoro.cyclesBeforeLong === 0 ? 'longBreak' : 'shortBreak';
        } else phase = 'focus';
        const totalMs = phaseMinutes(s.pomodoro, phase) * 60_000;
        // Breaks start on their own; the next focus waits for you to press start.
        const running = phase !== 'focus';
        set({
          timer: { ...t, phase, cycle, totalMs, remainingMs: totalMs, running, endsAt: running ? now + totalMs : undefined },
          celebrate: { at: now, text: phase === 'focus' ? 'Break over — start when you are ready' : 'Nice focus! Take a break' },
        });
      };

      return {
        ...initialData(),

        setAppearance: (appearance) => set({ appearance }),

        tick: (now = Date.now()) => {
          const s = get();
          const elapsed = now - s.lastTick;
          if (elapsed < 1000) return;
          set({ stats: decay(s.stats, elapsed, s.asleep), lastTick: now });
        },

        care: (actionId) => {
          get().tick();
          const s = get();
          const action = CARE_ACTIONS.find((a) => a.id === actionId);
          if (!action) return;
          const { xp, level, leveled } = addXp(s, XP.care);
          set({
            stats: applyEffect(s.stats, action.effect),
            xp,
            level,
            log: logLine(s.log, `${action.emoji} ${action.label}`),
            celebrate: { at: Date.now(), text: leveled ? `Level ${level}!` : `+${XP.care} kindness` },
          });
        },

        toggleSleep: () => {
          get().tick();
          const s = get();
          if (!s.asleep) set({ asleep: true, log: logLine(s.log, '🌙 Went to bed') });
          else {
            const { xp, level } = addXp(s, XP.care);
            set({ asleep: false, xp, level, log: logLine(s.log, '☀️ Woke up') });
          }
        },

        setSick: (feelingSick) => set((s) => ({ feelingSick, log: logLine(s.log, feelingSick ? '🤒 Feeling unwell' : '💪 Feeling better') })),

        addQuest: (title, activity, rewardText = '') => {
          const c = classifyActivity(title);
          const act = activity ?? c.activity;
          const staged = stageBuiltIn(title, rewardText, activity ? ARCHETYPE_FOR_ACTIVITY[activity] : undefined);
          const quest: Quest = {
            id: uid(),
            title: title.trim(),
            activity: act,
            activityLocked: !!activity,
            target: parseTarget(title),
            progress: 0,
            focusMinutes: 0,
            createdAt: new Date().toISOString(),
            rewardText: rewardText.trim(),
            reward: staged.reward,
            staging: staged.staging,
            progressPct: 0,
          };
          set((s) => ({ quests: [quest, ...s.quests], log: logLine(s.log, `📜 New quest: ${quest.title}`) }));
          // A weak guess gets a second opinion from the AI, when it's set up.
          if (staged.confidence < 0.35 && get().ai.apiKey) void get().restageQuestWithAi(quest.id).catch(() => undefined);
          return quest;
        },

        updateQuest: (id, patch) => set((s) => ({ quests: s.quests.map((q) => (q.id === id ? { ...q, ...patch } : q)) })),

        stepQuest: (id, delta) => {
          const s = get();
          const q = s.quests.find((x) => x.id === id);
          if (!q || !q.target) return;
          const progress = Math.max(0, Math.min(q.target, q.progress + delta));
          if (progress === q.progress) return;
          const gained = delta > 0 ? XP.countStep : 0;
          const { xp, level } = addXp(s, gained);
          set({ quests: s.quests.map((x) => (x.id === id ? { ...x, progress } : x)), xp, level });
          // The counter also moves the self-reported percentage (and the fight with it).
          get().setQuestProgress(id, Math.round(((progress / q.target) * 100) / 10) * 10);
        },

        completeQuest: (id) => {
          const s = get();
          const q = s.quests.find((x) => x.id === id);
          if (!q || q.completedAt) return;
          const { xp, level, leveled } = addXp(s, XP.questDone);
          const reward = q.reward ?? stageBuiltIn(q.title, q.rewardText ?? '').reward;
          const item: InventoryItem = { ...reward, id: uid(), questId: q.id, questTitle: q.title, wonAt: new Date().toISOString() };
          const enc = s.encounters[id];
          set({
            quests: s.quests.map((x) =>
              x.id === id ? { ...x, completedAt: new Date().toISOString(), progress: x.target ?? x.progress, progressPct: 100 } : x,
            ),
            encounters: enc ? { ...s.encounters, [id]: encounterSetProgress(enc, 100, enc.monsters[0] ?? ARCHETYPES[enc.archetype].adversaries[0]) } : s.encounters,
            stats: applyEffect(s.stats, { joy: 12 }),
            xp,
            level,
            gold: s.gold + (item.amount ?? 0),
            inventory: [item, ...s.inventory],
            lootReveal: item,
            log: logLine(s.log, `🏆 Completed: ${q.title} · won ${item.icon} ${item.name}`),
            celebrate: { at: Date.now(), text: leveled ? `Quest complete — Level ${level}!` : `Quest complete! +${XP.questDone} XP` },
          });
        },

        reopenQuest: (id) => set((s) => ({ quests: s.quests.map((q) => (q.id === id ? { ...q, completedAt: undefined } : q)) })),

        restageQuest: (id, opts = {}) => {
          const q = get().quests.find((x) => x.id === id);
          if (!q) return;
          const rewardText = opts.rewardText ?? q.rewardText ?? '';
          const archetype = opts.archetype ?? (q.activityLocked ? ARCHETYPE_FOR_ACTIVITY[q.activity] : undefined);
          const staged = stageBuiltIn(q.title, rewardText, archetype);
          get().updateQuest(id, { rewardText, reward: staged.reward, staging: staged.staging });
          // A new staging starts a fresh fight at the current progress.
          set((s) => {
            const { [id]: _old, ...rest } = s.encounters;
            return { encounters: rest };
          });
        },

        restageQuestWithAi: async (id) => {
          const s = get();
          const q = s.quests.find((x) => x.id === id);
          if (!q) return { imagesFailed: 0 };
          let imagesFailed = 0;
          const { BUILT_IN_ANIMATIONS } = await import('./adventure/animations');
          const registry = [...BUILT_IN_ANIMATIONS, ...s.generatedAnimations];
          const staged = await stageWithAi(q.title, q.rewardText ?? '', s.ai, registry);
          let added: AnimationEntry[] = [];
          const art: Record<string, string> = {};
          if (s.ai.imageGen && staged.looks) {
            // Generation is slow and best-effort: built-in visuals cover anything that fails.
            for (const a of staged.looks.adversaries) {
              try {
                art[a.name] = await ensureMonsterArt(a.name, a.look);
              } catch {
                imagesFailed++; // This foe keeps its built-in look.
              }
            }
            try {
              added = (await resolveAnimations(staged.looks.animations, registry, true)).added;
            } catch {
              imagesFailed++; // Built-in animations stand in.
            }
          }
          set((st) => {
            const { [id]: _old, ...rest } = st.encounters;
            return {
              quests: st.quests.map((x) => (x.id === id ? { ...x, staging: staged.staging, reward: staged.reward } : x)),
              generatedAnimations: [...st.generatedAnimations, ...added],
              monsterArt: { ...st.monsterArt, ...art },
              encounters: rest,
            };
          });
          return { imagesFailed };
        },

        ensureEncounter: (questId) => {
          const s = get();
          const existing = s.encounters[questId];
          if (existing) return existing;
          const q = s.quests.find((x) => x.id === questId);
          if (!q) return undefined;
          const staging = q.staging ?? stageBuiltIn(q.title, q.rewardText ?? '').staging;
          const enc = createEncounter(questId, staging.archetype, staging.adversaries, q.progressPct ?? 0);
          const withArt = { ...enc, monsters: enc.monsters.map((m) => ({ ...m, artKey: s.monsterArt[m.name] })) };
          set({ encounters: { ...s.encounters, [questId]: withArt } });
          return withArt;
        },

        heroStrike: (questId) => {
          const enc = get().ensureEncounter(questId);
          if (enc) set((s) => ({ encounters: { ...s.encounters, [questId]: thumbsUp(enc) } }));
        },

        monsterStrike: (questId) => {
          const enc = get().ensureEncounter(questId);
          if (enc) set((s) => ({ encounters: { ...s.encounters, [questId]: thumbsDown(enc) } }));
        },

        setQuestProgress: (questId, pct) => {
          const s = get();
          const q = s.quests.find((x) => x.id === questId);
          if (!q) return;
          const enc = s.encounters[questId];
          let encounters = s.encounters;
          if (enc) {
            const pool = q.staging?.adversaries ?? ARCHETYPES[enc.archetype].adversaries;
            // Reinforcements take turns from the quest's list of foes.
            const reinforcement = pool[enc.monsters.length % pool.length];
            const next = encounterSetProgress(enc, pct, reinforcement);
            encounters = {
              ...s.encounters,
              [questId]: { ...next, monsters: next.monsters.map((m) => ({ ...m, artKey: m.artKey ?? s.monsterArt[m.name] })) },
            };
          }
          set({ encounters, quests: s.quests.map((x) => (x.id === questId ? { ...x, progressPct: Math.max(0, Math.min(100, pct)) } : x)) });
        },

        useItem: (itemId) => {
          const s = get();
          const item = s.inventory.find((i) => i.id === itemId);
          if (!item || item.usedAt || !item.effect) return;
          set({
            stats: applyEffect(s.stats, item.effect),
            inventory: s.inventory.map((i) => (i.id === itemId ? { ...i, usedAt: new Date().toISOString() } : i)),
            log: logLine(s.log, `${item.icon} Used ${item.name}`),
            celebrate: { at: Date.now(), text: `${item.icon} ${item.name} used` },
          });
        },

        dismissLoot: () => set({ lootReveal: null }),
        setAi: (patch) => set((s) => ({ ai: { ...s.ai, ...patch } })),
        markAutoStarted: (blockId) => set((s) => ({ autoStartedBlocks: [...s.autoStartedBlocks, blockId].slice(-200) })),

        deleteQuest: (id) =>
          set((s) => ({
            quests: s.quests.filter((q) => q.id !== id),
            blocks: s.blocks.map((b) => (b.questId === id ? { ...b, questId: undefined } : b)),
          })),

        addBlock: (b) => {
          const block: TimeBlock = { source: 'local', ...b, id: uid(), updatedAt: new Date().toISOString() };
          set((s) => ({ blocks: [...s.blocks, block] }));
          return block;
        },

        updateBlock: (id, patch) =>
          set((s) => ({
            blocks: s.blocks.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: new Date().toISOString() } : b)),
          })),

        deleteBlock: (id) =>
          set((s) => {
            const b = s.blocks.find((x) => x.id === id);
            return {
              blocks: s.blocks.filter((x) => x.id !== id),
              pendingGoogleDeletes: b?.googleEventId ? [...s.pendingGoogleDeletes, b.googleEventId] : s.pendingGoogleDeletes,
            };
          }),

        mergeGoogleBlocks: (incoming, rangeStart, rangeEnd) =>
          set((s) => {
            const byEvent = new Map(incoming.map((b) => [b.googleEventId!, b]));
            const inRange = (b: TimeBlock) => b.start < rangeEnd && b.end > rangeStart;
            const blocks: TimeBlock[] = [];
            for (const b of s.blocks) {
              const remote = b.googleEventId ? byEvent.get(b.googleEventId) : undefined;
              if (remote) {
                byEvent.delete(b.googleEventId!);
                // Local edits made since the last sync win; otherwise take Google's version.
                const dirty = !b.syncedAt || b.updatedAt > b.syncedAt;
                blocks.push(
                  dirty
                    ? b
                    : { ...b, title: remote.title, start: remote.start, end: remote.end, syncedAt: remote.syncedAt, updatedAt: remote.syncedAt! },
                );
              } else if (b.googleEventId && inRange(b) && b.syncedAt && b.updatedAt <= b.syncedAt) {
                // Deleted on Google's side: drop it locally too.
              } else blocks.push(b);
            }
            const pending = new Set(s.pendingGoogleDeletes);
            for (const b of byEvent.values()) if (!pending.has(b.googleEventId!)) blocks.push(b);
            return { blocks };
          }),

        markSynced: (localId, googleEventId) =>
          set((s) => {
            const now = new Date().toISOString();
            return { blocks: s.blocks.map((b) => (b.id === localId ? { ...b, googleEventId, syncedAt: now, updatedAt: now } : b)) };
          }),

        clearPendingDeletes: (ids) => set((s) => ({ pendingGoogleDeletes: s.pendingGoogleDeletes.filter((x) => !ids.includes(x)) })),

        startTimer: ({ mode, questId, blockId, minutes, activity, label }) => {
          const s = get();
          if (s.timer) get().stopTimer();
          const quest = questId ? s.quests.find((q) => q.id === questId) : undefined;
          const block = blockId ? s.blocks.find((b) => b.id === blockId) : undefined;
          let totalMs: number;
          if (mode === 'block' && block) {
            const end = new Date(block.end).getTime();
            const start = new Date(block.start).getTime();
            const now = Date.now();
            totalMs = now > start && now < end ? end - now : end - start;
          } else if (mode === 'free') totalMs = (minutes ?? 30) * 60_000;
          else totalMs = phaseMinutes(s.pomodoro, 'focus') * 60_000;
          const now = Date.now();
          set({
            asleep: false,
            timer: {
              mode,
              phase: 'focus',
              questId: questId ?? block?.questId,
              blockId,
              activity: activity ?? block?.activity ?? quest?.activity ?? 'desk',
              label: label ?? block?.title ?? quest?.title ?? 'Focus time',
              endsAt: now + totalMs,
              remainingMs: totalMs,
              totalMs,
              running: true,
              cycle: 0,
            },
          });
        },

        pauseTimer: () => {
          const t = get().timer;
          if (!t || !t.running) return;
          set({ timer: { ...t, running: false, remainingMs: Math.max(0, (t.endsAt ?? Date.now()) - Date.now()), endsAt: undefined } });
        },

        resumeTimer: () => {
          const t = get().timer;
          if (!t || t.running) return;
          set({ timer: { ...t, running: true, endsAt: Date.now() + t.remainingMs } });
        },

        stopTimer: () => {
          const t = get().timer;
          if (!t) return;
          const mins = elapsedFocusMin(t, Date.now());
          if (mins >= 1) creditFocus(mins);
          set({ timer: null });
        },

        skipPhase: () => {
          const t = get().timer;
          if (!t) return;
          if (t.phase === 'focus') {
            const mins = elapsedFocusMin(t, Date.now());
            if (mins >= 1) creditFocus(mins);
          }
          advance(Date.now());
        },

        timerTick: (now = Date.now()) => {
          const t = get().timer;
          if (!t || !t.running || !t.endsAt || t.endsAt > now) return;
          if (t.phase === 'focus') creditFocus(t.totalMs / 60_000);
          advance(now);
        },

        setPomodoro: (p) => set((s) => ({ pomodoro: { ...s.pomodoro, ...p } })),
        setGoogleClientId: (googleClientId) => set({ googleClientId: googleClientId.trim() }),
        setNotifications: (notifications) => set({ notifications }),
        resetEverything: () => set({ ...initialData(), lastTick: Date.now() }),
      };
    },
    {
      name: 'guerdolandia',
      version: 2,
      // v1 → v2: quests gain fantasy staging and rewards.
      migrate: (persisted, version) => {
        const state = persisted as AppState;
        if (version < 2 && state?.quests) {
          state.quests = state.quests.map((q) => {
            const staged = stageBuiltIn(q.title, '', q.activityLocked ? ARCHETYPE_FOR_ACTIVITY[q.activity] : undefined);
            return { ...q, rewardText: '', reward: staged.reward, staging: staged.staging, progressPct: q.target ? Math.round((q.progress / q.target) * 10) * 10 : 0 };
          });
        }
        return state;
      },
      partialize: (s) => {
        const { celebrate, lootReveal, ...rest } = s;
        return rest;
      },
    },
  ),
);
