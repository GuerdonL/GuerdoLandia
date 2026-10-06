import { describe, expect, it } from 'vitest';
import { classifyActivity, parseTarget, stem } from '../game/classifier';

describe('classifyActivity', () => {
  const cases: [string, string][] = [
    ['Find 10 jobs to apply to', 'desk'],
    ['Finish my resume', 'desk'],
    ['Go for a 20 minute run', 'exercise'],
    ['Hit the gym', 'exercise'],
    ['Assemble the IKEA bookshelf', 'build'],
    ['Do the laundry and dishes', 'clean'],
    ['Deep clean the bathroom', 'clean'],
    ['Meditate for ten minutes', 'meditate'],
    ['Bake banana bread', 'cook'],
    ['Read 3 chapters of my book', 'read'],
    ['Call my sister', 'social'],
    ['Run errands: pharmacy and post office', 'walk'],
    ['Practice guitar', 'create'],
    ['Take a nap', 'sleep'],
  ];
  it.each(cases)('%s → %s', (text, expected) => {
    expect(classifyActivity(text).activity).toBe(expected);
  });

  it('falls back to desk for unknown text and idle for empty text', () => {
    expect(classifyActivity('zxqv blorp').activity).toBe('desk');
    expect(classifyActivity('').activity).toBe('idle');
  });

  it('stems inflections together', () => {
    expect(stem('applying')).toBe(stem('apply'));
    expect(stem('applied')).toBe(stem('apply'));
    expect(stem('running')).toBe(stem('run'));
    expect(stem('baking')).toBe(stem('bake'));
  });
});

describe('parseTarget', () => {
  it('finds counts', () => {
    expect(parseTarget('Find 10 jobs to apply to')).toBe(10);
    expect(parseTarget('Read three chapters')).toBe(3);
  });
  it('ignores durations and singular tasks', () => {
    expect(parseTarget('Run for 20 minutes')).toBeUndefined();
    expect(parseTarget('Call mom')).toBeUndefined();
    expect(parseTarget('Write a cover letter')).toBeUndefined();
  });
});
