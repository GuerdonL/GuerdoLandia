// Built-in monster art: simple, friendly-menacing SVG creatures tinted by hue.
// When the image generator has made a portrait for this foe, that is shown instead.

import { useEffect, useState } from 'react';
import type { Monster as MonsterData, MonsterKind } from './types';
import { getImage } from './assets';

const hsl = (h: number, s: number, l: number) => `hsl(${h} ${s}% ${l}%)`;

function Eyes({ y = 46, gap = 12, mean = true }: { y?: number; gap?: number; mean?: boolean }) {
  return (
    <g>
      {[-1, 1].map((d) => (
        <g key={d}>
          <ellipse cx={50 + d * gap} cy={y} rx={6} ry={7} fill="#fff" />
          <circle cx={50 + d * gap + d * -1} cy={y + 1.5} r={3.2} fill="#1c1714" />
          {mean && <path d={`M${50 + d * gap - 7} ${y - 9 + (d > 0 ? 3 : 0)} L${50 + d * gap + 7} ${y - 9 + (d > 0 ? 0 : 3)}`} stroke="#1c1714" strokeWidth={2.5} strokeLinecap="round" />}
        </g>
      ))}
    </g>
  );
}

const Mouth = ({ y = 62 }: { y?: number }) => (
  <path d={`M42 ${y} q4 4 8 0 q4 4 8 0`} stroke="#1c1714" strokeWidth={2.5} fill="none" strokeLinecap="round" />
);

function Body({ kind, hue }: { kind: MonsterKind; hue: number }) {
  const main = hsl(hue, 55, 55);
  const dark = hsl(hue, 50, 38);
  const light = hsl(hue, 60, 72);
  switch (kind) {
    case 'slime':
      return (
        <g>
          <path d="M14 86 Q10 40 50 26 Q90 40 86 86 Q50 94 14 86Z" fill={main} />
          <ellipse cx={36} cy={42} rx={8} ry={5} fill={light} opacity={0.7} />
          <Eyes y={56} /> <Mouth y={70} />
        </g>
      );
    case 'goblin':
      return (
        <g>
          <path d="M18 40 L4 28 L24 34Z M82 40 L96 28 L76 34Z" fill={main} />
          <rect x={30} y={62} width={40} height={28} rx={10} fill="#8a5a34" />
          <ellipse cx={50} cy={46} rx={30} ry={26} fill={main} />
          <Eyes y={44} /> <path d="M40 60 L44 56 L48 60 L52 56 L56 60 L60 56" stroke="#fff" strokeWidth={2} fill="none" />
        </g>
      );
    case 'bat':
      return (
        <g>
          <path d="M50 50 L8 30 Q14 48 6 62 Q22 54 30 66 Q36 54 50 60 Q64 54 70 66 Q78 54 94 62 Q86 48 92 30Z" fill={dark} />
          <circle cx={50} cy={52} r={18} fill={main} />
          <path d="M38 38 L40 26 L46 36Z M62 38 L60 26 L54 36Z" fill={main} />
          <Eyes y={50} gap={8} /> <path d="M45 61 l2 4 l2 -4 M51 61 l2 4 l2 -4" stroke="#fff" strokeWidth={1.5} fill="none" />
        </g>
      );
    case 'wisp':
      return (
        <g>
          <path d="M50 18 Q78 34 70 62 Q64 86 50 92 Q56 76 44 74 Q28 72 30 56 Q24 34 50 18Z" fill={light} opacity={0.85} />
          <circle cx={50} cy={52} r={18} fill={main} opacity={0.6} />
          <Eyes y={50} gap={8} mean={false} />
        </g>
      );
    case 'golem':
      return (
        <g>
          <rect x={18} y={34} width={64} height={54} rx={8} fill={hsl(hue, 18, 50)} />
          <rect x={30} y={14} width={40} height={30} rx={6} fill={hsl(hue, 18, 58)} />
          <path d="M26 50 l10 8 M64 70 l10 -6 M40 80 l6 -8" stroke={hsl(hue, 30, 35)} strokeWidth={3} />
          <rect x={38} y={24} width={8} height={6} fill="#ffcf5a" /> <rect x={54} y={24} width={8} height={6} fill="#ffcf5a" />
        </g>
      );
    case 'imp':
      return (
        <g>
          <path d="M30 26 L34 8 L42 24Z M70 26 L66 8 L58 24Z" fill={dark} />
          <path d="M70 76 q24 4 18 -16 l6 -4 l-2 8" stroke={dark} strokeWidth={4} fill="none" />
          <ellipse cx={50} cy={56} rx={28} ry={30} fill={main} />
          <Eyes y={48} /> <path d="M38 66 Q50 76 62 66" stroke="#1c1714" strokeWidth={2.5} fill="none" />
        </g>
      );
    case 'mimic':
      return (
        <g>
          <rect x={14} y={48} width={72} height={40} rx={4} fill="#8a5a34" />
          <path d="M14 48 L86 48 L82 26 Q50 14 18 26Z" fill="#a8774d" />
          <path d="M18 48 L26 58 L34 48 L42 58 L50 48 L58 58 L66 48 L74 58 L82 48" fill="#fff" />
          <rect x={44} y={60} width={12} height={10} rx={2} fill="#e0b04a" />
          <path d="M34 48 Q50 40 66 48" fill="#5a1e1e" />
          <circle cx={38} cy={34} r={4} fill={main} /> <circle cx={62} cy={34} r={4} fill={main} />
        </g>
      );
    case 'shade':
      return (
        <g>
          <path d="M22 90 Q20 30 50 18 Q80 30 78 90 L70 82 L62 90 L54 82 L46 90 L38 82 L30 90Z" fill={hsl(hue, 30, 30)} opacity={0.9} />
          <ellipse cx={42} cy={44} rx={5} ry={3} fill={light} /> <ellipse cx={58} cy={44} rx={5} ry={3} fill={light} />
        </g>
      );
    case 'dragon':
      return (
        <g>
          <path d="M20 50 Q4 26 24 18 Q22 36 36 40Z M80 50 Q96 26 76 18 Q78 36 64 40Z" fill={dark} />
          <ellipse cx={50} cy={62} rx={30} ry={26} fill={main} />
          <ellipse cx={50} cy={68} rx={18} ry={14} fill={light} />
          <path d="M36 32 L38 20 L44 32Z M64 32 L62 20 L56 32Z" fill="#f2f2f2" />
          <Eyes y={50} /> <circle cx={44} cy={60} r={1.5} fill="#1c1714" /> <circle cx={56} cy={60} r={1.5} fill="#1c1714" />
        </g>
      );
    case 'dummy':
      return (
        <g>
          <rect x={47} y={60} width={6} height={32} fill="#8a5a34" />
          <rect x={20} y={40} width={60} height={8} rx={4} fill="#c9a06b" />
          <ellipse cx={50} cy={56} rx={18} ry={20} fill="#e0c088" />
          <circle cx={50} cy={28} r={14} fill="#e0c088" />
          <circle cx={50} cy={56} r={8} fill="none" stroke="#e06363" strokeWidth={3} /> <circle cx={50} cy={56} r={2.5} fill="#e06363" />
          <path d="M44 26 l4 4 M48 26 l-4 4 M52 26 l4 4 M56 26 l-4 4" stroke="#5a3b26" strokeWidth={1.5} />
        </g>
      );
    case 'dustling':
      return (
        <g>
          {[[30, 66, 16], [62, 70, 18], [46, 50, 20]].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill={hsl(hue, 5, 70 - i * 4)} />
          ))}
          <path d="M28 40 l-6 -10 M40 32 l-2 -10 M56 32 l2 -10" stroke={hsl(0, 0, 60)} strokeWidth={2} />
          <Eyes y={52} gap={8} />
        </g>
      );
    case 'stormcloud':
      return (
        <g>
          <path d="M24 64 Q8 64 12 48 Q14 34 30 36 Q34 18 54 22 Q72 16 78 36 Q94 38 90 54 Q88 66 74 64Z" fill={hsl(hue, 15, 45)} />
          <path d="M44 66 L38 82 L48 80 L42 96" stroke="#ffd94a" strokeWidth={4} fill="none" strokeLinejoin="round" />
          <Eyes y={46} />
        </g>
      );
  }
}

/** Draws one foe. `motion` drives the CSS animation classes in adventure.css. */
export function MonsterSprite({ monster, motion }: { monster: MonsterData; motion: 'idle' | 'attack' | 'hurt' | 'defeat' | 'spawn' }) {
  const [art, setArt] = useState<string>();
  useEffect(() => {
    let url: string | undefined;
    if (monster.artKey)
      getImage(monster.artKey).then((blob) => {
        if (blob) setArt((url = URL.createObjectURL(blob)));
      });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [monster.artKey]);

  return (
    <div className={`monster motion-${motion}`} title={monster.name}>
      {art ? (
        <img src={art} alt={monster.name} className="monster-art" />
      ) : (
        <svg viewBox="0 0 100 100" role="img" aria-label={monster.name}>
          <ellipse cx={50} cy={94} rx={30} ry={5} fill="#000" opacity={0.15} />
          <Body kind={monster.kind} hue={monster.hue} />
        </svg>
      )}
    </div>
  );
}
