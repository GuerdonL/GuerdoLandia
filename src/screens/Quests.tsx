import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { ACTIVITY_INFO, ALL_ACTIVITIES, classifyActivity, parseTarget } from '../game/classifier';
import type { Activity, Quest } from '../types';
import type { Tab } from '../App';
import { ConfirmButton } from '../components/ConfirmButton';
import { ARCHETYPES, ARCHETYPE_FOR_ACTIVITY } from '../adventure/archetypes';
import { builtInReward } from '../adventure/loot';

const EXAMPLES = ['Find 10 jobs to apply to', 'Finish the bookshelf project', 'Call mom', 'Deep clean the kitchen', 'Go for a 20 minute run', 'Read 3 chapters'];

export function Quests({ go, onSchedule }: { go: (t: Tab) => void; onSchedule: (questId: string) => void }) {
  const quests = useStore((s) => s.quests);
  const addQuest = useStore((s) => s.addQuest);
  const [text, setText] = useState('');
  const [rewardText, setRewardText] = useState('');
  const [override, setOverride] = useState<Activity | null>(null);
  const [showDone, setShowDone] = useState(false);

  const guess = useMemo(() => classifyActivity(text), [text]);
  const target = useMemo(() => parseTarget(text), [text]);
  const activity = override ?? guess.activity;

  const active = quests.filter((q) => !q.completedAt);
  const done = quests.filter((q) => q.completedAt);

  const submit = () => {
    if (!text.trim()) return;
    addQuest(text, override ?? undefined, rewardText);
    setText('');
    setRewardText('');
    setOverride(null);
  };

  return (
    <div className="screen quests">
      <section className="card">
        <h1>Quests</h1>
        <p className="hint">Type a life task in your own words. It becomes a quest your hero takes on during its time blocks.</p>
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
          <>
            <label className="field reward-field" htmlFor="new-reward">
              <span>What will finishing it give you in real life? (optional)</span>
              <input id="new-reward" value={rewardText} onChange={(e) => setRewardText(e.target.value)} placeholder="e.g. money, peace of mind, a clean kitchen" />
            </label>
            <div className="guess">
              <span>
                Quest: <strong>{questTypeLabel(activity)}</strong>
                {!override && guess.matched.length > 0 && <small> (from “{guess.matched.slice(0, 3).join('”, “')}”)</small>}
              </span>
              {target && <span className="pill">Counts to {target}</span>}
              <ActivityPicker value={activity} onChange={setOverride} />
            </div>
            <p className="hint">
              Loot: {(() => {
                const r = builtInReward(text, ARCHETYPE_FOR_ACTIVITY[activity], rewardText);
                return `${r.icon} ${r.name}`;
              })()}
            </p>
          </>
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

/** "🧹 Cleansing (cleaning)": the fantasy quest type plus the real activity behind it. */
export function questTypeLabel(a: Activity) {
  return `${ACTIVITY_INFO[a].emoji} ${ARCHETYPES[ARCHETYPE_FOR_ACTIVITY[a]].name} (${ACTIVITY_INFO[a].label.toLowerCase()})`;
}

export function ActivityPicker({ value, onChange }: { value: Activity; onChange: (a: Activity) => void }) {
  return (
    <select className="activity-picker" value={value} onChange={(e) => onChange(e.target.value as Activity)} aria-label="Quest type">
      {ALL_ACTIVITIES.filter((a) => a !== 'idle').map((a) => (
        <option key={a} value={a}>
          {questTypeLabel(a)}
        </option>
      ))}
    </select>
  );
}

function QuestItem({ q, go, onSchedule }: { q: Quest; go: (t: Tab) => void; onSchedule: (id: string) => void }) {
  const { stepQuest, completeQuest, reopenQuest, deleteQuest, updateQuest, startTimer, restageQuest, restageQuestWithAi } = useStore();
  const hasAi = useStore((s) => !!s.ai.apiKey);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(q.title);
  const [reward, setReward] = useState(q.rewardText ?? '');
  const [aiState, setAiState] = useState<{ busy: boolean; msg?: string }>({ busy: false });
  const arch = q.staging ? ARCHETYPES[q.staging.archetype] : undefined;
  const scene = q.staging?.customScene;

  const reimagine = async () => {
    setAiState({ busy: true });
    try {
      const { imagesFailed } = await restageQuestWithAi(q.id);
      setAiState({
        busy: false,
        msg: imagesFailed
          ? 'Reimagined ✨ The image service turned some pictures away, so built-in art stands in.'
          : 'Reimagined ✨',
      });
    } catch (e) {
      setAiState({ busy: false, msg: (e as Error).message });
    }
  };

  return (
    <li className={`card quest ${q.completedAt ? 'is-done' : ''}`}>
      <div className="quest-main">
        <span className="quest-emoji" title={arch?.name}>
          {q.reward?.icon ?? ACTIVITY_INFO[q.activity].emoji}
        </span>
        <div className="quest-body">
          {editing ? (
            <form
              className="quest-edit"
              onSubmit={(e) => {
                e.preventDefault();
                const patch: Partial<Quest> = { title: title.trim() || q.title };
                if (!q.activityLocked) patch.activity = classifyActivity(patch.title!).activity;
                updateQuest(q.id, patch);
                // Rewards are fixed when a quest is written or edited.
                restageQuest(q.id, { rewardText: reward });
                setEditing(false);
              }}
            >
              <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Quest" autoFocus />
              <input value={reward} onChange={(e) => setReward(e.target.value)} aria-label="Real-life reward" placeholder="Real-life reward (e.g. money)" />
              <div className="row gap wrap">
                <ActivityPicker
                  value={q.activity}
                  onChange={(activity) => {
                    updateQuest(q.id, { activity, activityLocked: true });
                    restageQuest(q.id, { rewardText: reward, archetype: ARCHETYPE_FOR_ACTIVITY[activity] });
                  }}
                />
                <button className="btn small primary">Save</button>
              </div>
            </form>
          ) : (
            <div className="quest-title">{q.title}</div>
          )}
          <div className="quest-meta">
            {arch && (
              <span className="pill" title={scene?.setting ?? arch.place}>
                ⚔️ {scene?.title ?? arch.name}
                {q.staging?.source === 'ai' ? ' ✨' : ''}
              </span>
            )}
            {q.reward && (
              <span className="pill" title={q.reward.description}>
                {q.reward.icon} {q.reward.name}
              </span>
            )}
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
            {!q.completedAt && (q.progressPct ?? 0) > 0 && <span className="pill">{q.progressPct}% done</span>}
            {q.focusMinutes > 0 && <span className="pill">⏱ {Math.round(q.focusMinutes)} min</span>}
          </div>
          {aiState.msg && <small className="muted">{aiState.msg}</small>}
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
              ⚔️ Adventure now
            </button>
            <button className="btn small" onClick={() => onSchedule(q.id)}>
              📅 Schedule
            </button>
            <button className="btn small" onClick={() => completeQuest(q.id)}>
              🏆 Complete
            </button>
          </>
        ) : (
          <button className="btn small" onClick={() => reopenQuest(q.id)}>
            ↺ Reopen
          </button>
        )}
        {hasAi && !q.completedAt && (
          <button className="btn small ghost" onClick={reimagine} disabled={aiState.busy}>
            {aiState.busy ? 'Imagining…' : '✨ Reimagine'}
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
