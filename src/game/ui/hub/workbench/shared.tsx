import { useRef, useState } from 'react';

import { MATERIALS, type Material, type SaveV2 } from '@/meta/types';
import { fmt } from '../../format';
import { titleCase } from '../../stall/helpers';
import type { Art } from '../../stall/StallProgress';
import './workbench.css';

export type Cost = { gold: number; materials: Partial<Record<Material, number>> };
export const short = (save: SaveV2, cost: Cost) => save.gold < cost.gold || MATERIALS.some(m => save.materials[m] < (cost.materials[m] ?? 0));

export function CostRow({ save, cost, art }: { save: SaveV2; cost: Cost; art: Art }) {
  return (
    <div className="fg-cost" data-testid="wb-cost">
      <span className="fg-need" data-short={save.gold < cost.gold || undefined}><img src={art('ui/coins')} alt="Coins" />{fmt(save.gold)}/{fmt(cost.gold)}</span>
      {MATERIALS.filter(m => cost.materials[m]).map(m => (
        <span key={m} className="fg-need" data-short={save.materials[m] < cost.materials[m]! || undefined}>
          <img src={art(`materials/${m}`)} alt={titleCase(m)} />{save.materials[m]}/{cost.materials[m]}
        </span>
      ))}
    </div>
  );
}

/** A short message line and a "shake this id" flag that clear themselves. */
export function useNudge() {
  const [msg, setMsg] = useState('');
  const [shake, setShake] = useState<string | null>(null);
  const t = useRef(0);
  const nudge = (text: string, id?: string) => {
    setMsg(text);
    setShake(id ?? null);
    window.clearTimeout(t.current);
    t.current = window.setTimeout(() => setShake(null), 420);
  };
  return { msg, shake, nudge };
}
