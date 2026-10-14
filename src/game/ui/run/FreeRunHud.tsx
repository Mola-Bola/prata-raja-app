// The free-movement run HUD (round 7 mockup, docs/superpowers/round7-hub.html#hud). GameUi shows it when HudState.free is set;
// the counter HUD stays in GameUi.tsx. Layout: nothing bottom-left (the renderer draws the joystick there); top bar = level ring
// and HP | place and distance or boss | coins and pause, one thin XP line under it; the meal chip under that; bottom-right
// the dip-socket readouts above the big Dodge button.
import { useEffect, useState } from 'react';

import { CONTENT } from '@/content';
import type { Hub, HudState } from '../../hub';
import { ASSET_URLS } from '../../assets';
import { fmt } from '../format';
import './FreeRunHud.css';

/** The sim's dash cooldown (FREE.dashCd). HudState does not expose it, so the button times it on its own. */
const DODGE_COOLDOWN_MS = 1200;

const art = (key: string): string => ASSET_URLS[key];
const clamp01 = (x: number): number => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);

export function FreeRunHud({ hud, hits, hub, onPause }: { hud: HudState; hits: number; hub: Hub; onPause: () => void }) {
  const xpPct = clamp01(hud.xp / hud.xpToNext);
  const hpPct = clamp01(hud.hp / hud.maxHp);
  const place = hud.route ? hud.route.name : `Wave ${Math.max(1, hud.wave)}/${hud.waves}`;
  const toBoss = hud.route ? Math.max(0, Math.round(hud.route.bossAt - hud.route.dist)) : null;
  const sub = hud.boss ? 'Boss fight' : toBoss !== null ? `${toBoss} m to boss` : null;
  const hp = Math.max(0, Math.ceil(hud.hp));

  return (
    <>
      <div className="fr-top" data-testid="free-hud">
        <div className="fr-left">
          <div className="fr-ring" role="img" aria-label={`Level ${hud.level}, ${Math.round(xpPct * 100)}% to the next`}>
            <svg viewBox="0 0 40 40" aria-hidden="true">
              <circle className="fr-ring-track" cx="20" cy="20" r="16" />
              <circle className="fr-ring-fill" cx="20" cy="20" r="16" pathLength={100} strokeDasharray={100} strokeDashoffset={100 - xpPct * 100} />
            </svg>
            <b>{hud.level}</b>
          </div>
          <div className="fr-hp" data-hit={hits === 0 ? undefined : hits % 2 ? 'a' : 'b'} aria-label={`${hp} of ${hud.maxHp} HP`}>
            <span className="fr-bar"><i style={{ width: `${hpPct * 100}%` }} /></span>
            <span className="fr-hp-num">{hp}</span>
          </div>
        </div>
        <div className="fr-place">
          <span>{place}</span>
          {sub && <small data-testid="free-sub">{sub}</small>}
        </div>
        <div className="fr-right">
          <div className="fr-coins" aria-label={`${hud.gold} gold`}>
            <img src={art('ui/coins')} alt="" />
            <span>{fmt(hud.gold)}</span>
          </div>
          <button type="button" className="fr-pause" aria-label="Pause" data-testid="ui-pause" onClick={onPause}>
            <img src={art('ui/pause')} alt="" />
          </button>
        </div>
      </div>
      <div className="fr-xp" aria-hidden="true"><i style={{ width: `${xpPct * 100}%` }} /></div>
      {hud.meal && <div className="fr-chip" data-testid="meal-chip">{hud.meal}</div>}
      {hud.boss && (
        <div className="fr-boss">
          <img src={art(hud.boss.sprite)} alt="" data-testid="boss-portrait" />
          <span className="fr-boss-name">{hud.boss.name}</span>
          <span className="fr-bar fr-bar--boss"><i style={{ width: `${clamp01(hud.boss.hp / hud.boss.maxHp) * 100}%` }} /></span>
        </div>
      )}
      <div className="fr-dock">
        {hud.dips.length > 0 && (
          <div className="fr-dips" data-testid="dip-sockets">
            {hud.dips.map((d, i) => (
              <div key={`${d.id}-${i}`} className="fr-dip" aria-label={`${CONTENT.dips[d.id].name}, level ${d.level}`}>
                <img src={art(CONTENT.dips[d.id].sprite)} alt="" />
                <b>L{d.level}</b>
              </div>
            ))}
          </div>
        )}
        <DodgeButton hub={hub} />
      </div>
    </>
  );
}

function DodgeButton({ hub }: { hub: Hub }) {
  const [cooling, setCooling] = useState(false);

  useEffect(() => {
    if (!cooling) return;
    const t = window.setTimeout(() => setCooling(false), DODGE_COOLDOWN_MS);
    return () => window.clearTimeout(t);
  }, [cooling]);

  const press = () => {
    if (cooling) return;
    hub.controls?.dodge();
    setCooling(true);
  };

  return (
    <button
      type="button"
      className={cooling ? 'fr-dodge fr-dodge--cool' : 'fr-dodge fr-dodge--ready'}
      aria-label="Dodge"
      aria-disabled={cooling}
      data-testid="free-dodge"
      onClick={press}
    >
      <span>Dodge</span>
      <i className="fr-dodge-cd" aria-hidden="true" />
    </button>
  );
}
