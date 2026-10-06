import { useState } from 'react';
import { Avatar } from '../avatar/Avatar';
import { useStore } from '../store';
import { formatDuration, useNow, useVitals } from '../hooks';
import { ACTIVITY_INFO } from '../game/classifier';
import { ActivityPicker } from './Quests';
import type { Activity } from '../types';

const PHASE_LABEL = { focus: 'Focus', shortBreak: 'Short break', longBreak: 'Long break' } as const;

export function Timer() {
  const appearance = useStore((s) => s.appearance)!;
  const timer = useStore((s) => s.timer);
  const { pauseTimer, resumeTimer, stopTimer, skipPhase, pomodoro } = useStore();
  const { mood } = useVitals();
  const now = useNow(250);

  if (!timer) return <TimerSetup />;

  const remaining = timer.running && timer.endsAt ? timer.endsAt - now : timer.remainingMs;
  const progress = 1 - Math.max(0, remaining) / timer.totalMs;
  const onBreak = timer.phase !== 'focus';
  const activity: Activity = onBreak ? 'idle' : timer.running ? timer.activity : 'idle';
  const R = 54;
  const C = 2 * Math.PI * R;

  return (
    <div className={`screen timer ${onBreak ? 'on-break' : ''}`}>
      <section className="card timer-card">
        <div className="timer-label">
          <span className="pill">{timer.mode === 'pomodoro' ? `🍅 ${PHASE_LABEL[timer.phase]}` : timer.mode === 'block' ? '📅 Time block' : '⏱ Timer'}</span>
          <h1>{onBreak ? 'Rest a moment 💜' : timer.label}</h1>
          {!onBreak && <small className="muted">{ACTIVITY_INFO[timer.activity].emoji} {ACTIVITY_INFO[timer.activity].label}</small>}
        </div>
        <div className="timer-stage">
          <Avatar appearance={appearance} activity={activity} mood={onBreak ? 'happy' : mood} scene size="100%" />
        </div>
        <div className="countdown">
          <svg viewBox="0 0 120 120" className="ring" aria-hidden>
            <circle cx="60" cy="60" r={R} className="ring-bg" />
            <circle cx="60" cy="60" r={R} className="ring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />
          </svg>
          <div className="time" aria-live="off">
            {formatDuration(remaining)}
          </div>
        </div>
        {timer.mode === 'pomodoro' && (
          <div className="cycles" aria-label={`${timer.cycle % pomodoro.cyclesBeforeLong} of ${pomodoro.cyclesBeforeLong} focus sessions`}>
            {Array.from({ length: pomodoro.cyclesBeforeLong }, (_, i) => (
              <span key={i} className={i < timer.cycle % pomodoro.cyclesBeforeLong || (timer.phase === 'longBreak' && timer.cycle > 0) ? 'filled' : ''}>🍅</span>
            ))}
          </div>
        )}
        <div className="row gap center">
          {timer.running ? (
            <button className="btn big" onClick={pauseTimer}>⏸ Pause</button>
          ) : (
            <button className="btn big primary" onClick={resumeTimer}>
              ▶ {timer.phase === 'focus' && timer.remainingMs === timer.totalMs ? 'Start' : 'Resume'}
            </button>
          )}
          {timer.mode === 'pomodoro' && <button className="btn big" onClick={skipPhase}>⏭ Skip</button>}
          <button className="btn big ghost" onClick={stopTimer}>⏹ Stop</button>
        </div>
        <p className="hint center">Your character keeps going while you do. Time spent focusing is credited to the quest when a session ends or you stop.</p>
      </section>
    </div>
  );
}

function TimerSetup() {
  const { quests, blocks, pomodoro, setPomodoro, startTimer } = useStore();
  const appearance = useStore((s) => s.appearance)!;
  const active = quests.filter((q) => !q.completedAt);
  const [questId, setQuestId] = useState<string>(active[0]?.id ?? '');
  const [label, setLabel] = useState('');
  const [activity, setActivity] = useState<Activity>('desk');
  const [mode, setMode] = useState<'pomodoro' | 'free'>('pomodoro');
  const [minutes, setMinutes] = useState(30);
  const now = Date.now();
  const todays = blocks
    .filter((b) => new Date(b.end).getTime() > now && new Date(b.start).toDateString() === new Date().toDateString())
    .sort((a, b) => a.start.localeCompare(b.start));
  const quest = active.find((q) => q.id === questId);
  const previewActivity = quest ? quest.activity : activity;

  return (
    <div className="screen timer">
      <section className="card">
        <h1>Focus timer</h1>
        <div className="timer-setup">
          <div className="setup-avatar">
            <Avatar appearance={appearance} activity={previewActivity} scene size="100%" />
          </div>
          <div className="setup-form">
            <label className="field">
              <span>What are we doing?</span>
              <select value={questId} onChange={(e) => setQuestId(e.target.value)}>
                {active.map((q) => (
                  <option key={q.id} value={q.id}>
                    {ACTIVITY_INFO[q.activity].emoji} {q.title}
                  </option>
                ))}
                <option value="">Something else…</option>
              </select>
            </label>
            {!quest && (
              <div className="row gap wrap">
                <label className="field grow">
                  <span>Label</span>
                  <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Focus time" />
                </label>
                <label className="field">
                  <span>Animation</span>
                  <ActivityPicker value={activity} onChange={setActivity} />
                </label>
              </div>
            )}
            <div className="segmented" role="radiogroup">
              <button role="radio" aria-checked={mode === 'pomodoro'} className={mode === 'pomodoro' ? 'active' : ''} onClick={() => setMode('pomodoro')}>
                🍅 Pomodoro
              </button>
              <button role="radio" aria-checked={mode === 'free'} className={mode === 'free' ? 'active' : ''} onClick={() => setMode('free')}>
                ⏱ Set length
              </button>
            </div>
            {mode === 'pomodoro' ? (
              <div className="row gap wrap pomo-settings">
                <NumberField label="Focus" value={pomodoro.focusMin} onChange={(v) => setPomodoro({ focusMin: v })} />
                <NumberField label="Break" value={pomodoro.shortBreakMin} onChange={(v) => setPomodoro({ shortBreakMin: v })} />
                <NumberField label="Long break" value={pomodoro.longBreakMin} onChange={(v) => setPomodoro({ longBreakMin: v })} />
                <NumberField label="Rounds" value={pomodoro.cyclesBeforeLong} onChange={(v) => setPomodoro({ cyclesBeforeLong: v })} max={12} />
              </div>
            ) : (
              <NumberField label="Minutes" value={minutes} onChange={setMinutes} max={480} />
            )}
            <button
              className="btn big primary"
              onClick={() =>
                startTimer({
                  mode,
                  questId: quest?.id,
                  minutes,
                  activity: quest ? undefined : activity,
                  label: quest ? undefined : label.trim() || 'Focus time',
                })
              }
            >
              ▶ Start
            </button>
          </div>
        </div>
      </section>

      {todays.length > 0 && (
        <section className="card">
          <h2>Today’s time blocks</h2>
          <ul className="block-list">
            {todays.map((b) => {
              const s = new Date(b.start);
              const e = new Date(b.end);
              const live = s.getTime() <= now;
              return (
                <li key={b.id}>
                  <span>
                    {ACTIVITY_INFO[b.activity].emoji} <strong>{b.title}</strong>{' '}
                    <small className="muted">
                      {s.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}–{e.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </small>
                  </span>
                  <button className={`btn small ${live ? 'primary' : ''}`} onClick={() => startTimer({ mode: 'block', blockId: b.id })}>
                    ▶ {live ? `Start (${Math.round((e.getTime() - now) / 60000)} min left)` : `Start (${Math.round((e.getTime() - s.getTime()) / 60000)} min)`}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function NumberField({ label, value, onChange, max = 120 }: { label: string; value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <label className="field number">
      <span>{label}</span>
      <input type="number" min={1} max={max} value={value} onChange={(e) => onChange(Math.max(1, Math.min(max, Number(e.target.value) || 1)))} />
    </label>
  );
}
