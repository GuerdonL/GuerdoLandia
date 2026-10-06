import { Avatar } from '../avatar/Avatar';
import { useStore } from '../store';
import { formatDuration, useCurrentActivity, useNow, useVitals } from '../hooks';
import { CARE_ACTIONS, HEALTH_INFO, STAT_INFO, STAT_KEYS, xpForLevel } from '../game/stats';
import { ACTIVITY_INFO } from '../game/classifier';
import type { Tab } from '../App';

const KIND_WORDS = [
  "I'm doing alright. Thanks for looking after us.",
  'One small step still counts.',
  "You don't have to earn rest.",
  "Proud of us for showing up today.",
  'Progress, not perfection.',
  "Let's be gentle with ourselves today.",
];

export function Home({ go }: { go: (t: Tab) => void }) {
  const appearance = useStore((s) => s.appearance)!;
  const { stats, asleep, sick, health, mood, alerts } = useVitals();
  const activity = useCurrentActivity();
  const { xp, level, timer, blocks, log, care, toggleSleep, setSick, startTimer, inventory, gold, useItem } = useStore();
  const now = useNow(timer ? 1000 : 30_000);

  const top = alerts[0];
  const kind = KIND_WORDS[Math.floor(now / 3_600_000) % KIND_WORDS.length];
  const speech = asleep ? 'Zzz… (tap “Wake up” when you’re up)' : top ? top.message : mood === 'happy' ? 'I feel great! Thank you for taking care of us 💜' : kind;
  const suggestion = top?.suggestion ? CARE_ACTIONS.find((c) => c.id === top.suggestion) : undefined;

  const upcoming = blocks
    .filter((b) => new Date(b.end).getTime() > now && new Date(b.start).getTime() < now + 12 * 3_600_000)
    .sort((a, b) => a.start.localeCompare(b.start))[0];
  const upcomingLive = upcoming && new Date(upcoming.start).getTime() <= now;

  return (
    <div className="screen home">
      <section className="card hero">
        <div className="hero-top">
          <div>
            <h1>{appearance.name || 'You'}</h1>
            <div className="level">
              Lv {level}
              <div className="xpbar" title={`${xp} / ${xpForLevel(level)} XP`}>
                <div style={{ width: `${(xp / xpForLevel(level)) * 100}%` }} />
              </div>
            </div>
          </div>
          <span className="health-badge" style={{ background: HEALTH_INFO[health].color }}>
            Health: {HEALTH_INFO[health].label}
          </span>
        </div>
        <div className="speech" data-severity={top?.severity ?? 'none'}>
          {speech}
          {suggestion && (
            <button className="chip" onClick={() => care(suggestion.id)}>
              {suggestion.emoji} {suggestion.label}
            </button>
          )}
        </div>
        <div className="hero-avatar" onClick={() => timer && go('timer')}>
          <Avatar appearance={appearance} activity={activity} mood={mood} scene size="100%" />
        </div>
        {timer && (
          <button className="banner" onClick={() => go('timer')}>
            {ACTIVITY_INFO[timer.activity].emoji} {timer.phase === 'focus' ? timer.label : 'On a break'} ·{' '}
            {formatDuration(timer.running && timer.endsAt ? timer.endsAt - now : timer.remainingMs)}
            {!timer.running && ' (paused)'}
          </button>
        )}
        {!timer && upcoming && (
          <div className="banner subtle">
            {upcomingLive ? 'Now: ' : `${new Date(upcoming.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}: `}
            {ACTIVITY_INFO[upcoming.activity].emoji} {upcoming.title}
            {upcomingLive && (
              <button
                className="chip"
                onClick={() => {
                  startTimer({ mode: 'block', blockId: upcoming.id });
                  go('timer');
                }}
              >
                ▶ Start
              </button>
            )}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Vitals</h2>
        <div className="stats">
          {STAT_KEYS.map((k) => {
            const v = Math.round(stats[k]);
            const level = v < 20 ? 'urgent' : v < 40 ? 'low' : v < 70 ? 'ok' : 'good';
            return (
              <div key={k} className="stat">
                <span className="stat-label">
                  {STAT_INFO[k].emoji} {v < 40 ? STAT_INFO[k].low : STAT_INFO[k].label}
                </span>
                <div className={`bar ${level}`} role="meter" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={STAT_INFO[k].label}>
                  <div style={{ width: `${v}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2>Be kind to yourself</h2>
        <p className="hint">Log what you did in real life. Every act of self-care earns kindness XP.</p>
        <div className="care-grid">
          {CARE_ACTIONS.map((c) => (
            <button key={c.id} className="care" onClick={() => care(c.id)} disabled={asleep && c.id !== 'water'}>
              <span className="care-emoji">{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>
        <div className="row gap">
          <button className={`btn ${asleep ? 'primary' : ''}`} onClick={toggleSleep}>
            {asleep ? '☀️ Wake up' : '🌙 Going to bed'}
          </button>
          <button className={`btn ${sick ? 'primary' : ''}`} onClick={() => setSick(!sick)}>
            {sick ? '💪 Feeling better' : '🤒 I feel unwell'}
          </button>
        </div>
      </section>

      <section className="card">
        <div className="row between">
          <h2>Bag</h2>
          <span className="gold">🪙 {gold} gold</span>
        </div>
        {inventory.length === 0 ? (
          <p className="hint">Complete a quest to win your first loot.</p>
        ) : (
          <ul className="bag-list">
            {inventory.slice(0, 12).map((i) => (
              <li key={i.id} className={i.usedAt ? 'used' : ''}>
                <span className="bag-icon">{i.icon}</span>
                <span>
                  <span className="bag-name">{i.name}</span>
                  <br />
                  <span className="bag-sub">
                    {i.rarity} · from “{i.questTitle}”{i.realWorld ? ` · real life: ${i.realWorld}` : ''}
                  </span>
                </span>
                {i.effect && !i.usedAt ? (
                  <button className="btn small" onClick={() => useItem(i.id)}>
                    Use
                  </button>
                ) : (
                  <span className="bag-sub">{i.usedAt ? 'used' : ''}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {log.length > 0 && (
        <section className="card">
          <h2>Recently</h2>
          <ul className="log">
            {log.slice(0, 8).map((l, i) => (
              <li key={i}>
                <time>{new Date(l.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time> {l.text}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
