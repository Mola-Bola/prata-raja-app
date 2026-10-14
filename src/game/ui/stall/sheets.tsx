// The stall's sheets: what opens when a prop is tapped. Each one reads the save it is given and changes it only through
// commit(update), which applies a pure src/meta update to the NEWEST save (so a double tap can never act on a stale copy).
import { useState } from 'react';

import { signatureIdentity } from '@/core/signature';
import { chooseSignature } from '@/meta/signature';
import { CONTENT } from '@/content';
import { canCook, cook, RECIPES, recipeKnown, runPools } from '@/meta/recipes';
import { makeRng } from '@/core/rng';
import { openChest } from '@/meta/chests';
import { equipItem, itemStats, RARITY_INFO, upgradeCost, upgradeItem } from '@/meta/gear';
import { collect, preview } from '@/meta/idle';
import { claim, STREAK_REWARDS } from '@/meta/streak';
import { buyTraining, respec, TRAINING_COSTS, TRAINING_STATS, trainingOpen } from '@/meta/training';
import { SLOTS, TRAINING_IDS, type GearItem, type SaveV2 } from '@/meta/types';

import { fmt } from '../format';
import { Switch, toggleSetting } from '../settings';
import { chestArt, evolutionRecipes, giftLabel, mergeCandidates, mergeGear, pityLines, rackItems, statLines, titleCase, unlockBeat } from './helpers';
import type { Art } from './StallProgress';

export type Commit = (update: (save: SaveV2) => SaveV2) => void;
type Ctx = { save: SaveV2; commit: Commit; art: Art };

/** A merge rolls its result from a seed; the preview and the committed update use the same one. */
const mergeSeed = (): number => Date.now() >>> 0;

function ItemTile({ item, art }: { item: GearItem; art: Art }) {
  return (
    <>
      <img className="sh-item-art" src={art(`gear/${item.baseId}`)} alt="" />
      <b>{titleCase(item.baseId)}</b>
      <span>
        {titleCase(item.rarity)} · Lv {item.level}
      </span>
    </>
  );
}

/** The coins in the jar, as one pill with the coin picture (the same one at the top of every sheet that spends). */
function Balance({ gold, art }: { gold: number; art: Art }) {
  return (
    <span className="sh-balance">
      <img src={art('ui/coins')} alt="" />
      {fmt(gold)} coins in the jar
    </span>
  );
}

/** Filled and empty dots: how far a track has come. */
function Pips({ step, of }: { step: number; of: number }) {
  return (
    <span className="sh-pips" role="img" aria-label={`${step} of ${of} steps`}>
      {Array.from({ length: of }, (_, i) => <i key={i} className={i < step ? 'on' : undefined} />)}
    </span>
  );
}

function Section({ icon, children }: { icon?: string; children: string }) {
  return (
    <h3 className="sh-section">
      {icon && <img src={icon} alt="" />}
      {children}
    </h3>
  );
}

export function GearSheet({ save, commit, art }: Ctx) {
  const [uid, setUid] = useState<string | null>(null);
  const rack = rackItems(save);
  const item = rack.find((i) => i.uid === uid);
  const candidates = item ? mergeCandidates(save, item) : [];
  const cost = item ? upgradeCost(item) : 0;
  const merge = () => {
    if (!item) return;
    const seed = mergeSeed();
    const merged = mergeGear(save, item, makeRng(seed));
    if (merged === save) return;
    commit((s) => mergeGear(s, item, makeRng(seed)));
    setUid(merged.inventory[merged.inventory.length - 1].uid);
  };
  return (
    <>
      <Balance gold={save.gold} art={art} />
      <Section>Wearing</Section>
      <div className="sh-slots" data-testid="gear-slots">
        {SLOTS.map((slot) => {
          const worn = rack.find((i) => i.uid === save.equipped[slot]);
          return (
            <button type="button" className="sh-tile" key={slot} data-testid={`gear-slot-${slot}`} onClick={() => setUid(worn?.uid ?? null)} aria-label={`${titleCase(slot)}${worn ? `: ${titleCase(worn.baseId)}` : ''}`}>
              <b>{titleCase(slot)}</b>
              {worn ? (
                <>
                  <img className="sh-item-art" src={art(`gear/${worn.baseId}`)} alt="" />
                  <span>Lv {worn.level}</span>
                </>
              ) : !save.unlocks[slot] ? (
                <>
                  <img className="sh-item-art" src={art('ui/lock')} alt="" />
                  <span>{unlockBeat(slot)}</span>
                </>
              ) : (
                <span>Empty</span>
              )}
            </button>
          );
        })}
      </div>
      <Section>Rack</Section>
      {rack.length > 0 && <p>Tap gear to wear it.</p>}
      <div className="sh-inventory">
        {rack.map((i) => (
          <button
            type="button"
            key={i.uid}
            className="sh-tile"
            data-testid="gear-item"
            style={{ borderColor: RARITY_INFO[i.rarity].color }}
            aria-pressed={i.uid === uid}
            onClick={() => {
              setUid(i.uid);
              commit((s) => equipItem(s, i.uid));
            }}
          >
            <ItemTile item={i} art={art} />
            {save.equipped[i.slot] === i.uid && <span>Wearing</span>}
          </button>
        ))}
      </div>
      {!rack.length && <p>{save.pendingChests.length ? 'Open your chests to fill the rack.' : 'Your next daydream brings a chest.'}</p>}
      {item && (
        <section className="sh-detail" data-testid="gear-detail">
          <b>{titleCase(item.baseId)}</b>
          <p>{save.unlocks[item.slot] ? 'Ready for your next daydream.' : `Wear it now. Its slot opens: ${unlockBeat(item.slot)}.`}</p>
          {statLines(itemStats(item)).map((line) => (
            <span key={line}>{line}</span>
          ))}
          <button type="button" className="gu-btn" data-testid="gear-upgrade" disabled={save.gold < cost || !Number.isFinite(cost)} onClick={() => commit((s) => upgradeItem(s, item.uid))}>
            Upgrade · {cost} coins
          </button>
          <button type="button" className="gu-btn" data-testid="gear-merge" disabled={!candidates.length} onClick={merge}>
            Merge three · next rarity
          </button>
          {!candidates.length && <p>{['common', 'uncommon'].includes(item.rarity) ? 'Needs three the same.' : 'Merging stops at Rare.'}</p>}
        </section>
      )}
    </>
  );
}

export function TrainingSheet({ save, commit, art }: Ctx) {
  const trained = TRAINING_IDS.some((id) => save.training[id] > 0);
  return (
    <>
      <Balance gold={save.gold} art={art} />
      {TRAINING_IDS.filter((id) => trainingOpen(save, id)).map((id) => {
        const step = save.training[id];
        const cost: number | undefined = TRAINING_COSTS[step];
        return (
          <section className="sh-detail" key={id} data-testid={`train-${id}`}>
            <b>{titleCase(id)}</b>
            <Pips step={step} of={TRAINING_COSTS.length} />
            <span>{statLines(TRAINING_STATS[id]).join(' · ')} each step</span>
            <button type="button" className="gu-btn" data-testid={`train-${id}-buy`} disabled={cost === undefined || save.gold < cost} onClick={() => commit((s) => buyTraining(s, id))}>
              {cost === undefined ? 'Fully trained' : `Train · ${cost} coins`}
            </button>
          </section>
        );
      })}
      <button type="button" className="gu-btn" data-testid="train-respec" disabled={!trained} onClick={() => commit(respec)}>
        Respec free · coins returned
      </button>
    </>
  );
}

export function IdleSheet({ save, commit, art, now }: Ctx & { now: Date }) {
  const [message, setMessage] = useState('');
  const p = preview(save, now);
  return (
    <>
      <img className="sh-feature-art" src={art('hub/tip-jar')} alt="" />
      <h3 data-testid="idle-waiting" className="sh-section sh-section--big">{fmt(p.gold)} coins waiting</h3>
      <p>
        Counted {Number(p.hours.toFixed(1))} h of {p.capHours} h
      </p>
      <p>{p.rate} coins each hour, while you’re away.</p>
      <button
        type="button"
        className="gu-btn gu-btn--primary"
        data-testid="idle-collect"
        disabled={!p.gold}
        onClick={() => {
          const t = new Date();
          const got = collect(save, t).rewards.gold;
          commit((s) => collect(s, t).save);
          if (got > 0) setMessage(`+${got} coins collected`);
        }}
      >
        Collect
      </button>
      {message && <p role="status">{message}</p>}
    </>
  );
}

export function CalendarSheet({ save, commit, art, now, go }: Ctx & { now: Date; go: (panel: 'chests') => void }) {
  const [message, setMessage] = useState('');
  const tz = -now.getTimezoneOffset();
  const gift = claim(save, now, tz);
  return (
    <>
      <Section icon={art('hub/streak')}>Daily gift</Section>
      <p>Two rest days weekly; never start over.</p>
      <div className="sh-calendar" data-testid="calendar-days">
        {STREAK_REWARDS.map((reward, i) => (
          <div className={`sh-day ${gift.rewards.day === i + 1 ? 'sh-day--today' : ''}`} key={i}>
            <b>Day {i + 1}</b>
            <span>{giftLabel(reward)}</span>
            {save.streak.day === i + 1 && !gift.rewards.day && <span>Collected</span>}
          </div>
        ))}
      </div>
      <button
        type="button"
        className="gu-btn gu-btn--primary"
        data-testid="calendar-claim"
        disabled={!gift.rewards.day}
        onClick={() => {
          const t = new Date();
          const got = claim(save, t, -t.getTimezoneOffset()).rewards;
          commit((s) => claim(s, t, -t.getTimezoneOffset()).save);
          if (got.chest) go('chests');
          else setMessage(got.day ? `Day ${got.day} gift collected` : 'Already collected today');
        }}
      >
        {gift.rewards.day ? `Claim day ${gift.rewards.day}` : 'Today’s gift collected'}
      </button>
      {message && <p role="status">{message}</p>}
      {gift.rewards.chest && <img className="sh-feature-art" src={art(chestArt(gift.rewards.chest.rarity))} alt="" />}
    </>
  );
}

export function ChestsSheet({ save, commit, art }: Ctx) {
  const [revealed, setRevealed] = useState<GearItem | null>(null);
  const chests = save.pendingChests.flatMap((uid) => save.inventory.filter((i) => i.uid === uid));
  const open = (uid: string) => {
    const { item } = openChest(save, uid);
    if (!item) return;
    commit((s) => openChest(s, uid).save);
    setRevealed(item);
  };
  return (
    <>
      <Section icon={art(chestArt('common'))}>Chests</Section>
      <p data-testid="chest-pity">{pityLines(save).join(' · ')}</p>
      {revealed && (
        <div key={revealed.uid} className="sh-reveal" role="status" data-testid="chest-reveal" style={{ borderColor: RARITY_INFO[revealed.rarity].color }}>
          <img className="sh-reveal-chest" src={art(chestArt(revealed.rarity))} alt="" />
          <div className="sh-reveal-item">
            <ItemTile item={revealed} art={art} />
            {statLines(itemStats(revealed)).map((line) => (
              <span key={line}>{line}</span>
            ))}
            <p>{save.unlocks.gear ? 'Tucked into your gear rack.' : `Kept safe until the rack opens: ${unlockBeat('gear')}.`}</p>
          </div>
        </div>
      )}
      {chests.map((item) => (
        <button type="button" className="gu-btn sh-chest" key={item.uid} data-testid="chest-open" onClick={() => open(item.uid)}>
          <img src={art(chestArt(item.rarity))} alt="" />
          Open chest
        </button>
      ))}
      {!chests.length && <p>Every daydream brings another chest.</p>}
    </>
  );
}

export function RecipeSheet({ save, commit, art }: Ctx) {
  return (
    <div className="sh-recipes" data-testid="recipe-book">
      <p>Cook foods to add them to your daydreams.</p>
      {RECIPES.map(recipe => {
        const def = recipe.unlocks.kind === 'bread' ? CONTENT.breads[recipe.unlocks.id] : CONTENT.dips[recipe.unlocks.id];
        const owned = recipeKnown(save, recipe);
        return (
          <section className="sh-detail" key={recipe.id}>
            <img className="sh-item-art" src={art(def.sprite)} alt="" />
            <b>{def.name}</b>
            <span>{Object.entries(recipe.costs).map(([m, n]) => `${n} ${m} (${save.materials[m as keyof typeof save.materials]})`).join(' · ')}</span>
            <button type="button" className="gu-btn" data-testid={`cook-${recipe.id}`} disabled={!canCook(save, recipe.id)} onClick={() => commit(s => cook(s, recipe.id))}>
              {owned ? 'Known recipe' : 'Cook recipe'}
            </button>
          </section>
        );
      })}
      <Section icon={art('hub/star')}>Evolutions</Section>
      <p>Max both foods in a run, then pick Evolve.</p>
      {evolutionRecipes(save).map(recipe => (
        <section className="sh-detail" key={recipe.id} data-testid="evolution-recipe" data-known={recipe.known}>
          <img className="sh-item-art" src={art(recipe.known ? recipe.sprite : 'ui/lock')} alt="" />
          <b>{recipe.known ? recipe.name : 'Unknown recipe'}</b>
          <span>{recipe.needs}</span>
          <span>{recipe.known ? 'Known · ready to evolve in a run' : 'Cook the missing foods first'}</span>
        </section>
      ))}
    </div>
  );
}

export function PreviewSheet({ art }: { kind: 'special'; art: Art }) {
  return (
    <>
      <img className="sh-feature-art sh-preview" src={art('hub/chef-special')} alt="" />
      <p>Coming soon</p>
      <p>A fresh daydream, shared by everyone.</p>
    </>
  );
}

/** The same two switches as the pause sheet, on the same save fields. */
export function SettingsSheet({ save, commit }: Pick<Ctx, 'save' | 'commit'>) {
  return (
    <div className="gu-switches" data-testid="settings-switches">
      <Switch label="Sound" on={save.settings.sfx} onClick={() => commit(toggleSetting('sfx'))} />
      <Switch label="Music" on={save.settings.music} onClick={() => commit(toggleSetting('music'))} />
      <Switch label="Haptics" on={save.settings.haptics} onClick={() => commit(toggleSetting('haptics'))} />
    </div>
  );
}

export function SignatureSheet({ save, commit, art }: Ctx) {
  if (!save.unlocks.signature) return <p>Unlocks: {unlockBeat('signature')}.</p>;
  return <>
    <p>Start each daydream with your favourite bread. The first two Fish Curry, Condensed Milk or Mint Chutney picks link to it.</p>
    <div className="sh-inventory">
      {runPools(save, CONTENT).breadPool.map(id => <button type="button" className="sh-tile" key={id}
        data-testid={`signature-${id}`} aria-pressed={save.signatureBread === id}
        onClick={() => commit(s => chooseSignature(s, id, CONTENT))}>
        <img className="sh-item-art" src={art(CONTENT.breads[id].sprite)} alt="" />
        <b>{CONTENT.breads[id].name}</b>
        <span>{signatureIdentity(id)}</span>
      </button>)}
    </div>
  </>;
}
