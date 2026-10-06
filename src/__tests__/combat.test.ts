import { describe, expect, it } from 'vitest';
import { createEncounter, remainingHp, setProgress, targetHp, thumbsDown, thumbsUp } from '../adventure/combat';
import type { AdversaryTemplate } from '../adventure/types';

const foes: AdversaryTemplate[] = [
  { name: 'Goblin', kind: 'goblin', hue: 100 },
  { name: 'Slime', kind: 'slime', hue: 140 },
];
const reinforcement: AdversaryTemplate = { name: 'Bat', kind: 'bat', hue: 270 };
const tap = (n: number, e = createEncounter('q', 'battle', foes)) => {
  for (let i = 0; i < n; i++) e = thumbsUp(e);
  return e;
};

describe('encounter', () => {
  it('starts with HP equal to the work left', () => {
    expect(remainingHp(createEncounter('q', 'battle', foes))).toBeCloseTo(100, 0);
    expect(remainingHp(createEncounter('q', 'battle', foes, 40))).toBeCloseTo(60, 0);
  });

  it('thumbs up cannot push HP below what progress allows', () => {
    let e = tap(200);
    expect(remainingHp(e)).toBeGreaterThanOrEqual(targetHp(e) - 0.01);
    expect(remainingHp(e)).toBeCloseTo(100, 0); // 0% progress: nothing to take off
    expect(e.lastEvent?.type).toBe('glance');

    e = setProgress(e, 50, reinforcement);
    e = tap(200, e);
    expect(remainingHp(e)).toBeCloseTo(50, 0);
    expect(e.status).toBe('active');
  });

  it('hits have diminishing returns as HP nears the progress line', () => {
    const e0 = setProgress(createEncounter('q', 'battle', foes), 60, reinforcement);
    const e1 = thumbsUp(e0);
    const e2 = thumbsUp(e1);
    const first = remainingHp(e0) - remainingHp(e1);
    const second = remainingHp(e1) - remainingHp(e2);
    expect(first).toBeGreaterThan(second);
  });

  it('reaching 100% defeats every monster', () => {
    const e = setProgress(createEncounter('q', 'battle', foes), 100, reinforcement);
    expect(e.status).toBe('cleared');
    expect(remainingHp(e)).toBe(0);
  });

  it('moving progress back summons a monster with x·(y−y′)/(1−y) HP', () => {
    // At 50%, foes worn down to exactly 50 HP. Setting back to 30% adds 50·(0.5−0.3)/(1−0.5) = 20.
    let e = setProgress(createEncounter('q', 'battle', foes), 50, reinforcement);
    e = tap(300, e);
    const x = remainingHp(e);
    e = setProgress(e, 30, reinforcement);
    const added = e.monsters[e.monsters.length - 1];
    expect(added.name).toBe('Bat');
    expect(added.maxHp).toBeCloseTo((x * 0.2) / 0.5, 0);
    expect(remainingHp(e)).toBeCloseTo(70, 0);
  });

  it('moving back from 100% brings back the work left', () => {
    let e = setProgress(createEncounter('q', 'battle', foes), 100, reinforcement);
    e = setProgress(e, 80, reinforcement);
    expect(e.status).toBe('active');
    expect(remainingHp(e)).toBeCloseTo(20, 0);
  });

  it('thumbs down hurts the hero, and a knockdown just gets them back up', () => {
    let e = createEncounter('q', 'battle', foes);
    e = thumbsDown(e, () => 0.5);
    expect(e.heroHp).toBeLessThan(100);
    for (let i = 0; i < 20; i++) e = thumbsDown(e, () => 0.99);
    expect(e.heroHp).toBeGreaterThan(0);
    expect(e.log.some((l) => l.includes('stand back up'))).toBe(true);
    expect(remainingHp(e)).toBeCloseTo(100, 0); // monsters untouched
  });
});
