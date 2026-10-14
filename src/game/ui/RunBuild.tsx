import { CONTENT } from '@/content';
import { dipBonusLabel, linkedDipEffect, tagLabel } from '@/core/dipLinks';
import { matchingDipLink, simmerEffect } from '@/core/dipProgression';
import { signatureIdentity } from '@/core/signature';
import { rotiCrisp, SOAK_RADIUS, soakFor } from '@/core/soak';
import { buffMods, effectiveCooldown } from '@/core/stats';
import type { BreadDef, BreadStats, HitEffect, PlayerStats } from '@/core/types';
import { useId, useState, type ReactNode } from 'react';

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
  soak: 'Soak (splash)', critSplash: 'Crit splash', splashCrit: 'Splash can crit',
  convertPct: 'Heat conversion', moreDmg: 'More damage', pierceFalloff: 'Pierce falloff',
};
const absoluteStats = new Set<keyof PlayerStats>(['maxHp', 'regen', 'moveSpeed', 'critMult', 'extraProjectiles', 'revives', 'splashCrit']);
const chanceStats = new Set<keyof PlayerStats>(['critChance', 'soak', 'critSplash', 'dodge', 'throwWhileMoving', 'healOnLevelUpPct']);
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

type Fx = { icon: string; text: string };
/** Short icon rows for a dip effect (the sentence form, effectText, stays for tests and tooltips). */
export function effectRows(fx: HitEffect, dotPct = 0): Fx[] {
  switch (fx.type) {
    case 'burn': return [{ icon: '🔥', text: `Burn ${number(fx.dps * (1 + dotPct))}/s · ${number(fx.time)}s` }];
    case 'sugar': return [{ icon: '🍯', text: `Sticky ${pct(fx.slowPct)} slow · ${number(fx.slowTime)}s` }, { icon: '🍬', text: `${number(fx.dpsPerStack * (1 + dotPct))}/s per stack · stun @${fx.crashAt} · ${number(fx.crashStun)}s` }];
    case 'chill': return [{ icon: '❄', text: `Chill ${pct(fx.slowPerStack)} · ${number(fx.time)}s` }, { icon: '🧊', text: `Freeze @${fx.freezeAt} · ${number(fx.freezeTime)}s` }];
    case 'chain': return [{ icon: '⚡', text: `${fx.jumps} jumps · ${number(fx.dmg)} dmg` }, { icon: '↔', text: `Range ${number(fx.range)}` }];
    case 'tender': return [{ icon: '💥', text: `${number(fx.knockback)} shove` }, { icon: '🎯', text: `Foes take ${signedPct(fx.dmgTakenPct)} · ${number(fx.time)}s` }];
    case 'stackDmg': return [{ icon: '📈', text: `${signedPct(fx.pctPerStack)}/stack · max ${fx.maxStacks} · ${number(fx.time)}s` }, { icon: '✨', text: `${signedPct(fx.critAtMax)} crit at max` }];
    case 'deathBlast': return [{ icon: '💣', text: `Death blast ${number(fx.dmg)} dmg · r${number(fx.radius)}` }];
    case 'haste': return [{ icon: '⏩', text: `Every ${fx.everyHits} hits: ${signedPct(fx.throwSpeedPct)} speed · ${number(fx.time)}s` }];
    case 'spin': return [{ icon: '🌀', text: `${signedPct(fx.projSpeedPct)} shot speed · +${number(fx.critDmgPct)} crit × · ${number(fx.time)}s` }];
    case 'healOnKill': return [{ icon: '💚', text: `Heal ${number(fx.hp)} HP per kill` }];
  }
}

const Pips = ({ level, max }: { level: number; max: number }) =>
  <span className="gb-pips" role="img" aria-label={`Level ${level} of ${max}`}>{Array.from({ length: max }, (_, i) => <i key={i} className={i < level ? 'on' : ''} />)}</span>;

const Bar = ({ label, value, max, text }: { label: string; value: number; max: number; text: string }) =>
  <div className="gb-bar" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)} aria-valuetext={text}>
    <span className="gb-bar-label">{label}</span><span className="gb-bar-track"><i style={{ width: `${Math.max(3, Math.min(1, value / (max || 1)) * 100)}%` }} /></span><b>{text}</b>
  </div>;

/** Section title with a collapsed-by-default ⓘ explanation. */
function Head({ id, title, count, note }: { id: string; title: string; count?: number; note?: ReactNode }) {
  const [open, setOpen] = useState(false); const nid = useId();
  return <>
    <h3 id={id}>{title}{count !== undefined && <span className="gb-count">{count}</span>}
      {note && <button type="button" className="gb-info" aria-expanded={open} aria-controls={nid} aria-label={`About ${title}`} onClick={() => setOpen(o => !o)}>ⓘ</button>}</h3>
    {note && <p id={nid} className="gu-build-note" hidden={!open}>{note}</p>}
  </>;
}

const rotiMetrics = (def: BreadDef, st: BreadStats, stats: PlayerStats, mods: ReturnType<typeof buffMods>) => {
  const orbit = def.motion === 'orbit';
  const wave = def.motion === 'wave';
  const interval = orbit ? st.orbitHitGap : effectiveCooldown(st.cooldown, stats, mods);
  return {
    dmg: st.dmg,
    rate: interval > 0 ? 1 / interval : 0,
    range: orbit ? st.orbitRadius : st.range * (1 + stats.rangePct),
    shots: wave ? 1 : orbit ? Math.max(1, st.count + stats.extraProjectiles) : Math.max(1, st.count) * (1 + stats.extraProjectiles),
    interval,
  };
};

export function RunBuild({ hud }: { hud: HudState }) {
  const stats = hud.stats;
  const mods = buffMods(hud.buffs, hud.dips, CONTENT);
  const active = hud.buffs.filter(b => b.time > 0 && hud.dips.some(d => d.id === (b.id === 'haste' ? 'teh-tarik' : b.id === 'spin' ? 'ghee' : 'chicken-curry')));
  const peak = { dmg: 1, rate: 0.01, range: 1, shots: 1 };
  for (const def of Object.values(CONTENT.breads)) for (const st of def.levels) {
    const m = rotiMetrics(def, st, stats, mods);
    peak.dmg = Math.max(peak.dmg, m.dmg); peak.rate = Math.max(peak.rate, m.rate); peak.range = Math.max(peak.range, m.range); peak.shots = Math.max(peak.shots, m.shots);
  }
  const crisp = Math.min(1, stats.critChance + mods.critChance);
  const mins = Math.floor(hud.time / 60), secs = Math.floor(hud.time % 60);
  return <div className="gu-build-body" tabIndex={0} data-testid="run-build">
    <section className="gb-build-head" aria-labelledby="build-rate">
      <div className="gb-build-dps"><span id="build-rate">DPS</span><strong data-testid="build-dps">{hud.shownDps.toFixed(1)}</strong></div>
      <div className="gb-build-run">
        {hud.route
          ? <Bar label="Distance" value={hud.route.dist} max={hud.route.bossAt} text={`${Math.round(hud.route.dist)} m / ${hud.route.bossAt} m`} />
          : <Bar label="Wave" value={hud.wave} max={hud.waves} text={`${hud.wave} / ${hud.waves}`} />}
        <p><span>⏱ {mins}:{String(secs).padStart(2, '0')}</span><span>Kannan Lv {hud.level}</span><span>Paused</span></p>
      </div>
      <Head id="build-rate-info" title="How DPS is counted" note="Hit + damage-over-time numbers in the last 5 simulation seconds, including overkill. Before 5s, divided by elapsed run time. Pause stops this clock; 5s without damage gives zero. Resets each run." />
    </section>
    <section aria-labelledby="build-rotis"><Head id="build-rotis" title="Rotis" count={hud.breads.length} note="Bars show base hits before your damage and crit bonuses, signature throws and enemy defence, scaled against the strongest roti level in the game. Speed assumes a target and standing still; volleys must finish before the next throw. Range uses game units." />
      {hud.breads.map(b => {
        const def = CONTENT.breads[b.id], st = def.levels[b.level - 1];
        const view = cardView({ kind: 'bread', id: b.id, level: b.level });
        const m = rotiMetrics(def, st, stats, mods);
        const traits: Fx[] = [];
        if (def.motion === 'wave') traits.push({ icon: '↔', text: `Width ${number(st.width * (1 + stats.sizePct) * (1 + 0.25 * stats.extraProjectiles))}` });
        if (st.pierce) traits.push({ icon: '➤', text: `${st.pierce} pierces` });
        if (st.hops) traits.push({ icon: '↩', text: `${st.hops} hops` }, { icon: '📉', text: `${pct(st.hopFalloff)} loss/hop` });
        else { const at = def.levels.findIndex(l => l.hops > 0); if (at > b.level - 1) traits.push({ icon: '↩', text: `ricochet at L${at + 1}` }); }
        if (st.fragments) traits.push({ icon: '✺', text: `${st.fragments} frags · ${number(st.fragmentDmg)}` });
        if (st.blast) traits.push({ icon: '💥', text: `Blast ${number(st.blast * (1 + stats.sizePct))}` });
        if (st.zoneTime) traits.push({ icon: '🔥', text: `Zone ${number(st.zoneDps * (1 + stats.dotPct))}/s · ${number(st.zoneTime)}s` });
        if (st.stun) traits.push({ icon: '💫', text: `${number(st.stun)}s stun` });
        if (st.knockback) traits.push({ icon: '↠', text: `${number(st.knockback)} shove` });
        if (st.armourPierce) traits.push({ icon: '🛡', text: `${pct(st.armourPierce)} bypass` });
        if (st.healOnHit) traits.push({ icon: '💚', text: `${number(st.healOnHit)} HP/hit` });
        if (st.pull) traits.push({ icon: '🧲', text: `${number(st.pull)} pull` });
        if (st.critEvery) traits.push({ icon: '✨', text: `Every ${st.critEvery}th crits` });
        const signature = (def.evolvedFrom?.bread ?? def.id) === hud.signatureBread;
        return <article className="gb-build-card" key={b.id} data-testid={`build-bread-${b.id}`}>
          <header><img src={ASSET_URLS[view.sprite]} alt="" /><div><h4>{def.name} <span className="gb-sr">L{b.level}</span></h4><Pips level={b.level} max={def.levels.length} /></div></header>
          <p className="gb-chips" aria-label="Tags">{def.tags.map(t => <span key={t} className={`gb-chip gb-tag-${t}`}>{tagLabel(t)}</span>)}</p>
          <Bar label="Damage" value={m.dmg} max={peak.dmg} text={`${number(st.dmg)}`} />
          <Bar label="Speed" value={m.rate} max={peak.rate} text={`${number(m.rate)}/s`} />
          <Bar label="Range" value={m.range} max={peak.range} text={`${Math.round(m.range)}`} />
          <Bar label={def.motion === 'orbit' ? 'Orbs' : 'Shots'} value={m.shots} max={peak.shots} text={number(m.shots)} />
          {(traits.length > 0 || st.zoneEffect) && <p className="gb-chips" aria-label="Traits">{traits.map(t => <span key={t.text} className="gb-chip gb-chip--fx"><span aria-hidden>{t.icon}</span>{t.text}</span>)}{st.zoneEffect && effectRows(st.zoneEffect, stats.dotPct).map(t => <span key={t.text} className="gb-chip gb-chip--fx"><span aria-hidden>{t.icon}</span>{t.text}</span>)}</p>}
          {signature && <p className="gb-badge" title={signatureIdentity(hud.signatureBread!)}>★ Signature · {signatureIdentity(hud.signatureBread!)}</p>}
        </article>;
      })}
    </section>
    <section aria-labelledby="build-dips"><Head id="build-dips" title="Dips" count={hud.dips.length} note="Base damage precedes current hit bonuses and foe defence. Damage/sec values include your DoT bonus. Freeze and stun slow bosses; elites recover sooner." />
      {!hud.dips.length && <p>No dips picked yet.</p>}
      {hud.dips.map(d => {
        const def = CONTENT.dips[d.id], view = cardView({ kind: 'dip', ...d });
        const linked = linkedDipEffect(CONTENT, d);
        const link = matchingDipLink(CONTENT, d, d.linkedBread);
        const fx = link ? simmerEffect(d.id, linked, hud.dipSimmer?.[d.id]) : linked;
        const bonus = dipBonusLabel(def, d.linkedBread ? CONTENT.breads[d.linkedBread] : undefined);
        return <article className="gb-build-card" key={d.id} data-testid={`build-dip-${d.id}`}>
          <header><img src={ASSET_URLS[view.sprite]} alt="" /><div><h4>{def.name} <span className="gb-sr">L{d.level}</span></h4><Pips level={d.level} max={def.levels.length} /></div></header>
          <p className="gb-chips">{d.linkedBread
            ? <><span className="gb-chip gb-chip--link"><span aria-hidden>🔗</span><span className="gb-sr">Linked to </span>→ {CONTENT.breads[d.linkedBread].name}</span><span className="gb-chip">{bonus}</span></>
            : <span className="gb-chip">{view.scope}</span>}</p>
          <ul className="gb-fx">{effectRows(fx, stats.dotPct).map(r => <li key={r.text}><span aria-hidden>{r.icon}</span>{r.text}</li>)}</ul>
          {link && <Bar label="Simmer" value={hud.dipSimmer?.[d.id] ?? 1} max={def.levels.length} text={`L${hud.dipSimmer?.[d.id] ?? 1}`} />}
        </article>;
      })}
    </section>
    <section aria-labelledby="build-passives"><Head id="build-passives" title="Passives" count={hud.passives.length} />
      {!hud.passives.length && <p>No passives picked yet.</p>}
      <div className="gb-grid">{hud.passives.map(p => {
        const def = CONTENT.passives[p.id], view = cardView({ kind: 'passive', ...p });
        return <article className="gu-build-chip" key={p.id} data-testid={`build-passive-${p.id}`}><img src={ASSET_URLS[view.sprite]} alt="" /><div><h4>{view.name}</h4><Pips level={p.level} max={def.maxLevel} />
          <small>{(Object.keys(def.perLevel) as (keyof PlayerStats)[]).map(key => `${STAT_LABELS[key]} ${statText(key, def.perLevel[key]! * p.level)}`).join(' · ')}</small></div></article>;
      })}</div>
    </section>
    <section aria-labelledby="build-axes"><Head id="build-axes" title="Crisp & Soak" note={`Crisp rotis add 5% crit; soggy rotis add 15% soak; curry, dhal and sambar dips add soak. Splash hits foes within ${number(SOAK_RADIUS * (1 + stats.sizePct))} of the target and passes on burn, sugar, chill and tender.`} />
      <div data-testid="build-axes-stats">
        <Bar label="Crisp" value={crisp} max={1} text={`${pct(crisp)} · crit ×${number(stats.critMult + mods.critMultAdd)}`} />
        <Bar label="Soak" value={stats.soak} max={1} text={`${pct(stats.soak)}${stats.critSplash > 0 ? ` (+${pct(stats.critSplash)} on crit)` : ''}${stats.splashCrit > 0 ? ' · splash crits' : ''}`} />
        {hud.breads.length > 1 && <details className="gb-more"><summary>Per roti</summary><dl className="gu-build-stats">{hud.breads.map(b => <div key={b.id}><dt>{CONTENT.breads[b.id].name}</dt><dd>Crisp {pct(Math.min(1, crisp + rotiCrisp(CONTENT, b.id)))} · Soak {pct(soakFor(CONTENT, stats, hud.dips, b.id))}</dd></div>)}</dl></details>}
      </div>
    </section>
    <section aria-labelledby="build-buffs"><Head id="build-buffs" title="Active buffs" note="Buffs are included in current values and roti intervals. Individual throws have an 0.08s minimum interval. Crowd control and defence can change damage against each foe." />
      {!active.length ? <p>No active temporary buffs.</p> : <p className="gb-chips">{active.map(b => <span key={b.id} className="gb-chip gb-chip--fx"><b>{CONTENT.dips[b.id === 'haste' ? 'teh-tarik' : b.id === 'spin' ? 'ghee' : 'chicken-curry'].name}</b> · {number(b.time)}s left{b.id === 'stackDmg' && ` · ${b.stacks} stacks`}</span>)}</p>}
      <dl className="gu-build-stats" data-testid="build-effective"><div><dt>Current hit damage ×</dt><dd>{number(Math.max(0, 1 + stats.dmgPct + mods.dmgPct))}</dd></div><div><dt>Current throw rate ×</dt><dd>{number(Math.max(0.1, 1 + stats.throwSpeedPct + mods.throwSpeedPct))}</dd></div><div><dt>Current crit chance</dt><dd>{pct(crisp)}</dd></div><div><dt>Current crit damage ×</dt><dd>{number(stats.critMult + mods.critMultAdd)}</dd></div><div><dt>Current shot speed ×</dt><dd>{number(1 + mods.projSpeedPct)}</dd></div></dl>
    </section>
    <section aria-labelledby="build-stats"><Head id="build-stats" title="Player stats" note="Base + stall gear and training + passives. Temporary buffs are listed above." />
      <details className="gb-more"><summary>Show all stats</summary>
        <dl className="gu-build-stats" data-testid="build-stats">{(Object.keys(STAT_LABELS) as (keyof PlayerStats)[]).map(key => <div key={key}><dt>{STAT_LABELS[key]}</dt><dd>{statText(key, stats[key])}</dd></div>)}<div><dt>Revives left</dt><dd>{hud.revivesLeft}</dd></div></dl></details>
    </section>
  </div>;
}
