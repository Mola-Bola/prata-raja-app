import { CONTENT } from '@/content';
import { dipBonusLabel, linkedDipEffect, tagLabels } from '@/core/dipLinks';
import { matchingDipLink, simmerEffect } from '@/core/dipProgression';
import { signatureIdentity } from '@/core/signature';
import { buffMods, effectiveCooldown } from '@/core/stats';
import type { HitEffect, PlayerStats } from '@/core/types';

import { ASSET_URLS } from '../assets';
import type { HudState } from '../hub';
import { cardView } from './cardText';

const number = (value: number) => Number(value.toFixed(2)).toString();
const pct = (value: number) => `${number(value * 100)}%`;
const signedPct = (value: number) => `${value >= 0 ? '+' : ''}${pct(value)}`;

const STAT_LABELS: Record<keyof PlayerStats, string> = {
  maxHp: 'Max HP', regen: 'Healing / sec', moveSpeed: 'Move speed', dmgPct: 'Hit damage', throwSpeedPct: 'Throw speed',
  critChance: 'Crit chance', critMult: 'Crit damage ×', extraProjectiles: 'Extra projectiles', sizePct: 'Size / blast radius',
  dotPct: 'Damage over time', rangePct: 'Range', xpPct: 'XP', throwWhileMoving: 'Moving throw rate', revives: 'Revives granted',
  dmgTakenPct: 'Damage taken', dodge: 'Dodge chance', healOnLevelUpPct: 'Heal on level-up', goldPct: 'Gold',
};
const absoluteStats = new Set<keyof PlayerStats>(['maxHp', 'regen', 'moveSpeed', 'critMult', 'extraProjectiles', 'revives']);
const chanceStats = new Set<keyof PlayerStats>(['critChance', 'dodge', 'throwWhileMoving', 'healOnLevelUpPct']);
export function statText(key: keyof PlayerStats, value: number): string {
  return absoluteStats.has(key) ? number(value) : chanceStats.has(key) ? pct(value) : signedPct(value);
}

/** Numeric effect text is read from the owned level, never the next upgrade's card. */
export function effectText(fx: HitEffect, dotPct = 0): string {
  switch (fx.type) {
    case 'burn': return `Burn ${number(fx.dps * (1 + dotPct))} damage/sec for ${number(fx.time)}s.`;
    case 'sugar': return `Sticky: ${pct(fx.slowPct)} slow for ${number(fx.slowTime)}s. Sugar: ${number(fx.dpsPerStack * (1 + dotPct))} damage/sec per stack for ${number(fx.stackTime)}s; ${fx.crashAt} stacks stun for ${number(fx.crashStun)}s.`;
    case 'chill': return `${pct(fx.slowPerStack)} slow per chill for ${number(fx.time)}s; ${fx.freezeAt} chills freeze for ${number(fx.freezeTime)}s.`;
    case 'chain': return `${fx.jumps} spark jumps, ${number(fx.dmg)} base damage each, ${number(fx.range)} range.`;
    case 'tender': return `${number(fx.knockback)} shove; foes take ${signedPct(fx.dmgTakenPct)} damage for ${number(fx.time)}s.`;
    case 'stackDmg': return `${signedPct(fx.pctPerStack)} hit damage per stack, up to ${fx.maxStacks}, for ${number(fx.time)}s; ${signedPct(fx.critAtMax)} crit chance at max.`;
    case 'deathBlast': return `Burning foes explode on death: ${number(fx.dmg)} base damage, ${number(fx.radius)} radius.`;
    case 'haste': return `Every ${fx.everyHits} bread hits: ${signedPct(fx.throwSpeedPct)} throw speed for ${number(fx.time)}s.`;
    case 'spin': return `On bread hit: ${signedPct(fx.projSpeedPct)} shot speed, +${number(fx.critDmgPct)} crit multiplier for ${number(fx.time)}s.`;
    case 'healOnKill': return `Heal ${number(fx.hp)} HP per kill.`;
  }
}

export function RunBuild({ hud }: { hud: HudState }) {
  const stats = hud.stats;
  const mods = buffMods(hud.buffs, hud.dips, CONTENT);
  const active = hud.buffs.filter(b => b.time > 0 && hud.dips.some(d => d.id === (b.id === 'haste' ? 'teh-tarik' : b.id === 'spin' ? 'ghee' : 'chicken-curry')));
  return <div className="gu-build-body" tabIndex={0} data-testid="run-build">
    <p className="gu-build-note">Run paused · Wave {hud.wave} · {number(hud.time)}s</p>
    <section aria-labelledby="build-rate">
      <h3 id="build-rate">Shown DPS <strong data-testid="build-dps">{hud.shownDps.toFixed(1)}</strong></h3>
      <p>Hit + damage-over-time numbers in the last 5 simulation seconds, including overkill. Before 5s, divided by elapsed run time. Pause stops this clock; 5s without damage gives zero. Resets each run.</p>
    </section>
    <section aria-labelledby="build-rotis"><h3 id="build-rotis">Rotis · {hud.breads.length}</h3>
      {hud.breads.map(b => {
        const def = CONTENT.breads[b.id], st = def.levels[b.level - 1];
        const view = cardView({ kind: 'bread', id: b.id, level: b.level });
        const details = [`Base hit ${number(st.dmg)}`, def.motion === 'orbit' ? `${number(st.orbitHitGap)}s per foe per orb` : `Throw interval ${number(effectiveCooldown(st.cooldown, stats, mods))}s`, def.motion === 'orbit' ? `Orbit radius ${number(st.orbitRadius)}` : `Range ${number(st.range * (1 + stats.rangePct))}`];
        if (def.motion === 'wave') details.push(`Width ${number(st.width * (1 + stats.sizePct) * (1 + 0.25 * stats.extraProjectiles))}`);
        else details.push(`${def.motion === 'orbit' ? Math.max(1, st.count + stats.extraProjectiles) : Math.max(1, st.count) * (1 + stats.extraProjectiles)} ${def.motion === 'orbit' ? 'orbs' : 'shots / throw'}`);
        if (st.pierce) details.push(`${st.pierce} extra pierces`);
        if (st.hops) details.push(`${st.hops} hops · ${pct(st.hopFalloff)} loss / hop`);
        if (st.fragments) details.push(`${st.fragments} fragments · ${number(st.fragmentDmg)} base damage`);
        if (st.blast) details.push(`Blast radius ${number(st.blast * (1 + stats.sizePct))}`);
        if (st.zoneTime) details.push(`Zone ${number(st.zoneDps * (1 + stats.dotPct))} damage/sec · ${number(st.zoneTime)}s`);
        if (st.stun) details.push(`${number(st.stun)}s stun`);
        if (st.knockback) details.push(`${number(st.knockback)} shove`);
        if (st.armourPierce) details.push(`${pct(st.armourPierce)} shield bypass`);
        if (st.healOnHit) details.push(`${number(st.healOnHit)} HP / hit`);
        if (st.pull) details.push(`${number(st.pull)} pull`);
        if (st.critEvery) details.push(`Every ${st.critEvery}th throw crits`);
        const signature = (def.evolvedFrom?.bread ?? def.id) === hud.signatureBread;
        return <article className="gu-build-item" key={b.id} data-testid={`build-bread-${b.id}`}><img src={ASSET_URLS[view.sprite]} alt="" /><div><h4>{def.name} <span>L{b.level}</span></h4><p>{view.line}</p><small>{tagLabels(def.tags)}</small><p>{details.join(' · ')}</p>{st.zoneEffect && <p>{effectText(st.zoneEffect, stats.dotPct)}</p>}{signature && <p><b>Signature:</b> {signatureIdentity(hud.signatureBread!)}</p>}</div></article>;
      })}
      <p className="gu-build-note">Base hits precede your damage and crit bonuses, signature throws and enemy defence. Intervals assume a target and standing still; volleys must finish before the next throw. Distances use game units.</p>
    </section>
    <section aria-labelledby="build-dips"><h3 id="build-dips">Dips · {hud.dips.length}</h3>
      {!hud.dips.length && <p>No dips picked yet.</p>}
      {hud.dips.map(d => {
        const def = CONTENT.dips[d.id], view = cardView({ kind: 'dip', ...d });
        const linked = linkedDipEffect(CONTENT, d);
        const fx = matchingDipLink(CONTENT, d, d.linkedBread) ? simmerEffect(d.id, linked, hud.dipSimmer?.[d.id]) : linked;
        return <article className="gu-build-item" key={d.id} data-testid={`build-dip-${d.id}`}><img src={ASSET_URLS[view.sprite]} alt="" /><div><h4>{def.name} <span>L{d.level}</span></h4><small>{d.linkedBread ? `Linked to ${CONTENT.breads[d.linkedBread].name}` : view.scope} · {dipBonusLabel(def, d.linkedBread ? CONTENT.breads[d.linkedBread] : undefined)}</small><p>{effectText(fx, stats.dotPct)}</p>{matchingDipLink(CONTENT, d, d.linkedBread) && <small>Saved simmer L{hud.dipSimmer?.[d.id] ?? 1} included</small>}</div></article>;
      })}
      <p className="gu-build-note">Base damage precedes current hit bonuses and foe defence. Damage/sec values include your DoT bonus. Freeze and stun slow bosses; elites recover sooner.</p>
    </section>
    <section aria-labelledby="build-passives"><h3 id="build-passives">Passives · {hud.passives.length}</h3>
      {!hud.passives.length && <p>No passives picked yet.</p>}
      {hud.passives.map(p => {
        const def = CONTENT.passives[p.id], view = cardView({ kind: 'passive', ...p });
        return <article className="gu-build-item" key={p.id} data-testid={`build-passive-${p.id}`}><img src={ASSET_URLS[view.sprite]} alt="" /><div><h4>{view.name} <span>L{p.level}</span></h4><p>Per level: {def.desc}</p><p>Total: {(Object.keys(def.perLevel) as (keyof PlayerStats)[]).map(key => `${STAT_LABELS[key]} ${statText(key, def.perLevel[key]! * p.level)}`).join(' · ')}</p></div></article>;
      })}
    </section>
    <section aria-labelledby="build-stats"><h3 id="build-stats">Player stats</h3><p>Base + stall gear and training + passives. Temporary buffs are listed below.</p>
      <dl className="gu-build-stats" data-testid="build-stats">{(Object.keys(STAT_LABELS) as (keyof PlayerStats)[]).map(key => <div key={key}><dt>{STAT_LABELS[key]}</dt><dd>{statText(key, stats[key])}</dd></div>)}<div><dt>Revives left</dt><dd>{hud.revivesLeft}</dd></div></dl>
    </section>
    <section aria-labelledby="build-buffs"><h3 id="build-buffs">Active buffs</h3>
      {!active.length ? <p>No active temporary buffs.</p> : active.map(b => <p key={b.id}><b>{CONTENT.dips[b.id === 'haste' ? 'teh-tarik' : b.id === 'spin' ? 'ghee' : 'chicken-curry'].name}</b> · {number(b.time)}s left{b.id === 'stackDmg' && ` · ${b.stacks} stacks`}</p>)}
      <dl className="gu-build-stats" data-testid="build-effective"><div><dt>Current hit damage ×</dt><dd>{number(Math.max(0, 1 + stats.dmgPct + mods.dmgPct))}</dd></div><div><dt>Current throw rate ×</dt><dd>{number(Math.max(0.1, 1 + stats.throwSpeedPct + mods.throwSpeedPct))}</dd></div><div><dt>Current crit chance</dt><dd>{pct(Math.min(1, stats.critChance + mods.critChance))}</dd></div><div><dt>Current crit damage ×</dt><dd>{number(stats.critMult + mods.critMultAdd)}</dd></div><div><dt>Current shot speed ×</dt><dd>{number(1 + mods.projSpeedPct)}</dd></div></dl>
      <p className="gu-build-note">Buffs are included in current values and roti intervals. Individual throws have an 0.08s minimum interval. Crowd control and defence can change damage against each foe.</p>
    </section>
  </div>;
}
