import { describe, expect, it } from 'vitest';
import { INITIAL_STATS, alertsFor, applyEffect, decay, healthOf, moodOf } from '../game/stats';
import type { Stats } from '../types';

const all = (v: number): Stats => ({ fullness: v, hydration: v, energy: v, social: v, movement: v, joy: v });

describe('stats', () => {
  it('decays while awake and restores energy while asleep', () => {
    const awake = decay(INITIAL_STATS, 3 * 3_600_000, false);
    expect(awake.fullness).toBeLessThan(INITIAL_STATS.fullness);
    expect(awake.energy).toBeLessThan(INITIAL_STATS.energy);
    const asleep = decay(all(20), 8 * 3_600_000, true);
    expect(asleep.energy).toBe(100);
    expect(asleep.social).toBe(20);
  });

  it('clamps effects to 0..100', () => {
    expect(applyEffect(all(90), { fullness: 45 }).fullness).toBe(100);
    expect(applyEffect(all(5), { energy: -20 }).energy).toBe(0);
  });

  it('derives health', () => {
    expect(healthOf(all(90), false)).toBe('excellent');
    expect(healthOf(all(55), false)).toBe('normal');
    expect(healthOf(all(20), false)).toBe('poor');
    expect(healthOf(all(90), true)).toBe('unwell');
  });

  it('picks the most pressing need as the mood and raises alerts', () => {
    const s = { ...all(80), social: 10 };
    expect(moodOf(s, healthOf(s, false), false)).toBe('lonely');
    const alerts = alertsFor(s, healthOf(s, false), false);
    expect(alerts[0]).toMatchObject({ stat: 'social', severity: 'urgent' });
    expect(alertsFor(s, 'normal', true)).toEqual([]);
  });
});
