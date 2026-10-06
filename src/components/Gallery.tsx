import { Avatar } from '../avatar/Avatar';
import { ACTIVITY_INFO, ALL_ACTIVITIES } from '../game/classifier';
import { DEFAULT_APPEARANCE, randomAppearance } from '../avatar/options';
import type { Appearance, Mood } from '../types';

const MOODS: Mood[] = ['happy', 'okay', 'sad', 'tired', 'hungry', 'thirsty', 'lonely', 'sick', 'restless'];

/** Every animation and mood side by side (open the app with #gallery). */
export function Gallery({ appearance }: { appearance?: Appearance | null }) {
  const a = appearance ?? { ...DEFAULT_APPEARANCE, name: 'You' };
  const randoms = Array.from({ length: 8 }, () => randomAppearance());
  return (
    <div className="gallery">
      <h2>Activities</h2>
      <div className="gallery-grid">
        {ALL_ACTIVITIES.map((act) => (
          <figure key={act}>
            <Avatar appearance={a} activity={act} scene size={150} />
            <figcaption>{ACTIVITY_INFO[act].emoji} {ACTIVITY_INFO[act].label}</figcaption>
          </figure>
        ))}
      </div>
      <h2>Moods</h2>
      <div className="gallery-grid">
        {MOODS.map((m) => (
          <figure key={m}>
            <Avatar appearance={a} mood={m} scene size={150} />
            <figcaption>{m}</figcaption>
          </figure>
        ))}
      </div>
      <h2>Random people</h2>
      <div className="gallery-grid">
        {randoms.map((r, i) => (
          <figure key={i}>
            <Avatar appearance={r} scene size={150} />
          </figure>
        ))}
      </div>
    </div>
  );
}
