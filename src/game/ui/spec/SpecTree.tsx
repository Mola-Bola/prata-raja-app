// The spec board: branch tabs (Core, Crisp, Soak, Heat), each a vertical path of labelled node cards. The picked card expands in place (cost, reason, Learn),
// so the action is always next to the thing you tapped. Every change goes through commit() with the pure src/meta/specTree.ts functions.
import { useEffect, useRef, useState } from 'react';

import { allocate, allocateBlock, respec, SPEC_NODES, specNode, specOf, specPointsLeft, specSpent, type Blocked, type SpecBranch, type SpecNode } from '@/meta/specTree';
import type { SaveV2 } from '@/meta/types';
import type { Commit } from '../stall/sheets';
import './SpecTree.css';

type Tab = 'core' | 'crisp' | 'soak' | 'heat';
const TABS: { id: Tab; name: string; branches: SpecBranch[] }[] = [
  { id: 'core', name: 'Core', branches: ['hands', 'body'] }, { id: 'crisp', name: 'Crisp', branches: ['crisp'] },
  { id: 'soak', name: 'Soak', branches: ['soak'] }, { id: 'heat', name: 'Heat', branches: ['heat'] },
];
const KIND_NAME = { small: 'Small', notable: 'Notable', keystone: 'Keystone' } as const;
const ICON = { small: '●', notable: '◆', keystone: '★' } as const;
const pts = (n: number) => `${n} point${n === 1 ? '' : 's'}`;
const nodesOf = (tab: Tab) => SPEC_NODES.filter(n => TABS.find(t => t.id === tab)!.branches.includes(n.branch));
const firstOpen = (save: SaveV2, tab: Tab) => (nodesOf(tab).find(n => !specOf(save).includes(n.id)) ?? nodesOf(tab)[0]).id;

/** Why a node cannot be learned, in words for a card. */
function reason(save: SaveV2, node: SpecNode, block: Blocked | null): string {
  if (block === 'needs') return `Needs ${node.needs.filter(r => !specOf(save).includes(r)).map(r => specNode(r)!.name).join(' and ')}`;
  if (block === 'keystone') return 'Only one keystone: reset to switch build';
  if (block === 'points') return `Needs ${pts(node.cost)} (you have ${specPointsLeft(save)})`;
  return '';
}

export function SpecTree({ save, commit, onClose, embedded }: { save: SaveV2; commit: Commit; onClose: () => void; embedded?: boolean }) {
  const [tab, setTab] = useState<Tab>('core');
  const [picked, setPicked] = useState('hands-1');
  const [confirm, setConfirm] = useState(false);
  const path = useRef<HTMLOListElement>(null);
  useEffect(() => { path.current?.querySelector('[data-picked]')?.parentElement?.scrollIntoView?.({ block: 'nearest' }); }, [tab]); // bring the picked card (and its Learn) above GO
  const have = specOf(save);
  const spent = specSpent(have);
  return (
    <section className={`spec${embedded ? ' spec--embedded' : ''}`} data-testid="spec-tree" aria-label="Spec tree">
      {!embedded && (
        <header className="spec-top">
          <h2>Spec</h2>
          <button type="button" className="gu-btn spec-close" data-testid="spec-close" onClick={onClose}>Close</button>
        </header>
      )}
      <div className="spec-bar">
        <span className="spec-points" data-testid="spec-points">{pts(specPointsLeft(save))} left</span>
        <span className="spec-spent" data-testid="spec-spent">{spent} spent</span>
        <button type="button" className="spec-reset" data-testid="spec-reset" disabled={!have.length} onClick={() => setConfirm(true)}>Reset all</button>
      </div>
      {confirm && (
        <div className="spec-confirm" role="alertdialog" aria-label="Reset all" data-testid="spec-confirm">
          <span>Refund {pts(spent)}?</span>
          <button type="button" className="gu-btn" data-testid="spec-reset-yes" onClick={() => { commit(s => respec(s)); setConfirm(false); }}>Yes</button>
          <button type="button" className="gu-btn" data-testid="spec-reset-cancel" onClick={() => setConfirm(false)}>Cancel</button>
        </div>
      )}
      <div className="spec-tabs" role="tablist" aria-label="Branches">
        {TABS.map(t => (
          <button key={t.id} type="button" role="tab" className="spec-tab" aria-selected={tab === t.id} data-testid={`spec-tab-${t.id}`}
            onClick={() => { setTab(t.id); setPicked(firstOpen(save, t.id)); }}>
            {t.name} <small>{nodesOf(t.id).filter(n => have.includes(n.id)).length}/{nodesOf(t.id).length}</small>
          </button>
        ))}
      </div>
      <ol ref={path} className="spec-path" aria-label={`${TABS.find(t => t.id === tab)!.name} nodes`}>
        {nodesOf(tab).map(n => {
          const b = allocateBlock(save, n.id), state = have.includes(n.id) ? 'learned' : b ? 'locked' : 'open';
          return (
            <li key={n.id} className="spec-item">
              <button type="button" className={`spec-card spec-${n.kind}`} data-testid={`spec-node-${n.id}`} data-state={state} data-picked={picked === n.id || undefined}
                aria-pressed={picked === n.id} onClick={(e) => { const li = e.currentTarget.parentElement; setPicked(n.id); requestAnimationFrame(() => li?.scrollIntoView?.({ block: 'nearest' })); }}>
                <span className="spec-icon" aria-hidden="true">{state === 'learned' ? '✓' : ICON[n.kind]}</span>
                <span className="spec-text">
                  <b>{n.name}</b>
                  <span>{n.line}</span>
                  {n.kind === 'keystone' && <em>Keystone: only one per build</em>}
                  {state === 'locked' && <em className="spec-need">{reason(save, n, b)}</em>}
                </span>
                <span className="spec-cost">{state === 'learned' ? 'Learned' : pts(n.cost)}</span>
              </button>
              {picked === n.id && (
                <div className="spec-act" data-testid="spec-detail">
                  <span>{KIND_NAME[n.kind]} · {pts(n.cost)}{b && b !== 'owned' ? ` · ${reason(save, n, b)}` : ''}</span>
                  <button type="button" className="gu-btn gu-btn--primary" data-testid="spec-learn" disabled={b !== null} onClick={() => commit(s => allocate(s, picked))}>
                    {b === 'owned' ? 'Learned' : `Learn (${n.cost})`}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
