import { useState } from 'react';
import { getOverrides, KNOBS, setOverrides, tuneJson } from '../tuneStore';

const sections = [...new Set(KNOBS.map((k) => k.section))];
const group = (s: string) => s.split(':')[0];

/** Live tuning sheet (?tune=1). Values apply to the next run. Sliders are generated from the content tables (src/core/tune.ts). */
export function Tune({ onClose }: { onClose: () => void }) {
  const [o, setO] = useState(getOverrides);
  const [msg, setMsg] = useState('');
  const commit = (n: Record<string, number>) => { setOverrides(n); setO(getOverrides()); };
  const set = (id: string, v: number, def: number) => {
    if (!Number.isFinite(v)) return;
    const n = { ...o }; if (v === def) delete n[id]; else n[id] = v; commit(n);
  };
  const copy = async () => {
    const text = tuneJson();
    try { await navigator.clipboard.writeText(text); setMsg('Copied. Paste it into a Tell Kannan note.'); }
    catch { window.prompt('Copy this JSON', text); }
  };
  const groups = [...new Set(sections.map(group))];
  return (
    <div className="gu-modal" style={{ zIndex: 60 }}>
      <section className="gu-sheet gu-pause-sheet" role="dialog" aria-modal="true" aria-label="Tune" data-testid="tune-sheet">
        <h2 className="gu-heading">Tune</h2>
        <p className="gu-version">Applies from the next run. {Object.keys(o).length} changed.</p>
        <div className="gu-switches">
          <button type="button" className="gu-btn" onClick={copy}>Copy as JSON</button>
          <button type="button" className="gu-btn" onClick={() => { commit({}); setMsg('All reset.'); }}>Reset all</button>
        </div>
        {msg && <p className="gu-version">{msg}</p>}
        {groups.map((g) => (
          <details key={g}><summary className="gu-btn gu-btn--wide">{g}</summary>
            {sections.filter((s) => group(s) === g).map((s) => (
              <details key={s} style={{ marginLeft: 8 }}><summary>{s.includes(':') ? s.split(': ')[1] : s}</summary>
                <button type="button" className="gu-btn" onClick={() => { const n = { ...o }; for (const k of KNOBS) if (k.section === s) delete n[k.id]; commit(n); }}>Reset section</button>
                {KNOBS.filter((k) => k.section === s).map((k) => {
                  const v = o[k.id] ?? k.def;
                  return (
                    <label key={k.id} style={{ display: 'grid', gridTemplateColumns: '1fr 84px', gap: 4, alignItems: 'center', margin: '6px 0', fontWeight: k.id in o ? 700 : 400 }}>
                      <span>{k.label} <small>(def {+k.def.toFixed(3)})</small></span>
                      <input type="number" value={+v.toFixed(3)} step={k.step} min={k.min} max={k.max} inputMode="decimal" onChange={(e) => set(k.id, e.target.valueAsNumber, k.def)} />
                      <input style={{ gridColumn: '1 / 3' }} type="range" value={v} step={k.step} min={k.min} max={k.max} onChange={(e) => set(k.id, e.target.valueAsNumber, k.def)} />
                    </label>
                  );
                })}
              </details>
            ))}
          </details>
        ))}
        <button type="button" className="gu-btn gu-btn--primary gu-btn--wide" onClick={onClose}>Close</button>
      </section>
    </div>
  );
}
