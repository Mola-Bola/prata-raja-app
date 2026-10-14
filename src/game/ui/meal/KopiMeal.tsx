// Kopi uncle's counter: cook one meal from pantry materials; it buffs the next run only. commit() + src/meta/meals.ts.
import { MATERIALS, type Material, type SaveV2 } from '@/meta/types';
import { canCookMeal, cookMeal, mealEffect, mealLabel, mealOf, MEALS } from '@/meta/meals';
import type { Commit } from '../stall/sheets';
import '../system';
import '../spec/SpecTree.css';

export { mealLabel };

export function KopiMeal({ save, commit, onClose, embedded }: { save: SaveV2; commit: Commit; onClose: () => void; embedded?: boolean }) {
  const waiting = mealOf(save);
  return (
    <section className={`spec meal${embedded ? ' spec--embedded' : ''}`} data-testid="kopi-meal" aria-label="Kopi uncle's meals">
      {!embedded && (
        <header className="spec-top">
          <h2>Kopi uncle</h2>
          <button type="button" className="u-plain u-round" aria-label="Close" data-testid="meal-close" onClick={onClose}><i className="ic ic-x" aria-hidden="true" /></button>
        </header>
      )}
      <p data-testid="meal-status">{waiting ? `Ready for your next run: ${mealLabel(save)}` : 'Cook one meal. It lasts for your next run.'}</p>
      {MEALS.map(m => (
        <article className="spec-detail" key={m.id} data-testid={`meal-${m.id}`}>
          <h3>{m.name} <small>{mealEffect(m)}</small></h3>
          <p>{m.line}</p>
          <p className="spec-spent">{MATERIALS.filter(k => m.cost[k]).map((k: Material) => `${m.cost[k]} ${k} (have ${save.materials[k]})`).join(' · ')}</p>
          <div className="spec-actions">
            <button type="button" className="u-go" data-testid={`cook-meal-${m.id}`} disabled={!canCookMeal(save, m.id)} onClick={() => commit(s => cookMeal(s, m.id))}>Cook</button>
          </div>
        </article>
      ))}
    </section>
  );
}
