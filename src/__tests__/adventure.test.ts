import { describe, expect, it } from 'vitest';
import { REUSE_THRESHOLD, matchAnimation } from '../adventure/animations';
import { builtInReward, rewardKindFor } from '../adventure/loot';
import { stageBuiltIn } from '../adventure/oracle';

describe('quest staging', () => {
  it('turns task types into different adventures', () => {
    expect(stageBuiltIn('Find 10 jobs to apply to', '').staging.archetype).toBe('battle');
    expect(stageBuiltIn('Meditate for ten minutes', '').staging.archetype).toBe('shrine');
    expect(stageBuiltIn('Deep clean the bathroom', '').staging.archetype).toBe('cleansing');
    expect(stageBuiltIn('Call my sister', '').staging.archetype).toBe('tavern');
  });
});

describe('rewards', () => {
  it('maps real-life rewards to item kinds', () => {
    expect(rewardKindFor('money')).toBe('gold');
    expect(rewardKindFor('peace of mind')).toBe('potion');
    expect(rewardKindFor('a clean home')).toBe('charm');
    expect(rewardKindFor('a nice coffee')).toBe('food');
  });

  it('builds items from the player’s words, with gold amounts and potion effects', () => {
    const gold = builtInReward('Go to work', 'battle', 'money');
    expect(gold).toMatchObject({ kind: 'gold', name: 'Pouch of Hard-Earned Gold' });
    expect(gold.amount).toBeGreaterThan(0);
    const potion = builtInReward('Meditate', 'shrine', 'peace of mind');
    expect(potion.name).toBe('Potion of Peace Of Mind');
    expect(potion.effect?.joy).toBeGreaterThan(0);
    expect(builtInReward('Meditate', 'shrine', '').kind).toBe('potion'); // quest-type default
  });
});

describe('animation registry', () => {
  it('reuses close matches instead of generating', () => {
    expect(matchAnimation('player-attack').entry.label).toBe('hero-attack');
    expect(matchAnimation('player ready stance').entry.label).toBe('hero-ready');
    expect(matchAnimation('monster-attack').entry.label).toBe('monster-attack');
    expect(matchAnimation('player-meditate').entry.label).toBe('hero-meditate');
    expect(matchAnimation('player-attack').score).toBeGreaterThanOrEqual(REUSE_THRESHOLD);
  });

  it('flags genuinely new animations', () => {
    expect(matchAnimation('hero-ride-griffin over mountains').score).toBeLessThan(REUSE_THRESHOLD);
  });
});
