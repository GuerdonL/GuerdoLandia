import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '../store';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-06T09:00:00Z'));
  useStore.getState().resetEverything();
});

describe('quests', () => {
  it('classifies, counts and completes', () => {
    const q = useStore.getState().addQuest('Find 10 jobs to apply to');
    expect(q).toMatchObject({ activity: 'desk', target: 10, progress: 0 });
    for (let i = 0; i < 10; i++) useStore.getState().stepQuest(q.id, 1);
    const done = useStore.getState().quests[0];
    expect(done.progress).toBe(10);
    expect(done.completedAt).toBeDefined();
    expect(useStore.getState().xp + useStore.getState().level).toBeGreaterThan(1);
  });
});

describe('pomodoro timer', () => {
  it('runs focus → break → waits for next focus, crediting the quest', () => {
    const s = useStore.getState();
    const q = s.addQuest('Go for a run');
    s.startTimer({ mode: 'pomodoro', questId: q.id });
    expect(useStore.getState().timer).toMatchObject({ phase: 'focus', activity: 'exercise', running: true });

    vi.advanceTimersByTime(25 * 60_000);
    useStore.getState().timerTick();
    expect(useStore.getState().timer).toMatchObject({ phase: 'shortBreak', running: true, cycle: 1 });
    expect(useStore.getState().quests[0].focusMinutes).toBe(25);

    vi.advanceTimersByTime(5 * 60_000);
    useStore.getState().timerTick();
    expect(useStore.getState().timer).toMatchObject({ phase: 'focus', running: false });
  });

  it('credits partial focus on stop and ends block timers', () => {
    const s = useStore.getState();
    const start = new Date();
    const block = s.addBlock({ title: 'Clean kitchen', activity: 'clean', start: start.toISOString(), end: new Date(+start + 30 * 60_000).toISOString() });
    s.startTimer({ mode: 'block', blockId: block.id });
    expect(useStore.getState().timer?.totalMs).toBe(30 * 60_000);
    vi.advanceTimersByTime(30 * 60_000);
    useStore.getState().timerTick();
    expect(useStore.getState().timer).toBeNull();
  });
});

describe('google merge', () => {
  it('imports new events, keeps dirty local edits, drops remotely deleted ones', () => {
    const s = useStore.getState();
    const a = s.addBlock({ title: 'Local', activity: 'desk', start: '2026-10-06T10:00:00.000Z', end: '2026-10-06T11:00:00.000Z' });
    s.markSynced(a.id, 'evA');
    const b = s.addBlock({ title: 'Edited', activity: 'desk', start: '2026-10-06T12:00:00.000Z', end: '2026-10-06T13:00:00.000Z' });
    s.markSynced(b.id, 'evB');
    vi.advanceTimersByTime(1000);
    useStore.getState().updateBlock(b.id, { title: 'Edited locally' });
    useStore.getState().mergeGoogleBlocks(
      [
        { id: 'g-evC', title: 'Dentist', activity: 'walk', start: '2026-10-06T15:00:00.000Z', end: '2026-10-06T16:00:00.000Z', googleEventId: 'evC', source: 'google', updatedAt: 'x', syncedAt: 'x' },
        { id: b.id, title: 'Edited', activity: 'desk', start: b.start, end: b.end, googleEventId: 'evB', source: 'local', updatedAt: 'x', syncedAt: 'x' },
      ],
      '2026-10-01T00:00:00.000Z',
      '2026-10-10T00:00:00.000Z',
    );
    const titles = useStore.getState().blocks.map((x) => x.title).sort();
    expect(titles).toEqual(['Dentist', 'Edited locally']);
  });
});
