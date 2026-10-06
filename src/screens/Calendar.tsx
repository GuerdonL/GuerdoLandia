import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { ACTIVITY_INFO, classifyActivity } from '../game/classifier';
import { connect, disconnect, isConnected, syncRange } from '../google/calendar';
import { ActivityPicker } from './Quests';
import { useNow } from '../hooks';
import type { Activity, TimeBlock } from '../types';
import type { Tab } from '../App';

const DAY_START = 6;
const DAY_END = 24;
const HOUR_PX = 56;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7)); // Monday
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const fmtTime = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface Draft {
  id?: string;
  title: string;
  questId?: string;
  activity: Activity;
  activityTouched: boolean;
  start: string; // datetime-local
  minutes: number;
}

export function Calendar({ go, scheduleQuestId, clearSchedule }: { go: (t: Tab) => void; scheduleQuestId?: string; clearSchedule: () => void }) {
  const { blocks, quests, addBlock, updateBlock, deleteBlock, startTimer, googleClientId } = useStore();
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [gStatus, setGStatus] = useState<{ connected: boolean; busy: boolean; msg?: string }>({ connected: isConnected(), busy: false });
  const now = useNow(60_000);
  const scrollRef = useRef<HTMLDivElement>(null);

  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(day), i)), [day]);
  const dayBlocks = blocks
    .filter((b) => sameDay(new Date(b.start), day))
    .sort((a, b) => a.start.localeCompare(b.start));

  // Arriving from a quest's "Schedule" button: open a draft at the next half hour.
  useEffect(() => {
    if (!scheduleQuestId) return;
    const q = quests.find((x) => x.id === scheduleQuestId);
    const start = new Date();
    start.setMinutes(start.getMinutes() < 30 ? 30 : 60, 0, 0);
    if (q) setDraft({ title: q.title, questId: q.id, activity: q.activity, activityTouched: true, start: toLocalInput(start), minutes: 60 });
    clearSchedule();
  }, [scheduleQuestId, quests, clearSchedule]);

  useEffect(() => {
    // Scroll the timeline to roughly the current hour on open.
    const h = Math.max(DAY_START, new Date().getHours() - 1);
    scrollRef.current?.scrollTo({ top: (h - DAY_START) * HOUR_PX });
  }, []);

  const sync = async (interactive: boolean) => {
    setGStatus((s) => ({ ...s, busy: true, msg: undefined }));
    try {
      if (!isConnected()) {
        if (!interactive) return setGStatus({ connected: false, busy: false });
        await connect(googleClientId);
      }
      const from = addDays(startOfWeek(day), -7);
      const to = addDays(startOfWeek(day), 21);
      const r = await syncRange(() => useStore.getState(), from, to);
      setGStatus({ connected: true, busy: false, msg: `Synced · ${r.pulled} events in range` });
    } catch (e) {
      setGStatus({ connected: isConnected(), busy: false, msg: (e as Error).message });
    }
  };

  // Quietly re-sync when the visible week changes, if already connected.
  useEffect(() => {
    if (isConnected()) void sync(false);
  }, [week[0].getTime()]);

  const openNew = (hour: number) => {
    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    setDraft({ title: '', activity: 'desk', activityTouched: false, start: toLocalInput(start), minutes: 60 });
  };

  const openExisting = (b: TimeBlock) =>
    setDraft({
      id: b.id,
      title: b.title,
      questId: b.questId,
      activity: b.activity,
      activityTouched: true,
      start: toLocalInput(new Date(b.start)),
      minutes: Math.round((new Date(b.end).getTime() - new Date(b.start).getTime()) / 60000),
    });

  const save = () => {
    if (!draft || !draft.title.trim()) return;
    const start = new Date(draft.start);
    const end = new Date(start.getTime() + draft.minutes * 60000);
    const data = { title: draft.title.trim(), questId: draft.questId, activity: draft.activity, start: start.toISOString(), end: end.toISOString() };
    if (draft.id) updateBlock(draft.id, data);
    else addBlock(data);
    setDraft(null);
    setDay(startOfDay(start));
    if (isConnected()) void sync(false);
  };

  const nowDate = new Date(now);
  const nowTop = ((nowDate.getHours() + nowDate.getMinutes() / 60 - DAY_START) * HOUR_PX);

  return (
    <div className="screen calendar">
      <section className="card">
        <div className="row between">
          <h1>{day.toLocaleDateString([], { month: 'long', year: 'numeric' })}</h1>
          <div className="row gap">
            <button className="btn small" onClick={() => setDay(addDays(day, -7))} aria-label="Previous week">‹</button>
            <button className="btn small" onClick={() => setDay(startOfDay(new Date()))}>Today</button>
            <button className="btn small" onClick={() => setDay(addDays(day, 7))} aria-label="Next week">›</button>
          </div>
        </div>
        <div className="week-strip">
          {week.map((d) => {
            const count = blocks.filter((b) => sameDay(new Date(b.start), d)).length;
            return (
              <button key={d.toISOString()} className={`day ${sameDay(d, day) ? 'active' : ''} ${sameDay(d, new Date()) ? 'today' : ''}`} onClick={() => setDay(d)}>
                <small>{d.toLocaleDateString([], { weekday: 'short' })}</small>
                <strong>{d.getDate()}</strong>
                <span className="dots">{'•'.repeat(Math.min(count, 4))}</span>
              </button>
            );
          })}
        </div>
        <div className="gsync">
          {gStatus.connected ? (
            <>
              <button className="btn small" disabled={gStatus.busy} onClick={() => sync(true)}>
                {gStatus.busy ? 'Syncing…' : '🔄 Sync Google Calendar'}
              </button>
              <button className="btn small ghost" onClick={() => { disconnect(); setGStatus({ connected: false, busy: false }); }}>
                Disconnect
              </button>
            </>
          ) : (
            <button className="btn small" disabled={gStatus.busy} onClick={() => (googleClientId ? sync(true) : go('settings'))}>
              {googleClientId ? '🔗 Connect Google Calendar' : '⚙️ Set up Google Calendar'}
            </button>
          )}
          {gStatus.msg && <small className="muted">{gStatus.msg}</small>}
        </div>
      </section>

      <section className="card timeline-card">
        <div className="timeline" ref={scrollRef}>
          <div className="timeline-inner" style={{ height: (DAY_END - DAY_START) * HOUR_PX }}>
            {Array.from({ length: DAY_END - DAY_START }, (_, i) => (
              <button key={i} className="hour" style={{ top: i * HOUR_PX, height: HOUR_PX }} onClick={() => openNew(DAY_START + i)} aria-label={`Add block at ${DAY_START + i}:00`}>
                <span>{fmtTime(new Date(2000, 0, 1, DAY_START + i))}</span>
              </button>
            ))}
            {sameDay(day, nowDate) && nowTop > 0 && <div className="now-line" style={{ top: nowTop }} />}
            {dayBlocks.map((b) => {
              const s = new Date(b.start);
              const e = new Date(b.end);
              const top = Math.max(0, (s.getHours() + s.getMinutes() / 60 - DAY_START) * HOUR_PX);
              const height = Math.max(22, ((e.getTime() - s.getTime()) / 3_600_000) * HOUR_PX - 2);
              const live = s.getTime() <= now && e.getTime() > now;
              return (
                <div key={b.id} className={`block act-${b.activity} ${b.source} ${live ? 'live' : ''}`} style={{ top, height }} onClick={() => openExisting(b)}>
                  <div className="block-title">
                    {ACTIVITY_INFO[b.activity].emoji} {b.title}
                  </div>
                  <small>
                    {fmtTime(s)}–{fmtTime(e)} {b.googleEventId && '· G'}
                  </small>
                  {live && (
                    <button
                      className="chip"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        startTimer({ mode: 'block', blockId: b.id });
                        go('timer');
                      }}
                    >
                      ▶ Start
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {draft && (
        <div className="modal-backdrop" onClick={() => setDraft(null)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Time block">
            <h2>{draft.id ? 'Edit time block' : 'New time block'}</h2>
            <label className="field">
              <span>Quest</span>
              <select
                value={draft.questId ?? ''}
                onChange={(e) => {
                  const q = quests.find((x) => x.id === e.target.value);
                  setDraft({ ...draft, questId: q?.id, title: q ? q.title : draft.title, activity: q ? q.activity : draft.activity, activityTouched: !!q || draft.activityTouched });
                }}
              >
                <option value="">— none / just a block —</option>
                {quests.filter((q) => !q.completedAt).map((q) => (
                  <option key={q.id} value={q.id}>
                    {ACTIVITY_INFO[q.activity].emoji} {q.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Title</span>
              <input
                value={draft.title}
                onChange={(e) =>
                  setDraft({ ...draft, title: e.target.value, activity: draft.activityTouched ? draft.activity : classifyActivity(e.target.value).activity })
                }
                placeholder="What will you do?"
                autoFocus={!draft.id}
              />
            </label>
            <div className="row gap wrap">
              <label className="field grow">
                <span>Starts</span>
                <input type="datetime-local" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
              </label>
              <label className="field">
                <span>Minutes</span>
                <select value={draft.minutes} onChange={(e) => setDraft({ ...draft, minutes: Number(e.target.value) })}>
                  {[15, 25, 30, 45, 60, 90, 120, 180, 240].concat([draft.minutes]).filter((v, i, arr) => arr.indexOf(v) === i).sort((a, b) => a - b).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="field">
              <span>Animation</span>
              <ActivityPicker value={draft.activity} onChange={(activity) => setDraft({ ...draft, activity, activityTouched: true })} />
            </label>
            <div className="row gap between">
              {draft.id ? (
                <button
                  className="btn danger"
                  onClick={() => {
                    deleteBlock(draft.id!);
                    setDraft(null);
                    if (isConnected()) void sync(false);
                  }}
                >
                  Delete
                </button>
              ) : (
                <span />
              )}
              <div className="row gap">
                <button className="btn" onClick={() => setDraft(null)}>Cancel</button>
                <button className="btn primary" onClick={save} disabled={!draft.title.trim()}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
