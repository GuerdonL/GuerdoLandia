import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { ACTIVITY_INFO, ALL_ACTIVITIES, classifyActivity, parseTarget } from '../game/classifier';
import type { Activity, Quest } from '../types';
import type { Tab } from '../App';
import { ConfirmButton } from '../components/ConfirmButton';

const EXAMPLES = ['Find 10 jobs to apply to', 'Finish the bookshelf project', 'Call mom', 'Deep clean the kitchen', 'Go for a 20 minute run', 'Read 3 chapters'];

export function Quests({ go, onSchedule }: { go: (t: Tab) => void; onSchedule: (questId: string) => void }) {
  const quests = useStore((s) => s.quests);
  const addQuest = useStore((s) => s.addQuest);
  const [text, setText] = useState('');
  const [override, setOverride] = useState<Activity | null>(null);
  const [showDone, setShowDone] = useState(false);

  const guess = useMemo(() => classifyActivity(text), [text]);
  const target = useMemo(() => parseTarget(text), [text]);
  const activity = override ?? guess.activity;

  const active = quests.filter((q) => !q.completedAt);
  const done = quests.filter((q) => q.completedAt);

  const submit = () => {
    if (!text.trim()) return;
    addQuest(text, override ?? undefined);
    setText('');
    setOverride(null);
  };

  return (
    <div className="screen quests">
      <section className="card">
        <h1>Quests</h1>
        <p className="hint">Type a life task in your own words. Your character will act it out while you do it.</p>
        <form
          className="quest-input"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`e.g. “${EXAMPLES[Math.floor(Date.now() / 60000) % EXAMPLES.length]}”`}
            aria-label="New quest"
          />
          <button className="btn primary" disabled={!text.trim()}>
            Add
          </button>
        </form>
        {text.trim() && (
          <div className="guess">
            <span>
              Animation: <strong>{ACTIVITY_INFO[activity].emoji} {ACTIVITY_INFO[activity].label}</strong>
              {!override && guess.matched.length > 0 && <small> (from “{guess.matched.slice(0, 3).join('”, “')}”)</small>}
            </span>
            {target && <span className="pill">Counts to {target}</span>}
            <ActivityPicker value={activity} onChange={setOverride} />
          </div>
        )}
      </section>

      {active.length === 0 && (
        <section className="card empty">
          <p>No quests yet. Try one of these:</p>
          <div className="row gap wrap">
            {EXAMPLES.map((ex) => (
              <button key={ex} className="chip" onClick={() => addQuest(ex)}>
                {ex}
              </button>
            ))}
          </div>
        </section>
      )}

      <ul className="quest-list">
        {active.map((q) => (
          <QuestItem key={q.id} q={q} go={go} onSchedule={onSchedule} />
        ))}
      </ul>

      {done.length > 0 && (
        <section className="card">
          <button className="link" onClick={() => setShowDone(!showDone)}>
            {showDone ? '▾' : '▸'} Completed ({done.length})
          </button>
          {showDone && (
            <ul className="quest-list done">
              {done.map((q) => (
                <QuestItem key={q.id} q={q} go={go} onSchedule={onSchedule} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

export function ActivityPicker({ value, onChange }: { value: Activity; onChange: (a: Activity) => void }) {
  return (
    <select className="activity-picker" value={value} onChange={(e) => onChange(e.target.value as Activity)} aria-label="Animation">
      {ALL_ACTIVITIES.filter((a) => a !== 'idle').map((a) => (
        <option key={a} value={a}>
          {ACTIVITY_INFO[a].emoji} {ACTIVITY_INFO[a].label}
        </option>
      ))}
    </select>
  );
}

function QuestItem({ q, go, onSchedule }: { q: Quest; go: (t: Tab) => void; onSchedule: (id: string) => void }) {
  const { stepQuest, completeQuest, reopenQuest, deleteQuest, updateQuest, startTimer } = useStore();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(q.title);
  const info = ACTIVITY_INFO[q.activity];

  return (
    <li className={`card quest ${q.completedAt ? 'is-done' : ''}`}>
      <div className="quest-main">
        <span className="quest-emoji" title={info.label}>
          {info.emoji}
        </span>
        <div className="quest-body">
          {editing ? (
            <form
              className="row gap"
              onSubmit={(e) => {
                e.preventDefault();
                const patch: Partial<Quest> = { title: title.trim() || q.title };
                if (!q.activityLocked) patch.activity = classifyActivity(patch.title!).activity;
                updateQuest(q.id, patch);
                setEditing(false);
              }}
            >
              <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
              <button className="btn small">Save</button>
            </form>
          ) : (
            <div className="quest-title">{q.title}</div>
          )}
          <div className="quest-meta">
            {q.target ? (
              <span className="counter">
                <button className="round" onClick={() => stepQuest(q.id, -1)} aria-label="Decrease">
                  −
                </button>
                <span>
                  {q.progress}/{q.target}
                </span>
                <button className="round" onClick={() => stepQuest(q.id, 1)} aria-label="Increase">
                  +
                </button>
              </span>
            ) : null}
            {q.focusMinutes > 0 && <span className="pill">⏱ {Math.round(q.focusMinutes)} min</span>}
            {editing && (
              <ActivityPicker value={q.activity} onChange={(activity) => updateQuest(q.id, { activity, activityLocked: true })} />
            )}
          </div>
          {q.target ? (
            <div className="bar good thin">
              <div style={{ width: `${(q.progress / q.target) * 100}%` }} />
            </div>
          ) : null}
        </div>
      </div>
      <div className="quest-actions">
        {!q.completedAt ? (
          <>
            <button
              className="btn small primary"
              onClick={() => {
                startTimer({ mode: 'pomodoro', questId: q.id });
                go('timer');
              }}
            >
              ▶ Focus
            </button>
            <button className="btn small" onClick={() => onSchedule(q.id)}>
              📅 Schedule
            </button>
            <button className="btn small" onClick={() => completeQuest(q.id)}>
              ✓ Done
            </button>
          </>
        ) : (
          <button className="btn small" onClick={() => reopenQuest(q.id)}>
            ↺ Reopen
          </button>
        )}
        <button className="btn small ghost" onClick={() => setEditing(!editing)} aria-label="Edit">
          ✎
        </button>
        <ConfirmButton className="btn small ghost" onConfirm={() => deleteQuest(q.id)} confirmLabel="Tap to delete" ariaLabel="Delete">
          🗑
        </ConfirmButton>
      </div>
    </li>
  );
}
