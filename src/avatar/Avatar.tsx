// The tamagotchi-self: a parametric SVG character with activity animations.
// Geometry is computed from the Appearance so every part lines up whatever
// face shape, build or height was chosen; motion lives in avatar.css.

import { useId, type CSSProperties, type ReactNode } from 'react';
import type { Activity, Appearance, Mood } from '../types';
import { shade } from './options';
import './avatar.css';

interface Props {
  appearance: Appearance;
  activity?: Activity;
  mood?: Mood;
  size?: number | string;
  scene?: boolean;
  className?: string;
  /** Zoom in on the head (used for option thumbnails in the creator). */
  crop?: 'head';
}

const HEAD_DIMS = {
  round: { rx: 46, ry: 46 },
  oval: { rx: 42, ry: 50 },
  long: { rx: 39, ry: 53 },
  square: { rx: 44, ry: 47 },
  heart: { rx: 46, ry: 48 },
} as const;

const BUILD_WIDTH = { slim: 46, average: 56, broad: 68 } as const;
const LEG_LENGTH = [30, 38, 46] as const;

const SCENE_COLORS: Record<Activity, [string, string]> = {
  idle: ['#dff1ff', '#f5fbff'],
  desk: ['#e6e3ff', '#f6f5ff'],
  exercise: ['#ffe3d6', '#fff6f0'],
  build: ['#fbe8c8', '#fff8ec'],
  clean: ['#d9f6ef', '#f2fffb'],
  meditate: ['#efe0ff', '#fbf6ff'],
  cook: ['#ffe9cf', '#fff8ef'],
  eat: ['#ffeed6', '#fffaf2'],
  read: ['#e7f0dc', '#f7fbf2'],
  social: ['#ffe0ef', '#fff5fa'],
  walk: ['#d8f0ff', '#f0faff'],
  create: ['#fff0c9', '#fffaea'],
  sleep: ['#2c3366', '#4a528f'],
};

const MOOD_BUBBLE: Partial<Record<Mood, string>> = {
  hungry: '🍔',
  thirsty: '💧',
  lonely: '💔',
  tired: '💤',
  restless: '🌀',
  sad: '🌧️',
  sick: '🤒',
};

export function Avatar({ appearance: a, activity = 'idle', mood = 'okay', size = 220, scene = false, className = '', crop }: Props) {
  const { rx, ry } = HEAD_DIMS[a.faceShape];
  const W = BUILD_WIDTH[a.build];
  const LL = LEG_LENGTH[a.height];
  const cx = 100;
  const ground = 222;
  const hip = ground - LL;
  const top = hip - 52; // shoulders
  const cy = top - 48; // head centre
  const skinDark = shade(a.skinTone, -0.18);
  const eyesClosed = activity === 'sleep' || activity === 'meditate';
  const shoulderL = { x: cx - W / 2 + 4, y: top + 7 };
  const shoulderR = { x: cx + W / 2 - 4, y: top + 7 };
  const legX = W * 0.22;
  const armLen = 44;
  const seated = activity === 'meditate';
  const broomLen = (ground - top - 46) / Math.cos(Math.PI / 6);
  const broomX = cx + 4 - (broomLen + 18) * Math.sin(Math.PI / 6);

  const origin = (x: number, y: number): CSSProperties => ({ transformOrigin: `${x}px ${y}px` });

  const arm = (side: 'l' | 'r', held?: ReactNode) => {
    const s = side === 'l' ? shoulderL : shoulderR;
    return (
      <g className={`arm arm-${side}`} style={origin(s.x, s.y)}>
        <rect x={s.x - 6} y={s.y - 4} width={12} height={armLen} rx={6} fill={a.skinTone} />
        <rect x={s.x - 7} y={s.y - 6} width={14} height={20} rx={7} fill={a.shirtColor} />
        <circle cx={s.x} cy={s.y + armLen - 2} r={6.5} fill={a.skinTone} />
        {held && <g transform={`translate(${s.x} ${s.y + armLen - 2})`}>{held}</g>}
      </g>
    );
  };

  // Objects held in hands, drawn in hand-local coordinates (hand at 0,0).
  const heldRight: Partial<Record<Activity, ReactNode>> = {
    build: (
      <g className="hammer">
        <rect x={-3} y={0} width={6} height={20} rx={2} fill="#8a5a34" />
        <rect x={-12} y={16} width={24} height={10} rx={2} fill="#6f7782" />
      </g>
    ),
    eat: (
      <g>
        <circle cx={0} cy={-8} r={9} fill="#e06363" />
        <path d="M0 -17 q2 -5 6 -6" stroke="#4cb782" strokeWidth={3} fill="none" strokeLinecap="round" />
      </g>
    ),
    create: (
      <g>
        <rect x={-2} y={-24} width={4} height={26} rx={2} fill="#8a5a34" transform="rotate(-30)" />
        <circle cx={12} cy={-21} r={3.5} fill="#d65bb5" />
      </g>
    ),
  };
  const heldLeft: Partial<Record<Activity, ReactNode>> = {
    walk: (
      <g>
        <path d="M-9 0 q9 -14 18 0" stroke="#8a5a34" strokeWidth={2.5} fill="none" />
        <rect x={-13} y={0} width={26} height={24} rx={4} fill="#c9b48a" />
        <path d="M-6 3 l0 -6 M2 3 l3 -9 M8 3 l-1 -7" stroke="#4cb782" strokeWidth={3} strokeLinecap="round" />
      </g>
    ),
    create: <ellipse cx={-6} cy={-2} rx={14} ry={9} fill="#f3e3c3" stroke="#c9b48a" />,
  };

  return (
    <svg
      viewBox={crop === 'head' ? `${cx - 72} ${cy - ry - 34} 144 144` : '0 -24 200 254'}
      width={size}
      height={typeof size === 'number' ? size * (crop ? 1 : 1.27) : undefined}
      className={`avatar act-${activity} mood-${mood} ${scene ? 'with-scene' : ''} ${crop ? 'cropped' : ''} ${className}`}
      style={{ '--sit': `${LL - 12}px` } as CSSProperties}
      role="img"
      aria-label={`${a.name || 'Your character'} — ${activity}`}
    >
      {scene && <Scene activity={activity} />}

      {/* Props standing behind the character */}
      {activity === 'create' && (
        <g className="easel">
          <path d={`M156 ${ground + 2} L170 ${top - 14} L184 ${ground + 2} M170 ${top} L170 ${ground + 2}`} stroke="#8a5a34" strokeWidth={4} fill="none" />
          <rect x={146} y={top - 20} width={48} height={52} rx={2} fill="#fff" stroke="#c9b48a" strokeWidth={2} />
          <path className="stroke s1" d={`M152 ${top + 18} q10 -24 20 -6 t18 -10`} stroke="#4a8fe0" strokeWidth={4} fill="none" strokeLinecap="round" />
          <path className="stroke s2" d={`M152 ${top} q16 6 34 -6`} stroke="#e06363" strokeWidth={4} fill="none" strokeLinecap="round" />
          <circle className="stroke s3" cx={182} cy={top + 18} r={5} fill="#e0b04a" />
        </g>
      )}
      {activity === 'sleep' && (
        <g>
          <rect x={30} y={top - 26} width={140} height={34} rx={14} fill="#f2f2f2" />
          <rect x={22} y={top - 40} width={10} height={ground - top + 46} rx={4} fill="#8a5a34" />
          <rect x={168} y={top - 40} width={10} height={ground - top + 46} rx={4} fill="#8a5a34" />
        </g>
      )}
      <ellipse cx={cx} cy={ground + 4} rx={W / 2 + 18} ry={6} fill="#000" opacity={0.12} className="shadow" />

      <g className="char" style={origin(cx, ground)}>
        <g className="body-bob" style={origin(cx, ground)}>
          <HairBack a={a} cx={cx} cy={cy} rx={rx} ry={ry} />

          {/* Legs */}
          {!seated && (
            <g className="legs">
              {(['l', 'r'] as const).map((side) => {
                const x = side === 'l' ? cx - legX : cx + legX;
                return (
                  <g key={side} className={`leg leg-${side}`} style={origin(x, hip)}>
                    <rect x={x - 8} y={hip - 4} width={16} height={LL - 2} rx={6} fill={a.pantsColor} />
                    <ellipse cx={x + (side === 'l' ? -3 : 3)} cy={ground - 1} rx={11} ry={6} fill={a.shoeColor} />
                  </g>
                );
              })}
            </g>
          )}
          {seated && (
            <g className="folded-legs">
              <ellipse cx={cx} cy={hip + 4} rx={W / 2 + 22} ry={13} fill={a.pantsColor} />
              <ellipse cx={cx - W / 2 - 14} cy={hip + 9} rx={10} ry={6} fill={a.shoeColor} />
              <ellipse cx={cx + W / 2 + 14} cy={hip + 9} rx={10} ry={6} fill={a.shoeColor} />
            </g>
          )}

          {/* Neck + torso */}
          <rect x={cx - 8} y={cy + ry - 12} width={16} height={top - (cy + ry) + 18} fill={skinDark} />
          <path
            d={`M${cx - W / 2} ${top + 12} Q${cx - W / 2} ${top} ${cx - W / 2 + 12} ${top}
                L${cx + W / 2 - 12} ${top} Q${cx + W / 2} ${top} ${cx + W / 2} ${top + 12}
                L${cx + W / 2 - 3} ${hip + 2} L${cx - W / 2 + 3} ${hip + 2} Z`}
            fill={a.shirtColor}
          />
          <path d={`M${cx - 9} ${top} L${cx} ${top + 9} L${cx + 9} ${top}`} fill={skinDark} />
          <rect x={cx - W / 2 + 3} y={hip - 7} width={W - 6} height={10} rx={3} fill={a.pantsColor} />
          <rect x={cx - W / 2 + 3} y={hip - 7} width={W - 6} height={3} fill={shade(a.pantsColor, -0.25)} />

          {arm('l', heldLeft[activity])}
          {arm('r', heldRight[activity])}

          {/* Head */}
          <g className="head" style={origin(cx, cy + ry)}>
            <circle cx={cx - rx + 1} cy={cy + 8} r={8} fill={a.skinTone} />
            <circle cx={cx + rx - 1} cy={cy + 8} r={8} fill={a.skinTone} />
            <circle cx={cx - rx + 1} cy={cy + 8} r={4} fill={skinDark} />
            <circle cx={cx + rx - 1} cy={cy + 8} r={4} fill={skinDark} />
            <FaceShapePath shape={a.faceShape} cx={cx} cy={cy} rx={rx} ry={ry} fill={a.skinTone} />
            {mood === 'sick' && <FaceShapePath shape={a.faceShape} cx={cx} cy={cy} rx={rx} ry={ry} fill="#8fd18f" opacity={0.25} />}
            <FacialHairBack a={a} cx={cx} cy={cy} rx={rx} ry={ry} />
            {a.blush && (
              <g fill="#ff7b7b" opacity={0.35}>
                <ellipse cx={cx - 27} cy={cy + 22} rx={8} ry={4.5} />
                <ellipse cx={cx + 27} cy={cy + 22} rx={8} ry={4.5} />
              </g>
            )}
            {a.freckles && (
              <g fill={shade(a.skinTone, -0.35)} opacity={0.7}>
                {[-30, -24, -27, 24, 30, 27].map((dx, i) => (
                  <circle key={i} cx={cx + dx} cy={cy + 15 + (i % 3) * 3} r={1.3} />
                ))}
              </g>
            )}
            <Eyes a={a} cx={cx} cy={cy} closed={eyesClosed} mood={mood} />
            <Brows a={a} cx={cx} cy={cy} mood={mood} />
            <Nose a={a} cx={cx} cy={cy} skinDark={skinDark} />
            <Mouth a={a} cx={cx} cy={cy} mood={mood} activity={activity} />
            <FacialHairFront a={a} cx={cx} cy={cy} />
            {mood === 'tired' && !eyesClosed && (
              <g stroke={shade(a.skinTone, -0.3)} strokeWidth={1.5} fill="none" opacity={0.7}>
                <path d={`M${cx - 25} ${cy + 15} q7 4 14 0`} />
                <path d={`M${cx + 11} ${cy + 15} q7 4 14 0`} />
              </g>
            )}
            <GlassesShape a={a} cx={cx} cy={cy} />
            <HairFront a={a} cx={cx} cy={cy} rx={rx} ry={ry} />
            <HeadwearShape a={a} cx={cx} cy={cy} rx={rx} ry={ry} />
            {mood === 'sick' && (
              <g>
                <rect x={cx + 4} y={cy + 33} width={22} height={4} rx={2} fill="#fff" stroke="#ccc" transform={`rotate(18 ${cx + 4} ${cy + 35})`} />
                <circle cx={cx + 25} cy={cy + 42} r={3} fill="#e06363" />
              </g>
            )}
          </g>
        </g>
      </g>

      {/* Props in front of the character */}
      {activity === 'desk' && (
        <g>
          <rect x={18} y={hip - 6} width={164} height={10} rx={3} fill="#a8774d" />
          <rect x={30} y={hip + 4} width={8} height={ground - hip} fill="#8a5a34" />
          <rect x={162} y={hip + 4} width={8} height={ground - hip} fill="#8a5a34" />
          <path d={`M${cx - 34} ${hip - 6} L${cx - 28} ${hip - 44} L${cx + 28} ${hip - 44} L${cx + 34} ${hip - 6} Z`} fill="#9aa0a6" />
          <circle cx={cx} cy={hip - 26} r={5} fill="#d5d9de" />
          <rect x={140} y={hip - 22} width={14} height={16} rx={3} fill="#f2f2f2" />
          <path className="steam" d={`M147 ${hip - 26} q-4 -6 0 -12 t0 -12`} stroke="#bbb" strokeWidth={2} fill="none" />
          <g className="typing-bits" fill="#6b6fd6">
            <rect className="bit b1" x={cx - 20} y={hip - 56} width={10} height={4} rx={2} />
            <rect className="bit b2" x={cx - 4} y={hip - 56} width={14} height={4} rx={2} />
            <rect className="bit b3" x={cx + 14} y={hip - 56} width={8} height={4} rx={2} />
          </g>
        </g>
      )}
      {activity === 'build' && (
        <g>
          <rect x={cx - 52} y={hip - 2} width={80} height={12} rx={2} fill="#c9a06b" stroke="#8a5a34" />
          <rect x={cx - 46} y={hip + 10} width={6} height={ground - hip - 10} fill="#8a5a34" />
          <rect x={cx + 16} y={hip + 10} width={6} height={ground - hip - 10} fill="#8a5a34" />
          <g className="sparks" style={origin(cx - 14, hip - 4)}>
            <path d={`M${cx - 14} ${hip - 4} l-10 -6 M${cx - 14} ${hip - 4} l0 -12 M${cx - 14} ${hip - 4} l10 -6`} stroke="#f0c040" strokeWidth={2.5} strokeLinecap="round" />
          </g>
        </g>
      )}
      {activity === 'clean' && (
        <g className="broom" style={origin(cx + 4, top + 30)}>
          <g transform={`translate(${cx + 4} ${top + 30}) rotate(30)`}>
            <rect x={-3} y={-14} width={6} height={broomLen + 16} rx={3} fill="#a8774d" />
            <path d={`M-6 ${broomLen} L6 ${broomLen} L14 ${broomLen + 18} L-14 ${broomLen + 18} Z`} fill="#e0b04a" stroke="#b5803e" strokeWidth={1.5} />
          </g>
        </g>
      )}
      {activity === 'clean' && (
        <g className="dust" fill="#c9c9c9">
          <circle className="puff p1" cx={broomX - 8} cy={ground - 2} r={5} />
          <circle className="puff p2" cx={broomX + 4} cy={ground - 6} r={4} />
          <circle className="puff p3" cx={broomX - 16} cy={ground - 8} r={3} />
        </g>
      )}
      {activity === 'read' && (
        <g className="book">
          <path d={`M${cx} ${top + 30} L${cx - 30} ${top + 24} L${cx - 30} ${top + 52} L${cx} ${top + 58} Z`} fill="#4a8fe0" />
          <path d={`M${cx} ${top + 30} L${cx + 30} ${top + 24} L${cx + 30} ${top + 52} L${cx} ${top + 58} Z`} fill="#3d78c2" />
          <path d={`M${cx - 2} ${top + 30} L${cx - 27} ${top + 25} L${cx - 27} ${top + 50} L${cx - 2} ${top + 55} Z`} fill="#fff" />
          <path className="page" style={origin(cx, top + 40)} d={`M${cx + 2} ${top + 30} L${cx + 27} ${top + 25} L${cx + 27} ${top + 50} L${cx + 2} ${top + 55} Z`} fill="#fafafa" stroke="#ddd" />
        </g>
      )}
      {activity === 'cook' && (
        <g>
          <g className="pan" style={origin(cx + 2, top + 44)}>
            <rect x={cx - 12} y={top + 41} width={18} height={6} rx={3} fill="#3a3f4b" />
            <ellipse cx={cx - 32} cy={top + 44} rx={22} ry={7} fill="#3a3f4b" />
            <ellipse className="pancake" style={origin(cx - 32, top + 40)} cx={cx - 32} cy={top + 40} rx={13} ry={4} fill="#e0b04a" />
          </g>
          <g stroke="#c9c9c9" strokeWidth={3} fill="none" strokeLinecap="round">
            <path className="steam s1" d={`M${cx - 38} ${top + 30} q-6 -8 0 -16 t0 -16`} />
            <path className="steam s2" d={`M${cx - 26} ${top + 28} q-6 -8 0 -16 t0 -16`} />
          </g>
        </g>
      )}
      {activity === 'sleep' && (
        <g className="blanket" style={origin(cx, ground)}>
          <path d={`M24 ${top + 16} Q100 ${top + 4} 176 ${top + 16} L176 ${ground + 4} L24 ${ground + 4} Z`} fill="#6b6fd6" />
          <path d={`M24 ${top + 16} Q100 ${top + 4} 176 ${top + 16} L176 ${top + 30} Q100 ${top + 18} 24 ${top + 30} Z`} fill="#f2f2f2" />
        </g>
      )}

      {/* Floating effects */}
      {activity === 'exercise' && <path className="sweat" d={`M${cx + rx + 6} ${cy - 10} q5 9 0 12 q-5 -3 0 -12`} fill="#7cc4ff" />}
      {activity === 'meditate' && (
        <g className="aura" fill="none" stroke="#b38cf0">
          <circle className="ring r1" cx={cx} cy={cy + 30} r={70} />
          <circle className="ring r2" cx={cx} cy={cy + 30} r={70} />
        </g>
      )}
      {activity === 'sleep' && (
        <g className="zzz" fill="#fff" fontWeight={700} fontFamily="system-ui, sans-serif">
          <text className="z z1" x={cx + 40} y={cy - 20} fontSize={16}>z</text>
          <text className="z z2" x={cx + 52} y={cy - 36} fontSize={20}>z</text>
          <text className="z z3" x={cx + 66} y={cy - 54} fontSize={24}>Z</text>
        </g>
      )}
      {activity === 'social' && (
        <g className="bubbles" fontFamily="system-ui, sans-serif" fontSize={14}>
          <g className="bubble bl">
            <path d={`M14 ${cy - 30} h52 a8 8 0 0 1 8 8 v16 a8 8 0 0 1 -8 8 h-30 l-8 8 v-8 h-14 a8 8 0 0 1 -8 -8 v-16 a8 8 0 0 1 8 -8z`} fill="#fff" stroke="#f0a6c8" />
            <text x={26} y={cy - 12}>hi! 👋</text>
          </g>
          <g className="bubble br">
            <path d={`M130 ${cy - 52} h52 a8 8 0 0 1 8 8 v16 a8 8 0 0 1 -8 8 h-14 v8 l-8 -8 h-30 a8 8 0 0 1 -8 -8 v-16 a8 8 0 0 1 8 -8z`} fill="#fff" stroke="#f0a6c8" />
            <text x={146} y={cy - 34}>💖 😄</text>
          </g>
        </g>
      )}
      {activity === 'create' && (
        <g className="notes" fill="#d65bb5" fontSize={16}>
          <text className="note n1" x={40} y={cy}>♪</text>
          <text className="note n2" x={28} y={cy + 30}>♫</text>
        </g>
      )}
      {activity === 'walk' && (
        <g className="ground-dashes" stroke="#9fc6e6" strokeWidth={3} strokeLinecap="round">
          <path d={`M0 ${ground + 12} h16 M50 ${ground + 12} h16 M100 ${ground + 12} h16 M150 ${ground + 12} h16 M200 ${ground + 12} h16`} />
        </g>
      )}

      {/* Thought bubble when a need is pressing */}
      {MOOD_BUBBLE[mood] && activity !== 'sleep' && (
        <g className="thought">
          <circle cx={cx + rx - 2} cy={cy - ry + 2} r={3} fill="#fff" stroke="#cfd6e0" />
          <circle cx={cx + rx + 8} cy={cy - ry - 8} r={5} fill="#fff" stroke="#cfd6e0" />
          <ellipse cx={cx + rx + 26} cy={cy - ry - 28} rx={20} ry={16} fill="#fff" stroke="#cfd6e0" />
          <text x={cx + rx + 26} y={cy - ry - 22} fontSize={17} textAnchor="middle">
            {MOOD_BUBBLE[mood]}
          </text>
        </g>
      )}
    </svg>
  );
}

function Scene({ activity }: { activity: Activity }) {
  const [c1, c2] = SCENE_COLORS[activity];
  const id = `sky-${activity}`;
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
      </defs>
      <rect x={0} y={-24} width={200} height={254} rx={18} fill={`url(#${id})`} />
      <rect x={0} y={222} width={200} height={8} fill="#000" opacity={0.05} />
      {activity === 'sleep' && (
        <g fill="#fff">
          <circle cx={30} cy={0} r={1.5} />
          <circle cx={170} cy={10} r={1.2} />
          <circle cx={150} cy={-10} r={1} />
          <path d="M40 -8 a12 12 0 1 0 12 16 a10 10 0 1 1 -12 -16z" fill="#ffe9a8" />
        </g>
      )}
    </g>
  );
}

interface HeadProps {
  a: Appearance;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

function FaceShapePath({ shape, cx, cy, rx, ry, fill, opacity }: { shape: Appearance['faceShape']; cx: number; cy: number; rx: number; ry: number; fill: string; opacity?: number }) {
  if (shape === 'square') return <rect x={cx - rx} y={cy - ry} width={rx * 2} height={ry * 2} rx={22} fill={fill} opacity={opacity} />;
  if (shape === 'heart')
    return (
      <path
        d={`M${cx} ${cy + ry} C${cx - 30} ${cy + ry - 6} ${cx - rx} ${cy + 24} ${cx - rx} ${cy - 6}
            C${cx - rx} ${cy - ry + 4} ${cx - 24} ${cy - ry} ${cx} ${cy - ry}
            C${cx + 24} ${cy - ry} ${cx + rx} ${cy - ry + 4} ${cx + rx} ${cy - 6}
            C${cx + rx} ${cy + 24} ${cx + 30} ${cy + ry - 6} ${cx} ${cy + ry} Z`}
        fill={fill}
        opacity={opacity}
      />
    );
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} opacity={opacity} />;
}

/** A dome of hair over the head with a curved hairline. */
function cap(cx: number, cy: number, rx: number, ry: number, opts: { sideDrop?: number; hairline?: number; side?: boolean } = {}) {
  const L = cx - rx - 3;
  const R = cx + rx + 3;
  const T = cy - ry - 5;
  const drop = opts.sideDrop ?? 2;
  const hl = opts.hairline ?? 0.45; // how far down the forehead the hairline reaches (fraction of ry above centre)
  const hairY = cy - ry * hl;
  const ctrlY = 2 * hairY - (cy + drop - 6);
  if (opts.side) {
    return `M${L} ${cy + drop} C${L} ${T + 6} ${cx - rx * 0.5} ${T} ${cx} ${T} C${cx + rx * 0.5} ${T} ${R} ${T + 6} ${R} ${cy + drop}
            L${R - 5} ${cy + drop - 4} C${R - 10} ${hairY - 6} ${cx + rx * 0.3} ${hairY - 14} ${cx - rx * 0.2} ${hairY - 6}
            C${cx - rx * 0.6} ${hairY} ${L + 10} ${hairY + 6} ${L + 5} ${cy + drop - 4} Z`;
  }
  return `M${L} ${cy + drop} C${L} ${T + 6} ${cx - rx * 0.5} ${T} ${cx} ${T} C${cx + rx * 0.5} ${T} ${R} ${T + 6} ${R} ${cy + drop}
          L${R - 5} ${cy + drop - 4} Q${cx} ${ctrlY} ${L + 5} ${cy + drop - 4} Z`;
}

function HairBack({ a, cx, cy, rx }: HeadProps) {
  const c = shade(a.hairColor, -0.12);
  const L = cx - rx - 3;
  const R = cx + rx + 3;
  switch (a.hairStyle) {
    case 'afro':
      return <circle cx={cx} cy={cy - 10} r={rx + 22} fill={c} />;
    case 'bob':
      return <path d={`M${L - 4} ${cy - 10} Q${L - 6} ${cy + 40} ${L + 8} ${cy + 42} L${R - 8} ${cy + 42} Q${R + 6} ${cy + 40} ${R + 4} ${cy - 10} Z`} fill={c} />;
    case 'long':
      return <path d={`M${L - 4} ${cy - 10} Q${L - 10} ${cy + 80} ${L + 4} ${cy + 96} L${R - 4} ${cy + 96} Q${R + 10} ${cy + 80} ${R + 4} ${cy - 10} Z`} fill={c} />;
    case 'ponytail':
      return (
        <g>
          <ellipse cx={R + 4} cy={cy + 22} rx={12} ry={30} fill={c} transform={`rotate(-12 ${R + 4} ${cy + 22})`} />
          <rect x={R - 6} y={cy - 12} width={12} height={8} rx={3} fill="#e06363" />
        </g>
      );
    case 'locs':
      return (
        <g fill={c}>
          {Array.from({ length: 10 }, (_, i) => {
            const x = L - 2 + (i * (R - L + 4)) / 9;
            return <rect key={i} x={x - 5} y={cy - 16} width={10} height={70 + (i % 3) * 10} rx={5} />;
          })}
        </g>
      );
    default:
      return null;
  }
}

function HairFront({ a, cx, cy, rx, ry }: HeadProps) {
  const c = a.hairColor;
  const T = cy - ry - 5;
  switch (a.hairStyle) {
    case 'bald':
      return <ellipse cx={cx - 14} cy={T + 18} rx={12} ry={6} fill="#fff" opacity={0.25} />;
    case 'buzz':
      return <path d={cap(cx, cy, rx, ry, { sideDrop: -12, hairline: 0.55 })} fill={c} opacity={0.6} />;
    case 'short':
      return <path d={cap(cx, cy, rx, ry)} fill={c} />;
    case 'side':
      return <path d={cap(cx, cy, rx, ry, { side: true, sideDrop: 4 })} fill={c} />;
    case 'spiky': {
      const spikes = Array.from({ length: 7 }, (_, i) => {
        const t = -Math.PI + (i + 0.5) * (Math.PI / 7);
        const x = cx + Math.cos(t) * (rx + 4);
        const y = cy - 8 + Math.sin(t) * (ry + 2);
        const x2 = cx + Math.cos(t) * (rx + 20);
        const y2 = cy - 8 + Math.sin(t) * (ry + 18);
        return `M${x - 8} ${y + 4} L${x2} ${y2} L${x + 8} ${y + 4} Z`;
      });
      return (
        <g fill={c}>
          <path d={spikes.join(' ')} />
          <path d={cap(cx, cy, rx, ry, { hairline: 0.5 })} />
        </g>
      );
    }
    case 'curly':
    case 'afro': {
      const n = a.hairStyle === 'afro' ? 9 : 11;
      const r = a.hairStyle === 'afro' ? 13 : 10;
      return (
        <g fill={c}>
          <path d={cap(cx, cy, rx, ry, { hairline: 0.5, sideDrop: -4 })} />
          {Array.from({ length: n }, (_, i) => {
            const t = Math.PI + (i * Math.PI) / (n - 1);
            return <circle key={i} cx={cx + Math.cos(t) * (rx - 2)} cy={cy - 6 + Math.sin(t) * (ry - 4)} r={r} />;
          })}
        </g>
      );
    }
    case 'bob':
      return <path d={cap(cx, cy, rx, ry, { hairline: 0.3, sideDrop: 18 })} fill={c} />;
    case 'long':
    case 'locs':
      return (
        <g fill={c}>
          <path d={cap(cx, cy, rx, ry, { side: false, hairline: 0.5, sideDrop: 14 })} />
          <path d={`M${cx} ${T + 2} Q${cx - 4} ${T + 18} ${cx - 2} ${cy - ry * 0.45}`} stroke={shade(c, -0.25)} strokeWidth={2} fill="none" />
        </g>
      );
    case 'ponytail':
      return <path d={cap(cx, cy, rx, ry, { hairline: 0.55 })} fill={c} />;
    case 'bun':
      return (
        <g fill={c}>
          <circle cx={cx} cy={T - 8} r={17} />
          <path d={cap(cx, cy, rx, ry, { hairline: 0.55 })} />
        </g>
      );
    case 'mohawk':
      return (
        <g fill={c}>
          <path d={cap(cx, cy, rx, ry, { sideDrop: -12, hairline: 0.55 })} opacity={0.35} />
          <path d={`M${cx - 10} ${cy - ry * 0.5} Q${cx - 14} ${T - 22} ${cx} ${T - 26} Q${cx + 14} ${T - 22} ${cx + 10} ${cy - ry * 0.5} Z`} />
        </g>
      );
  }
}

function HeadwearShape({ a, cx, cy, rx, ry }: HeadProps) {
  if (a.headwear === 'none') return null;
  const c = a.headwearColor;
  const L = cx - rx - 5;
  const R = cx + rx + 5;
  const band = cy - ry * 0.35;
  // The dome's peak must clear the hair, which reaches about cy - ry - 5.
  // A cubic with both control points at height h peaks 3/4 of the way to h.
  const T = cy - ry - 14;
  const ctrl = band + (T - band) / 0.75;
  if (a.headwear === 'beanie')
    return (
      <g>
        <circle cx={cx} cy={T - 5} r={9} fill={shade(c, 0.4)} />
        <path d={`M${L} ${band} C${L} ${ctrl} ${R} ${ctrl} ${R} ${band} Z`} fill={c} />
        <rect x={L - 1} y={band - 10} width={R - L + 2} height={14} rx={6} fill={shade(c, -0.18)} />
      </g>
    );
  return (
    <g>
      <path d={`M${L + 2} ${band} C${L + 2} ${ctrl} ${R - 2} ${ctrl} ${R - 2} ${band} Z`} fill={c} />
      <path d={`M${cx - 10} ${band - 2} Q${cx + 40} ${band - 8} ${R + 22} ${band + 4} L${cx - 10} ${band + 4} Z`} fill={shade(c, -0.22)} />
      <circle cx={cx} cy={T + 2} r={3} fill={shade(c, -0.3)} />
    </g>
  );
}

function Eyes({ a, cx, cy, closed, mood }: { a: Appearance; cx: number; cy: number; closed: boolean; mood: Mood }) {
  const y = cy + 6;
  const xs = [cx - 18, cx + 18];
  if (closed)
    return (
      <g stroke="#2a211c" strokeWidth={2.5} fill="none" strokeLinecap="round">
        {xs.map((x) => (
          <path key={x} d={`M${x - 7} ${y} Q${x} ${y + 5} ${x + 7} ${y}`} />
        ))}
      </g>
    );
  const droopy = mood === 'tired' || a.eyeStyle === 'sleepy';
  return (
    <g className="eyes">
      {xs.map((x) => {
        let eye: ReactNode;
        switch (a.eyeStyle) {
          case 'dot':
            eye = (
              <>
                <circle cx={x} cy={y} r={4.5} fill="#1c1714" />
                <circle cx={x + 1.5} cy={y - 1.5} r={1.4} fill="#fff" />
              </>
            );
            break;
          case 'wide':
            eye = (
              <>
                <ellipse cx={x} cy={y} rx={8.5} ry={9} fill="#fff" stroke="#2a211c" strokeWidth={1} />
                <circle cx={x} cy={y + 1} r={5} fill={a.eyeColor} />
                <circle cx={x} cy={y + 1} r={2.4} fill="#111" />
                <circle cx={x + 2} cy={y - 1.5} r={1.6} fill="#fff" />
              </>
            );
            break;
          case 'almond':
          case 'sleepy':
            eye = (
              <>
                <ellipse cx={x} cy={y} rx={8} ry={5.5} fill="#fff" stroke="#2a211c" strokeWidth={1} />
                <circle cx={x} cy={y} r={4} fill={a.eyeColor} />
                <circle cx={x} cy={y} r={2} fill="#111" />
                <circle cx={x + 1.5} cy={y - 1.5} r={1.2} fill="#fff" />
              </>
            );
            break;
          default:
            eye = (
              <>
                <circle cx={x} cy={y} r={7.5} fill="#fff" stroke="#2a211c" strokeWidth={1} />
                <circle cx={x} cy={y + 0.5} r={4.5} fill={a.eyeColor} />
                <circle cx={x} cy={y + 0.5} r={2.2} fill="#111" />
                <circle cx={x + 1.8} cy={y - 1.5} r={1.5} fill="#fff" />
              </>
            );
        }
        return (
          <g key={x}>
            {eye}
            {droopy && <path d={`M${x - 10} ${y - 1} Q${x} ${y - 12} ${x + 10} ${y - 1} L${x + 10} ${y - 12} L${x - 10} ${y - 12} Z`} fill={a.skinTone} />}
            {droopy && <path d={`M${x - 9} ${y - 1} Q${x} ${y - 3} ${x + 9} ${y - 1}`} stroke="#2a211c" strokeWidth={1.5} fill="none" />}
          </g>
        );
      })}
    </g>
  );
}

function Brows({ a, cx, cy, mood }: { a: Appearance; cx: number; cy: number; mood: Mood }) {
  if (a.brows === 'none') return null;
  const y = cy - 9;
  const worried = mood === 'sad' || mood === 'lonely' || mood === 'sick' || mood === 'hungry' || mood === 'thirsty';
  const w = { thin: 2, thick: 4.5, arched: 3, flat: 3.5 }[a.brows];
  const color = shade(a.hairStyle === 'bald' ? '#5a3b26' : a.hairColor, -0.2);
  return (
    <g stroke={color} strokeWidth={w} strokeLinecap="round" fill="none">
      {[-1, 1].map((side) => {
        const x = cx + side * 18;
        const inner = x - side * 7;
        const outer = x + side * 7;
        const tilt = worried ? -3 : 0; // inner end raised when worried
        if (a.brows === 'flat') return <path key={side} d={`M${inner} ${y + tilt} L${outer} ${y}`} />;
        const lift = a.brows === 'arched' ? 6 : 3;
        return <path key={side} d={`M${inner} ${y + tilt} Q${x} ${y - lift} ${outer} ${y + 1}`} />;
      })}
    </g>
  );
}

function Nose({ a, cx, cy, skinDark }: { a: Appearance; cx: number; cy: number; skinDark: string }) {
  const y = cy + 20;
  switch (a.nose) {
    case 'small':
      return <path d={`M${cx - 3} ${y} q3 2 6 0`} stroke={skinDark} strokeWidth={2} fill="none" strokeLinecap="round" />;
    case 'long':
      return <path d={`M${cx} ${y - 12} L${cx - 4} ${y + 1} Q${cx} ${y + 4} ${cx + 4} ${y + 1}`} stroke={skinDark} strokeWidth={2} fill="none" strokeLinecap="round" />;
    case 'wide':
      return <ellipse cx={cx} cy={y} rx={8} ry={4.5} fill={skinDark} opacity={0.75} />;
    default:
      return <ellipse cx={cx} cy={y} rx={4.5} ry={3.5} fill={skinDark} />;
  }
}

function Mouth({ a, cx, cy, mood, activity }: { a: Appearance; cx: number; cy: number; mood: Mood; activity: Activity }) {
  const y = cy + 32;
  const stroke = { stroke: '#7a3b30', strokeWidth: 2.5, fill: 'none', strokeLinecap: 'round' as const };
  if (activity === 'eat') return <ellipse className="chew" style={{ transformOrigin: `${cx}px ${y}px` }} cx={cx} cy={y} rx={6} ry={4} fill="#7a3b30" />;
  if (activity === 'sleep') return <ellipse cx={cx} cy={y} rx={3} ry={3.5} fill="#7a3b30" />;
  if (activity === 'exercise') return <ellipse cx={cx} cy={y} rx={6} ry={5} fill="#7a3b30" />;
  switch (mood) {
    case 'sad':
    case 'lonely':
      return <path d={`M${cx - 9} ${y + 4} Q${cx} ${y - 4} ${cx + 9} ${y + 4}`} {...stroke} />;
    case 'sick':
      return <path d={`M${cx - 10} ${y} q3 -3 5 0 t5 0 t5 0 t5 0`} {...stroke} />;
    case 'hungry':
    case 'thirsty':
      return <ellipse cx={cx} cy={y + 1} rx={5} ry={4} fill="#7a3b30" />;
    case 'tired':
    case 'restless':
      return <path d={`M${cx - 7} ${y + 1} L${cx + 7} ${y + 1}`} {...stroke} />;
  }
  switch (a.mouth) {
    case 'grin':
      return <path d={`M${cx - 11} ${y - 2} Q${cx} ${y + 13} ${cx + 11} ${y - 2} Z`} fill="#fff" stroke="#7a3b30" strokeWidth={2.2} strokeLinejoin="round" />;
    case 'flat':
      return <path d={`M${cx - 8} ${y} Q${cx} ${y + 2} ${cx + 8} ${y}`} {...stroke} />;
    case 'small':
      return <path d={`M${cx - 5} ${y} Q${cx} ${y + 4} ${cx + 5} ${y}`} {...stroke} />;
    default:
      return <path d={`M${cx - 10} ${y - 1} Q${cx} ${y + 9} ${cx + 10} ${y - 1}`} {...stroke} />;
  }
}

function FacialHairBack({ a, cx, cy, rx, ry }: HeadProps) {
  const c = a.hairColor;
  const clipId = useId();
  if (a.facialHair === 'beard')
    return (
      <path
        d={`M${cx - rx + 2} ${cy + 4} Q${cx - rx + 4} ${cy + ry + 14} ${cx} ${cy + ry + 14} Q${cx + rx - 4} ${cy + ry + 14} ${cx + rx - 2} ${cy + 4}
            L${cx + rx - 10} ${cy + 14} Q${cx + 14} ${cy + 24} ${cx} ${cy + 24} Q${cx - 14} ${cy + 24} ${cx - rx + 10} ${cy + 14} Z`}
        fill={c}
      />
    );
  if (a.facialHair === 'stubble')
    // Shadow over the jaw, chin and upper lip, clipped to the face outline so it fits every face shape.
    return (
      <g>
        <clipPath id={clipId}>
          <FaceShapePath shape={a.faceShape} cx={cx} cy={cy} rx={rx} ry={ry} fill="#000" />
        </clipPath>
        <path
          clipPath={`url(#${clipId})`}
          d={`M${cx - rx - 2} ${cy + 8} Q${cx - rx * 0.5} ${cy + 30} ${cx - 12} ${cy + 25} Q${cx} ${cy + 22} ${cx + 12} ${cy + 25}
              Q${cx + rx * 0.5} ${cy + 30} ${cx + rx + 2} ${cy + 8} L${cx + rx + 2} ${cy + ry + 10} L${cx - rx - 2} ${cy + ry + 10} Z`}
          fill={c}
          opacity={0.28}
        />
      </g>
    );
  return null;
}

function FacialHairFront({ a, cx, cy }: { a: Appearance; cx: number; cy: number }) {
  const c = a.hairColor;
  const y = cy + 27;
  if (a.facialHair === 'mustache' || a.facialHair === 'beard')
    return <path d={`M${cx} ${y} Q${cx - 8} ${y - 6} ${cx - 15} ${y + 2} Q${cx - 6} ${y + 1} ${cx} ${y + 2} Q${cx + 6} ${y + 1} ${cx + 15} ${y + 2} Q${cx + 8} ${y - 6} ${cx} ${y} Z`} fill={c} />;
  if (a.facialHair === 'goatee')
    return (
      <g fill={c}>
        <path d={`M${cx} ${y} Q${cx - 7} ${y - 4} ${cx - 12} ${y + 2} Q${cx} ${y} ${cx + 12} ${y + 2} Q${cx + 7} ${y - 4} ${cx} ${y} Z`} />
        <path d={`M${cx - 7} ${y + 13} Q${cx} ${y + 26} ${cx + 7} ${y + 13} Z`} />
      </g>
    );
  return null;
}

function GlassesShape({ a, cx, cy }: { a: Appearance; cx: number; cy: number }) {
  const y = cy + 6;
  if (a.glasses === 'none') return null;
  const frame = { stroke: '#2a211c', strokeWidth: 2.5 };
  if (a.glasses === 'sunglasses')
    return (
      <g>
        <rect x={cx - 30} y={y - 8} width={24} height={15} rx={6} fill="#1f2329" {...frame} />
        <rect x={cx + 6} y={y - 8} width={24} height={15} rx={6} fill="#1f2329" {...frame} />
        <path d={`M${cx - 6} ${y - 3} L${cx + 6} ${y - 3}`} {...frame} />
        <path d={`M${cx - 26} ${y - 5} l6 0`} stroke="#fff" strokeWidth={2} opacity={0.5} />
      </g>
    );
  if (a.glasses === 'round')
    return (
      <g fill="#fff" fillOpacity={0.15}>
        <circle cx={cx - 18} cy={y} r={11} {...frame} />
        <circle cx={cx + 18} cy={y} r={11} {...frame} />
        <path d={`M${cx - 7} ${y - 2} Q${cx} ${y - 6} ${cx + 7} ${y - 2}`} fill="none" {...frame} />
      </g>
    );
  return (
    <g fill="#fff" fillOpacity={0.15}>
      <rect x={cx - 30} y={y - 9} width={24} height={18} rx={3} {...frame} />
      <rect x={cx + 6} y={y - 9} width={24} height={18} rx={3} {...frame} />
      <path d={`M${cx - 6} ${y - 2} L${cx + 6} ${y - 2}`} {...frame} />
    </g>
  );
}
