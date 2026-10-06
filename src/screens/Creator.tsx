import { useState } from 'react';
import { Avatar } from '../avatar/Avatar';
import { CLOTHES_COLORS, DEFAULT_APPEARANCE, EYE_COLORS, FEATURE_OPTIONS, HAIR_COLORS, SKIN_TONES, randomAppearance } from '../avatar/options';
import { useStore } from '../store';
import type { Appearance } from '../types';

type Section = 'face' | 'hair' | 'eyes' | 'features' | 'extras' | 'body';
const SECTIONS: { id: Section; label: string }[] = [
  { id: 'face', label: 'Face' },
  { id: 'hair', label: 'Hair' },
  { id: 'eyes', label: 'Eyes' },
  { id: 'features', label: 'Nose & mouth' },
  { id: 'extras', label: 'Extras' },
  { id: 'body', label: 'Body' },
];

const LABELS: Record<string, string> = {
  dot: 'Dots', none: 'None', side: 'Side part', bob: 'Bob', locs: 'Locs', round: 'Round', oval: 'Oval',
};
const nice = (v: string) => LABELS[v] ?? v.charAt(0).toUpperCase() + v.slice(1);

export function Creator({ onDone, firstTime }: { onDone: () => void; firstTime: boolean }) {
  const saved = useStore((s) => s.appearance);
  const setAppearance = useStore((s) => s.setAppearance);
  const [a, setA] = useState<Appearance>(saved ?? DEFAULT_APPEARANCE);
  const [section, setSection] = useState<Section>('face');
  const [preview, setPreview] = useState<'idle' | 'exercise' | 'desk'>('idle');
  const set = <K extends keyof Appearance>(k: K, v: Appearance[K]) => setA((p) => ({ ...p, [k]: v }));

  // A row of mini avatars, one per option, so you can see what you're picking.
  const options = <K extends keyof typeof FEATURE_OPTIONS>(key: K & keyof Appearance, title: string, zoom = true) => (
    <div className="opt-group">
      <h3>{title}</h3>
      <div className="opt-row">
        {FEATURE_OPTIONS[key].map((v) => (
          <button key={v} className={`opt ${a[key] === v ? 'selected' : ''}`} onClick={() => set(key, v as Appearance[typeof key])} aria-pressed={a[key] === v}>
            <Avatar appearance={{ ...a, [key]: v }} size="100%" className="still" crop={zoom ? 'head' : undefined} />
            <span>{nice(v)}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const swatches = (key: keyof Appearance, title: string, colors: string[]) => (
    <div className="opt-group">
      <h3>{title}</h3>
      <div className="swatches">
        {colors.map((c) => (
          <button
            key={c}
            className={`swatch ${a[key] === c ? 'selected' : ''}`}
            style={{ background: c }}
            onClick={() => set(key, c as never)}
            aria-label={`${title} ${c}`}
            aria-pressed={a[key] === c}
          />
        ))}
        <label className="swatch custom" title="Custom colour">
          <input type="color" value={a[key] as string} onChange={(e) => set(key, e.target.value as never)} />
          🎨
        </label>
      </div>
    </div>
  );

  return (
    <div className="screen creator">
      {firstTime && (
        <div className="card welcome">
          <h1>Welcome 💜</h1>
          <p>
            This little person is <em>you</em>. When you look after them — eating, resting, reaching out, moving — you're
            looking after yourself. Let's make them look like you.
          </p>
        </div>
      )}
      <div className="creator-layout">
        <div className="card creator-preview">
          <Avatar appearance={a} activity={preview} scene size="100%" />
          <div className="row gap center">
            {(['idle', 'exercise', 'desk'] as const).map((p) => (
              <button key={p} className={`chip ${preview === p ? 'active' : ''}`} onClick={() => setPreview(p)}>
                {p === 'idle' ? '🙂' : p === 'exercise' ? '🏋️' : '💻'}
              </button>
            ))}
            <button className="chip" onClick={() => setA(randomAppearance(a.name))}>
              🎲 Random
            </button>
          </div>
        </div>

        <div className="card creator-controls">
          <label className="field">
            <span>Name</span>
            <input value={a.name} onChange={(e) => set('name', e.target.value)} placeholder="What should we call you?" maxLength={24} />
          </label>
          <div className="tabs" role="tablist">
            {SECTIONS.map((s) => (
              <button key={s.id} role="tab" aria-selected={section === s.id} className={section === s.id ? 'active' : ''} onClick={() => setSection(s.id)}>
                {s.label}
              </button>
            ))}
          </div>

          {section === 'face' && (
            <>
              {swatches('skinTone', 'Skin tone', SKIN_TONES)}
              {options('faceShape', 'Face shape')}
              <div className="opt-group toggles">
                <label><input type="checkbox" checked={a.freckles} onChange={(e) => set('freckles', e.target.checked)} /> Freckles</label>
                <label><input type="checkbox" checked={a.blush} onChange={(e) => set('blush', e.target.checked)} /> Rosy cheeks</label>
              </div>
            </>
          )}
          {section === 'hair' && (
            <>
              {options('hairStyle', 'Style')}
              {swatches('hairColor', 'Colour', HAIR_COLORS)}
            </>
          )}
          {section === 'eyes' && (
            <>
              {options('eyeStyle', 'Eyes')}
              {swatches('eyeColor', 'Eye colour', EYE_COLORS)}
              {options('brows', 'Eyebrows')}
            </>
          )}
          {section === 'features' && (
            <>
              {options('nose', 'Nose')}
              {options('mouth', 'Mouth')}
            </>
          )}
          {section === 'extras' && (
            <>
              {options('glasses', 'Glasses')}
              {options('facialHair', 'Facial hair')}
              {options('headwear', 'Hat')}
              {a.headwear !== 'none' && swatches('headwearColor', 'Hat colour', CLOTHES_COLORS)}
            </>
          )}
          {section === 'body' && (
            <>
              {options('build', 'Build', false)}
              <div className="opt-group">
                <h3>Height</h3>
                <div className="row gap">
                  {(['Shorter', 'Average', 'Taller'] as const).map((label, i) => (
                    <button key={label} className={`chip ${a.height === i ? 'active' : ''}`} onClick={() => set('height', i as 0 | 1 | 2)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {swatches('shirtColor', 'Top', CLOTHES_COLORS)}
              {swatches('pantsColor', 'Bottoms', CLOTHES_COLORS)}
              {swatches('shoeColor', 'Shoes', CLOTHES_COLORS)}
            </>
          )}

          <div className="row gap end sticky-actions">
            {!firstTime && (
              <button className="btn" onClick={onDone}>
                Cancel
              </button>
            )}
            <button
              className="btn primary"
              onClick={() => {
                setAppearance({ ...a, name: a.name.trim() });
                onDone();
              }}
            >
              {firstTime ? "That's me! ✨" : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
