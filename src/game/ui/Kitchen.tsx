import { useEffect, useRef, useState } from 'react';

import { brandWords } from '@/brand';
import { CONTENT } from '@/content';
import { DEFAULT_KITCHEN_TUNING, KITCHEN_LIMITS, KITCHEN_LINKABLE_DIPS, kitchenBreadLevelCap, type KitchenConfig, type KitchenTuning } from '@/core/kitchen';
import type { BreadId, DipId } from '@/core/types';

import type { Hub, HubEvents } from '../hub';
import { TellButton } from './FeedbackSheet';
import './Kitchen.css';

const knobs: { key: keyof KitchenTuning; label: string; step: number }[] = [
  { key: 'hp', label: 'Max HP', step: 1 }, { key: 'damage', label: 'Damage ×', step: 0.1 },
  { key: 'throwSpeed', label: 'Throw speed ×', step: 0.1 }, { key: 'crit', label: 'Crit chance', step: 0.01 },
  { key: 'moveFire', label: 'Moving fire ×', step: 0.05 },
];
const seed = () => Math.floor(Math.random() * 0x100000000);
const initial = (): KitchenConfig => ({ seed: seed(), chapterId: CONTENT.chapters[0].id, wave: 1, breads: [{ id: 'kosong', level: 1 }], dips: [], tuning: { ...DEFAULT_KITCHEN_TUNING } });

export function Kitchen({ hub, ready, onStart, onExit }: { hub: Hub; ready: boolean; onStart: () => void; onExit: () => void }) {
  const [config, setConfig] = useState(initial);
  const [tuning, setTuning] = useState<KitchenTuning>({ ...DEFAULT_KITCHEN_TUNING });
  const [stats, setStats] = useState<HubEvents['kitchenStats'] | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [setup, setSetup] = useState(true);
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);
  const sheet = useRef<HTMLElement>(null);
  const chapter = CONTENT.chapters.find(ch => ch.id === config.chapterId)!;

  useEffect(() => {
    const offs = [hub.on('kitchenStart', ({ tuning: next }) => { setStats(null); setEnd(null); setRunning(true); setPaused(false); setTuning(next); }),
      hub.on('kitchenStats', next => setStats(next)),
      hub.on('kitchenEnd', ({ reason, stats: next }) => { setStats(next); setRunning(false); setPaused(false); setEnd(reason === 'won' ? 'Taste test complete' : reason === 'lost' ? 'Kannan needs a breather' : 'Test stopped'); }),
      hub.on('paused', () => setPaused(true))];
    return () => offs.forEach(off => off());
  }, [hub]);
  useEffect(() => {
    if (!setup) return;
    const before = document.activeElement as HTMLElement | null;
    sheet.current?.focus();
    return () => before?.focus();
  }, [setup]);

  const start = () => {
    setError('');
    try {
      onStart();
      hub.controls?.startKitchen({ ...config, tuning });
      setSetup(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not start test'); }
  };
  const changeBread = (index: number, id: string) => setConfig(c => {
    const breads = c.breads.filter((_, i) => i !== index);
    if (id) breads.splice(index, 0, { id: id as BreadId, level: 1 });
    return { ...c, breads, dips: c.dips.map(d => d.linkedBread && !breads.some(b => b.id === d.linkedBread) ? { id: d.id, level: d.level } : d) };
  });
  const changeDip = (index: number, id: string) => setConfig(c => {
    const dips = c.dips.filter((_, i) => i !== index);
    if (id) dips.splice(index, 0, { id: id as DipId, level: 1 });
    return { ...c, dips };
  });
  const tune = (key: keyof KitchenTuning, value: number) => {
    const next = { ...tuning, [key]: value };
    setTuning(next);
    if (running) hub.controls?.tuneKitchen(next);
  };
  const resume = () => { setPaused(false); hub.controls?.resume(); };
  const closeSetup = () => { setSetup(false); if (running) resume(); };
  const openSetup = () => { if (running) { hub.controls?.pause(); setPaused(true); } setSetup(true); };
  return <div className="kt-root" data-testid="kitchen">
    <header className="kt-top" inert={setup}>
      <div><h1>{brandWords.words.kitchen}</h1><p>Experiment freely · progress stays untouched</p></div>
      <button type="button" className="gu-btn" data-testid="kitchen-exit" onClick={() => { hub.controls?.stopKitchen(); onExit(); }}>Stall</button>
    </header>
    <div className="kt-metrics" inert={setup} data-testid="kitchen-stats" aria-label="Test metrics">
      <span>HP <b>{stats ? `${Math.max(0, Math.ceil(stats.hp))}/${Math.ceil(stats.maxHp)}` : '—'}</b></span>
      <span>Wave <b>{stats?.wave ?? config.wave}</b></span><span>Time <b>{Math.floor(stats?.time ?? 0)}s</b></span>
      <span>Kills <b>{stats?.kills ?? 0}</b></span><span>Shown damage <b>{Math.round(stats?.damageShown ?? 0)}</b></span>
      <span>Shown / sec <b>{(stats?.damageShownPerSecond ?? 0).toFixed(1)}</b></span>
      <small>Damage includes overkill · {stats?.phase ?? 'Ready'}</small>
    </div>
    <footer className="kt-dock" inert={setup}>
      {(end || paused) && <p role="status">{end ?? 'Test paused'}</p>}
      <div className="kt-actions">
        <button type="button" className="gu-btn" data-testid="kitchen-setup" onClick={openSetup}>Setup</button>
        <button type="button" className="gu-btn" data-testid="kitchen-restart" disabled={!ready} onClick={start}>Restart</button>
        <button type="button" className="gu-btn" data-testid="kitchen-pause" disabled={!running} onClick={() => { if (paused) resume(); else { hub.controls?.pause(); setPaused(true); } }}>{paused ? 'Resume' : 'Pause'}</button>
      </div>
      <button type="button" className="kt-disclosure" aria-expanded={live} data-testid="kitchen-live" onClick={() => setLive(v => !v)}>Live tuning {live ? '▾' : '▴'}</button>
      {live && <div className="kt-knobs" data-testid="kitchen-knobs">{knobs.map(({ key, label, step }) => <label key={key}>{label}<output>{key === 'crit' ? `${Math.round(tuning[key] * 100)}%` : tuning[key].toFixed(key === 'hp' ? 0 : 2)}</output><input data-testid={`kitchen-tune-${key}`} type="range" aria-label={label} min={KITCHEN_LIMITS[key][0]} max={KITCHEN_LIMITS[key][1]} step={step} value={tuning[key]} onChange={e => tune(key, Number(e.target.value))} /></label>)}</div>}
      <TellButton />
    </footer>
    {setup && <div className="kt-setup-wrap">
      <section ref={sheet} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Kitchen setup" className="gu-sheet kt-sheet" data-testid="kitchen-sheet" onKeyDown={e => {
        if (e.key === 'Escape') closeSetup();
        if (e.key !== 'Tab') return;
        const controls = sheet.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,select');
        if (!controls?.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === sheet.current)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }}>
        <header><h2>Set the tawa</h2><button type="button" className="gu-btn" aria-label="Close setup" data-testid="kitchen-close" onClick={closeSetup}>×</button></header>
        <div className="kt-fields">
          <label>Chapter<select data-testid="kitchen-chapter" value={config.chapterId} onChange={e => setConfig(c => ({ ...c, chapterId: e.target.value, wave: 1 }))}>{CONTENT.chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}</select></label>
          <label>Wave / boss<select data-testid="kitchen-wave" value={config.wave} onChange={e => setConfig(c => ({ ...c, wave: Number(e.target.value) }))}>{chapter.waves.map((w, i) => <option key={i} value={i + 1}>Wave {i + 1}{w.boss ? ` · ${CONTENT.bosses[w.boss].name}` : ''}</option>)}</select></label>
          <label>Repeatable seed<input type="number" data-testid="kitchen-seed" min="0" max="4294967295" step="1" value={config.seed} onChange={e => setConfig(c => ({ ...c, seed: Number(e.target.value) }))} /></label>
          <button type="button" className="gu-btn" data-testid="kitchen-new-seed" onClick={() => setConfig(c => ({ ...c, seed: seed() }))}>New seed</button>
        </div>
        <h3>Rotis · up to four</h3>
        {Array.from({ length: 4 }, (_, i) => { const b = config.breads[i]; return <div className="kt-slot" key={i}>
          <label>Roti {i + 1}<select data-testid={`kitchen-bread-${i}`} value={b?.id ?? ''} onChange={e => changeBread(i, e.target.value)}><option value="">Empty</option>{Object.values(CONTENT.breads).map(def => <option key={def.id} value={def.id} disabled={config.breads.some((other, j) => j !== i && (CONTENT.breads[other.id].evolvedFrom?.bread ?? other.id) === (def.evolvedFrom?.bread ?? def.id))}>{def.name}{def.evolvedFrom ? ' · evolved' : ''}</option>)}</select></label>
          <label>Level<select data-testid={`kitchen-bread-level-${i}`} disabled={!b} value={b?.level ?? 1} onChange={e => setConfig(c => ({ ...c, breads: c.breads.map((item, j) => j === i ? { ...item, level: Number(e.target.value) } : item) }))}>{Array.from({ length: b ? kitchenBreadLevelCap(CONTENT, b.id) : 1 }, (_, n) => <option key={n} value={n + 1}>L{n + 1}</option>)}</select></label>
        </div>; })}
        <h3>Dips · up to four, two links</h3>
        {Array.from({ length: 4 }, (_, i) => { const d = config.dips[i]; return <div className="kt-dip" key={i}><div className="kt-slot">
          <label>Dip {i + 1}<select data-testid={`kitchen-dip-${i}`} value={d?.id ?? ''} onChange={e => changeDip(i, e.target.value)}><option value="">Empty</option>{Object.values(CONTENT.dips).map(def => <option key={def.id} value={def.id} disabled={config.dips.some((other, j) => j !== i && other.id === def.id)}>{def.name}</option>)}</select></label>
          <label>Level<select data-testid={`kitchen-dip-level-${i}`} disabled={!d} value={d?.level ?? 1} onChange={e => setConfig(c => ({ ...c, dips: c.dips.map((item, j) => j === i ? { ...item, level: Number(e.target.value) } : item) }))}>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>L{n}</option>)}</select></label></div>
          {d && <label>Applies to<select data-testid={`kitchen-link-${i}`} value={d.linkedBread ?? ''} disabled={!KITCHEN_LINKABLE_DIPS.includes(d.id)} onChange={e => setConfig(c => ({ ...c, dips: c.dips.map((item, j) => j === i ? { id: item.id, level: item.level, ...(e.target.value ? { linkedBread: e.target.value as BreadId } : {}) } : item) }))}><option value="">All rotis</option>{config.breads.map(b => <option key={b.id} value={b.id} disabled={!d.linkedBread && config.dips.filter(other => other.linkedBread).length >= 2}>{CONTENT.breads[b.id].name}</option>)}</select></label>}
        </div>; })}
        <p className="kt-help">Only Fish Curry, Condensed Milk and Mint Chutney can target a roti. Other dips apply to all. Evolutions have one level.</p>
        {error && <p role="alert">{error}</p>}
        <button type="button" className="gu-btn gu-btn--primary gu-btn--wide" data-testid="kitchen-start" disabled={!ready || !config.breads.length || !Number.isInteger(config.seed) || config.seed < 0 || config.seed > 0xffffffff} onClick={start}>{running ? 'Start fresh test' : 'Start taste test'}</button>
        <TellButton />
      </section>
    </div>}
  </div>;
}
