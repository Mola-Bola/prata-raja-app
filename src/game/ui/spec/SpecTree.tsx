// The spec board: three branches (Crisp, Soak, Heat) around an inner Body/Hands ring. Tap a node for details, then Learn.
// Every change goes through commit() with the pure src/meta/specTree.ts functions. Kolam dots are decoration only.
import { useState } from 'react';

import { formatStat, statLabel } from '@/core/statRegistry';
import { allocate, allocateBlock, respec, SPEC_NODES, specNode, specOf, specPointsLeft, specSpent, type Blocked, type SpecBranch } from '@/meta/specTree';
import type { PlayerStats } from '@/core/types';
import type { SaveV2 } from '@/meta/types';
import type { Commit } from '../stall/sheets';
import './SpecTree.css';

const BRANCH_NAME: Record<SpecBranch, string> = { body: 'Body', hands: 'Hands', crisp: 'Crisp', soak: 'Soak', heat: 'Heat' };
const WHY: Record<Blocked, string> = {
  owned: 'Learned', unknown: 'Unknown', points: 'Not enough points', needs: 'Learn the nodes joined to it first',
  keystone: 'Only one keystone: Reset to switch build',
};

export function SpecTree({ save, commit, onClose }: { save: SaveV2; commit: Commit; onClose: () => void }) {
  const [picked, setPicked] = useState<string>('hands-1');
  const have = specOf(save);
  const node = specNode(picked)!;
  const block = allocateBlock(save, picked);
  return (
    <section className="spec" data-testid="spec-tree" aria-label="Spec tree">
      <header className="spec-top">
        <h2>Spec</h2>
        <span className="spec-points" data-testid="spec-points">{specPointsLeft(save)} points left</span>
        <button type="button" className="gu-btn spec-close" data-testid="spec-close" onClick={onClose}>Close</button>
      </header>
      <div className="spec-board" role="group" aria-label="Spec nodes">
        <svg className="spec-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {SPEC_NODES.flatMap(n => (n.needs.length ? n.needs : []).map(r => {
            const from = specNode(r)!;
            return <line key={`${r}-${n.id}`} x1={from.x} y1={from.y} x2={n.x} y2={n.y} data-on={have.includes(r) && have.includes(n.id) || undefined} />;
          }))}
        </svg>
        <span className="spec-centre" aria-hidden="true">✿</span>
        {SPEC_NODES.map(n => (
          <button key={n.id} type="button" className={`spec-node spec-${n.kind} spec-b-${n.branch}`} style={{ left: `${n.x}%`, top: `${n.y}%` }}
            data-testid={`spec-node-${n.id}`} data-state={have.includes(n.id) ? 'learned' : allocateBlock(save, n.id) ? 'locked' : 'open'}
            data-picked={picked === n.id || undefined} aria-pressed={picked === n.id} aria-label={`${n.name}, ${BRANCH_NAME[n.branch]} ${n.kind}`} onClick={() => setPicked(n.id)}>
            {n.kind === 'keystone' ? '★' : n.kind === 'notable' ? '◆' : '●'}
          </button>
        ))}
        {(['crisp', 'soak', 'heat'] as const).map(b => <span key={b} className={`spec-tag spec-t-${b}`} aria-hidden="true">{BRANCH_NAME[b]}</span>)}
      </div>
      <article className="spec-detail" data-testid="spec-detail">
        <h3>{node.name} <small>{BRANCH_NAME[node.branch]} {node.kind} · {node.cost} pt</small></h3>
        <p>{Object.entries(node.stats).map(([k, v]) => `${formatStat(k as keyof PlayerStats, v, true)} ${statLabel(k as keyof PlayerStats)}`).join(', ')}</p>
        {node.needs.length > 0 && <p>Needs: {node.needs.map(r => specNode(r)!.name).join(', ')}</p>}
        <div className="spec-actions">
          <button type="button" className="gu-btn gu-btn--primary" data-testid="spec-learn" disabled={block !== null}
            onClick={() => commit(s => allocate(s, picked))}>{block === 'owned' ? 'Learned' : 'Learn'}</button>
          <button type="button" className="gu-btn" data-testid="spec-reset" disabled={!have.length} onClick={() => commit(s => respec(s))}>Reset (free)</button>
        </div>
        {block && block !== 'owned' && <p className="spec-why" data-testid="spec-why">{WHY[block]}</p>}
        <p className="spec-spent">{specSpent(have)} points spent</p>
      </article>
    </section>
  );
}
