// Draws the World's enemies, shots and zones as pooled sprites. One view per sim entity (found by uid), created when the
// entity first shows up and recycled when it goes. Positions are interpolated between the last two sim steps so a 90 or
// 120 Hz screen stays smooth on a 60 Hz sim. The cut-out life (bob, wobble, flap, squash) is computed from the sim's own
// clocks each frame; nothing here uses a Phaser tween.
import * as Phaser from 'phaser';

import type { Enemy, EnemyKind, Projectile, World } from '@/core/types';

import type { Fx } from './fx';
import type { Layout, Projector } from './layout';
import {
  ANIM, BURN_TINT, CHILL_TINT, D, DISC_SQUASH, ELITE_SCALE, ELITE_TINT, ENEMY_SHOT_U, ENEMY_SCALE_FLOOR, enemyShare, FREEZE_TINT, FROST_TINT,
  LAUNCH_U, LOB_U, SHOT_FIT, SHOT_MIN_U, SLOW_TINT, STEP, SWARM_SCALE, TENDER_TINT, WHITE, ZONE_TINT,
} from './look';
import { DiscPool, ImagePool, type Disc, type Img } from './pools';
import { prepareThosaiTexture, THOSAI_TEXTURE, thosaiRollFrame } from './thosaiTexture';

const TAU = Math.PI * 2;
const MULTIPLY = Phaser.TintModes.MULTIPLY;
const FILL = Phaser.TintModes.FILL;
const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
/** Blend two 0xRRGGBB colours (t 0 = a, 1 = b). */
function mixHex(a: number, b: number, t: number): number {
  const ch = (shift: number): number => Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

export type EnemyView = {
  uid: number;
  stamp: number;
  kind: EnemyKind;
  boss: boolean;
  elite: boolean;
  body: Img;
  shadow: Img;
  /** Circling stars above the head while stunned. */
  stunA: Img | null;
  stunB: Img | null;
  /** A silhouette behind the body: the frost rim while frozen, and the white outline of crowd-control immunity with the seconds it has left. */
  outline: Img | null;
  outlineT: number;
  /** 1 on each damage-over-time tick, decaying: the heat flare. */
  tickT: number;
  /** Seconds until this enemy's next status particle, and whether it was frozen last frame (its shatter fires when that ends). */
  fxT: number;
  wasFrozen: boolean;
  /** Sprite size as a share of the screen width at depth scale 1, and the texture's own size. */
  share: number;
  tw: number;
  th: number;
  texMax: number;
  phase: number;
  /** Field position at the last sim step (the start of the interpolation) and as last drawn. */
  px: number;
  py: number;
  fx: number;
  fy: number;
  /** Screen position, body size and head height as last drawn (FX anchor to these). */
  sx: number;
  sy: number;
  bw: number;
  bh: number;
  topY: number;
  clock: number;
  vx: number;
  dash: number;
  lean: number;
  /** 1 right after a hit, decaying: the squash. */
  squash: number;
  recoil: number;
  attackT: number;
  attacking: boolean;
  /** Sim times at which an aim / boss tell started and ends (0 = none). */
  aimFrom: number;
  aimUntil: number;
  tellUntil: number;
  tint: number;
  mode: number;
  sugarStacks: number;
  /** The last dip colour seen on it, for the splash when it dies. */
  dip: number;
};

type ShotView = {
  uid: number;
  stamp: number;
  motion: Projectile['motion'];
  disc: Disc | null;
  img: Img | null;
  shadow: Img | null;
  dia: number;
  texMax: number;
  px: number;
  py: number;
  pz: number;
  /** Screen position last drawn, for the heading of enemy shots and the trail behind a bread. */
  lx: number;
  ly: number;
  trail: { img: Img; x: number; y: number; k: number; spin: number; t: number }[];
  trailT: number;
  trailNext: number;
  /** Seconds in flight, the hover height (field units) a flat disc rides at, wobble phase, and the scale last drawn (for the hit splat). */
  age: number;
  hover: number;
  phase: number;
  kx: number;
  ky: number;
};

type Corpse = { v: EnemyView; t: number; k: number };

const CORPSE_LIFE = 0.24;
/** Flat-bread hover height in field units: thin tissue floats, a heavy murtabak skims low. */
const HOVER: Record<string, number> = { tissue: 30, murtabak: 7, chapati: 18, appam: 16, idli: 10, vadai: 12 };
const HOVER_DEFAULT = 16;
/** Launch squash length (s), and the wobble rate as a share of the spin rate (a frisbee tumbles slower than it spins). */
const LAUNCH_T = 0.1;
const WOBBLE = 0.55;
/** Hit splat: how far the bread flattens and widens over its 120 ms exit. */
const SPLAT_X = 0.45;
const SPLAT_Y = 0.5;
/** Seconds a new enemy takes to enter (fade + slide in from its edge for side spawns). */
const FADE_IN = 0.25;
/** How far (fraction of screen width) a side spawn slides in from outside its edge. Reduced motion: no slide, tint only. */
const ENTER_SLIDE = 0.12;
/** Pale tint a new arrival starts with under reduced motion, fading to its normal colour. */
const ENTER_TINT = 0x9fd8ff;
/** The white outline shown when an enemy shrugs off crowd control: how long it takes to fade, and how much bigger than the body its
 *  white copy is. */
const OUTLINE_TIME = 0.7;
const OUTLINE_GROW = 1.12;
/** The thin frost rim of a frozen enemy, and how often each status puts a particle off it (seconds). */
const FROST_GROW = 1.05;
const FROST_ALPHA = 0.55;
const FROST_EVERY = 0.3;
const HEAT_EVERY = 0.42;
const MILK_EVERY = 0.5;

export class Actors {
  private l!: Layout;
  private frame = 0;
  /** The render clock (s), and the sim's clock. */
  private time = 0;
  private now = 0;
  private handX = 0;
  private handY = 0;

  private enemies: EnemyView[] = [];
  private enemyMap = new Map<number, EnemyView>();
  private shots: ShotView[] = [];
  private shotMap = new Map<number, ShotView>();
  private zones = new Map<number, Img>();
  private zoneStamp = new Map<number, number>();
  private corpses: Corpse[] = [];
  private trailCount = 0;
  private spent: { v: ShotView | null; t: number }[] = Array.from({ length: 24 }, () => ({ v: null, t: 0 }));

  constructor(
    private proj: Projector,
    private imgs: ImagePool,
    private discs: DiscPool,
    private fx: Fx,
    private reduceMotion: boolean = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  ) {}

  setLayout(l: Layout): void {
    this.l = l;
  }

  /** Offset (screen px) from Kannan's field position to his throwing hand: shots leave from there. */
  setHand(ox: number, oy: number): void {
    this.handX = ox;
    this.handY = oy;
  }

  viewOf(uid: number): EnemyView | undefined {
    return this.enemyMap.get(uid);
  }

  /** The enemy just became immune to freeze and stun, or turned one away: outline it in white for a moment. */
  immune(uid: number): void {
    const v = this.enemyMap.get(uid);
    if (v) v.outlineT = OUTLINE_TIME;
  }

  /** A damage-over-time tick landed on it: the heat flare (tint only, so reduced motion gets it too). */
  tick(uid: number): void {
    const v = this.enemyMap.get(uid);
    if (v) v.tickT = 1;
  }

  /** Field position of a drawn enemy (for aim lines and tells). */
  locate(uid: number, out: { x: number; y: number }): boolean {
    const v = this.enemyMap.get(uid);
    if (!v) return false;
    out.x = v.fx;
    out.y = v.fy;
    return true;
  }

  /** Call before each sim step: remember where everything is so the next frame can interpolate from it. */
  snapshot(w: World): void {
    for (let i = 0; i < w.enemies.length; i++) {
      const e = w.enemies[i];
      const v = this.enemyMap.get(e.uid);
      if (v) {
        v.px = e.x;
        v.py = e.y;
      }
    }
    for (let i = 0; i < w.projectiles.length; i++) {
      const s = w.projectiles[i];
      const v = this.shotMap.get(s.uid);
      if (v) {
        v.px = s.x;
        v.py = s.y;
        v.pz = s.z;
      }
    }
  }

  // ── Event hooks ────────────────────────────────────────────────────────────────────────────────────────────

  hit(uid: number, dip: number): void {
    const v = this.enemyMap.get(uid);
    if (!v) return;
    v.squash = 1;
    if (dip) v.dip = dip;
  }

  counterHit(): void {
    for (const v of this.enemies) if (v.attacking) v.attackT = 0.16;
  }

  aim(uid: number, from: number, until: number): void {
    const v = this.enemyMap.get(uid);
    if (v) {
      v.aimFrom = from;
      v.aimUntil = until;
    }
  }

  fired(uid: number): void {
    const v = this.enemyMap.get(uid);
    if (v) {
      v.recoil = 1;
      v.aimUntil = 0;
    }
  }

  tell(uid: number, until: number): void {
    const v = this.enemyMap.get(uid);
    if (v) v.tellUntil = until;
  }

  /** The enemy died: its sprite becomes a corpse that squashes and fades, then is recycled. */
  kill(uid: number): EnemyView | undefined {
    const v = this.enemyMap.get(uid);
    if (!v) return undefined;
    this.enemyMap.delete(uid);
    const i = this.enemies.indexOf(v);
    if (i >= 0) {
      this.enemies[i] = this.enemies[this.enemies.length - 1];
      this.enemies.pop();
    }
    this.dropOverlays(v);
    v.body.setTint(WHITE).setTintMode(FILL);
    v.tint = WHITE;
    v.mode = FILL;
    this.corpses.push({ v, t: 0, k: v.bw / v.tw });
    return v;
  }

  // ── Frame ──────────────────────────────────────────────────────────────────────────────────────────────────

  draw(w: World, alpha: number, time: number, dt: number): void {
    this.frame++;
    this.time = time;
    this.now = w.time;
    this.drawEnemies(w, alpha, dt);
    if (w.phase === 'won' || w.phase === 'lost') this.clearShots();
    else this.drawShots(w, alpha, dt);
    this.drawZones(w);
    this.sweep();
    this.drawCorpses(dt);
    this.drawSpent(dt);
  }

  /** Release every view (a run ended or restarted). */
  clear(): void {
    for (const v of this.enemies) this.release(v);
    this.enemies.length = 0;
    this.enemyMap.clear();
    for (const c of this.corpses) this.release(c.v);
    this.corpses.length = 0;
    this.clearShots();
    for (const [, img] of this.zones) this.imgs.put(img);
    this.zones.clear();
    this.zoneStamp.clear();
  }

  // ── Enemies ────────────────────────────────────────────────────────────────────────────────────────────────

  private addEnemy(e: Enemy): EnemyView {
    const body = this.imgs.get(e.def.sprite).setOrigin(0.5, 1);
    const shadow = this.imgs.get('shadow');
    const elite = e.elite;
    const share = enemyShare(e.def.radius) * (elite ? ELITE_SCALE : 1) * (e.def.kind === 'swarm' ? SWARM_SCALE : 1);
    const v: EnemyView = {
      uid: e.uid, stamp: 0, kind: e.def.kind, boss: e.boss, elite, body, shadow,
      stunA: null, stunB: null, outline: null, outlineT: 0, tickT: 0, fxT: 0, wasFrozen: false,
      share, tw: body.width, th: body.height, texMax: Math.max(body.width, body.height),
      phase: (e.uid * 2.399963) % TAU,
      px: e.x, py: e.y, fx: e.x, fy: e.y, sx: 0, sy: 0, bw: 1, bh: 1, topY: 0,
      clock: e.age, vx: 0, dash: 0, lean: 0, squash: 0, recoil: 0, attackT: 0, attacking: false, aimFrom: 0, aimUntil: 0, tellUntil: 0,
      tint: WHITE, mode: MULTIPLY, sugarStacks: 0, dip: 0,
    };
    body.setTint(WHITE).setTintMode(MULTIPLY);
    this.enemies.push(v);
    this.enemyMap.set(e.uid, v);
    return v;
  }

  private drawEnemies(w: World, alpha: number, dt: number): void {
    const P = this.proj;
    const u = this.l.u;
    const now = this.now;
    const list = w.enemies;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.state === 'dead') continue;
      const v = this.enemyMap.get(e.uid) ?? this.addEnemy(e);
      v.stamp = this.frame;
      const x = v.px + (e.x - v.px) * alpha;
      const y = v.py + (e.y - v.py) * alpha;
      v.fx = x;
      v.fy = y;
      P.at(x, y);
      const s = P.s;
      const sx0 = P.sx;
      const sy0 = P.sy;
      // A boss parks far up the street: it is drawn a little larger than its depth says so it still reads as the big one.
      const k = (v.share * this.l.w * Math.max(ENEMY_SCALE_FLOOR, s) * (v.boss ? 1 + 0.55 * (1 - s) : 1)) / v.texMax;
      const bw = v.tw * k;
      const bh = v.th * k;
      // New arrivals fade in (they spawn at the vanishing point or out of a summoner) instead of popping.
      const born = e.age < FADE_IN ? e.age / FADE_IN : 1;

      // Statuses first: they decide whether the sprite moves at all.
      let frozen = false;
      let stunned = false;
      let chill = false;
      let tender = false;
      let burn = false;
      let slowed = false;
      let sugar = 0;
      const sts = e.statuses;
      for (let j = 0; j < sts.length; j++) {
        switch (sts[j].id) {
          case 'freeze': frozen = true; break;
          case 'stun': stunned = true; break;
          case 'chill': chill = true; break;
          case 'tender': tender = true; break;
          case 'burn': burn = true; break;
          case 'sugarSlow': slowed = true; break;
          case 'sugar': sugar = sts[j].stacks; break;
          default: break;
        }
      }
      v.sugarStacks = sugar;
      // Spice heat: the body pulses toward red-orange, and flares on each damage tick.
      v.tickT = Math.max(0, v.tickT - dt * 4);
      const heat = clamp(0.3 + 0.2 * Math.sin(this.time * TAU * 1.3 + v.phase) + 0.5 * v.tickT, 0, 1);
      // A boss is never stopped by cold or stars (the sim only slows it): it keeps moving and breathing, under its ice or its sparks.
      const disabled = !v.boss && (frozen || stunned);

      // Animation clock: the sim's movement clock while walking (slows and stops with the enemy), its age otherwise.
      let clk: number;
      if (disabled) clk = v.clock;
      else {
        clk = e.state === 'walk' ? (e.cooldowns._mt ?? e.age) : e.age;
        v.clock = clk;
      }
      const A = e.def.drain ? ANIM.runner : ANIM[v.kind];
      const walking = e.state === 'walk';
      const amp = disabled ? 0 : walking ? 1 : e.state === 'attack' ? 0.7 : 0.35;
      v.vx += ((e.x - v.px) / STEP - v.vx) * Math.min(1, dt * 10);
      const lean = clamp(v.vx / 160, -1, 1) * A.lean * 0.3;

      let hop = 0;
      let rot = 0;
      let smx = 1;
      let smy = 1;
      let lift = 0;
      if (v.kind === 'flyer' || (v.kind === 'swarm' && !e.def.drain)) {
        const f = 0.5 + 0.5 * Math.sin((clk * TAU) / A.period + v.phase);
        smx = 1 - A.sq * f * (disabled ? 0 : 1);
        smy = 1 + A.sq * 0.35 * f * (disabled ? 0 : 1);
        lift = (A.hover + 0.07 * Math.sin((clk * TAU) / 1.1 + v.phase) * (disabled ? 0 : 1)) * bh;
        rot = lean + Math.sin((clk * TAU) / (A.period * 2) + v.phase) * A.rot * amp;
      } else if (v.kind === 'splitter') {
        const j = Math.sin((clk * TAU) / A.period + v.phase) * amp;
        smx = 1 + A.sq * 0.5 * j;
        smy = 1 - A.sq * 0.5 * j;
        hop = Math.abs(j) * A.bob * bh;
        rot = lean + j * A.rot;
      } else {
        const th = (clk * Math.PI) / A.period + v.phase;
        const b = Math.abs(Math.sin(th));
        hop = b * A.bob * bh * amp;
        rot = lean + Math.sin(th) * A.rot * amp;
        smy = 1 + A.sq * (b - 0.4) * amp;
        smx = 1 - 0.5 * A.sq * (b - 0.4) * amp;
        lift = A.hover * bh;
        // A runner's dash: it stretches toward the camera, then crouches in its rest.
        const dash = e.def.dash;
        if (dash && dash.go + dash.rest > 0) {
          const go = e.t % (dash.go + dash.rest) < dash.go && walking ? 1 : 0;
          v.dash += (go - v.dash) * Math.min(1, dt * 14);
          smy *= 1 + 0.12 * v.dash - 0.06 * (1 - v.dash);
          smx *= 1 - 0.07 * v.dash;
          rot *= 1 + 0.8 * v.dash;
        }
      }
      if (v.boss) {
        // The boss breathes: a slow pulse instead of a hop.
        const br = Math.sin((e.age * TAU) / 2.4);
        smx *= 1 + 0.022 * br;
        smy *= 1 + 0.03 * br;
        hop *= 0.6;
      }
      if (e.def.drain) {
        const emerge = Math.min(1, e.age / 0.45);
        smy *= 0.3 + 0.7 * (1 - (1 - emerge) ** 2);
      }
      if (e.def.stealGold) {
        const escaping = e.state === 'escape';
        v.lean += ((escaping ? 1 : 0) - v.lean) * Math.min(1, dt * 8);
        lift += v.lean * bh * 0.25;
        rot += v.lean * 0.2;
        v.body.setFlipX(escaping);
      }
      v.attacking = e.state === 'attack' && !disabled;
      let attackY = 0;
      if (v.attacking) {
        v.attackT = Math.max(0, v.attackT - dt);
        if (v.attackT > 0) {
          const elapsed = 0.16 - v.attackT;
          const lunge = elapsed < 0.04 ? elapsed / 0.04 : (0.16 - elapsed) / 0.12;
          attackY = 16 * u * lunge;
          smy *= 1 + 0.18 * lunge;
          smx *= 1 - 0.12 * lunge;
          rot += 0.12 * lunge;
        } else {
          const windup = clamp(((w.contactT ?? 0) - 0.18) / 0.32, 0, 1);
          attackY = -7 * u * windup * windup;
          smy *= 1 - 0.14 * windup;
          smx *= 1 + 0.12 * windup;
          rot -= 0.1 * windup;
        }
      } else v.attackT = 0;
      // Hit: squash, then spring back. A knocked-back enemy hops.
      if (v.squash > 0) {
        v.squash = Math.max(0, v.squash - dt * 8);
        smy *= 1 - 0.15 * v.squash;
        smx *= 1 + 0.1 * v.squash;
      }
      if (e.knock > 0) hop += Math.min(1, e.knock / 70) * 0.14 * bh;
      if (v.recoil > 0) {
        v.recoil = Math.max(0, v.recoil - dt * 7);
        smx *= 1 + 0.12 * v.recoil;
        smy *= 1 - 0.1 * v.recoil;
      }
      let shake = 0;
      let tint = WHITE;
      let mode = MULTIPLY;
      // Windups and warnings: the shooter rears back and pulses vermillion; the boss's tell pulses red.
      const aiming = v.aimUntil > now;
      const telling = v.tellUntil > now;
      if (aiming) {
        const q = clamp((now - v.aimFrom) / Math.max(0.05, v.aimUntil - v.aimFrom), 0, 1);
        rot -= 0.12 * Math.sin(q * Math.PI);
        smx *= 0.95;
        if (Math.sin(q * Math.PI * 4) > 0) tint = 0xff8a70;
      }
      if (telling) {
        const pulse = 0.5 + 0.5 * Math.sin((now * TAU * 3));
        if (pulse > 0.5) tint = 0xff8d78;
        smx *= 1.02 + 0.02 * pulse;
        smy *= 1.02 + 0.02 * pulse;
      }
      if (e.state === 'fuse') {
        const fuse = e.def.explode?.fuse ?? 1.5;
        const q = clamp(1 - e.t / fuse, 0, 1);
        const blink = Math.sin(e.age * (26 + 40 * q)) > 0;
        tint = blink ? 0xff3b2a : WHITE;
        shake = (1.2 + 2.5 * q) * u * s * (blink ? 1 : -1);
        const grow = 1 + 0.18 * q;
        smx *= grow;
        smy *= grow;
      }
      if (e.flash > 0 || v.squash > 0.5) {
        tint = WHITE;
        mode = FILL;
      } else if (frozen) tint = FREEZE_TINT;
      else if (tint === WHITE) {
        if (burn) tint = mixHex(WHITE, BURN_TINT, heat);
        else if (slowed) tint = SLOW_TINT;
        else if (chill) tint = CHILL_TINT;
        else if (tender) tint = TENDER_TINT;
        else if (v.elite) tint = ELITE_TINT;
      }
      if (this.reduceMotion && born < 1 && tint === WHITE) tint = mixHex(ENTER_TINT, WHITE, born);
      if (tint !== v.tint || mode !== v.mode) {
        v.body.setTint(tint).setTintMode(mode);
        v.tint = tint;
        v.mode = mode;
      }

      const by = sy0 - hop - lift + attackY;
      // Side spawns slide in from their edge; reduced motion keeps them still and shows the entrance as a tint only.
      const slide = e.lane && e.lane !== 'ahead' && !this.reduceMotion ? (e.lane === 'left' ? -1 : 1) * (1 - born) * ENTER_SLIDE * this.l.w : 0;
      v.body
        .setPosition(sx0 + shake + slide, by)
        .setScale(k * smx, k * smy)
        .setRotation(rot)
        .setAlpha(this.reduceMotion ? 1 : born)
        .setDepth(D.enemy + sy0);
      // The shadow stays on the ground; a high flyer's is smaller and fainter.
      const hi = clamp(lift / Math.max(1, bh), 0, 1);
      const shw = (bw * 0.9 * (1 - 0.3 * hi)) / 64;
      v.shadow
        .setPosition(sx0 + slide, sy0 - 1 * u * s)
        .setScale(shw, shw * 0.62)
        .setAlpha(0.34 * (1 - 0.35 * hi) * born)
        .setDepth(D.shadow);
      // A silhouette behind the body: a white copy that fades when an enemy shrugs off crowd control, and a thin pale frost rim
      // while it is frozen.
      const immune = v.outlineT > 0;
      if (immune) v.outlineT = Math.max(0, v.outlineT - dt);
      if (immune || frozen) {
        const o = (v.outline ??= this.imgs.get(e.def.sprite).setTintMode(FILL));
        const grow = immune ? OUTLINE_GROW : FROST_GROW;
        o.setTint(immune ? WHITE : FROST_TINT)
          .setPosition(sx0 + shake, by - (bh * smy) / 2)
          .setScale(k * smx * grow, k * smy * grow)
          .setRotation(rot)
          .setAlpha(born * (immune ? 0.9 * (v.outlineT / OUTLINE_TIME) : FROST_ALPHA))
          .setDepth(D.enemy + sy0 - 0.25);
      } else if (v.outline) {
        this.imgs.put(v.outline);
        v.outline = null;
      }
      v.sx = sx0;
      v.sy = sy0;
      v.bw = bw;
      v.bh = bh;
      v.topY = by - bh * smy;

      // Status particles: frost breaks off a frozen enemy, heat wisps rise from a burning one, milk drips off a slowed one.
      if (v.wasFrozen && !frozen && !this.reduceMotion) this.shatter(v, sx0, by - bh * 0.5, bw, sy0);
      v.wasFrozen = frozen;
      this.emitStatus(v, dt, frozen ? 'frost' : burn ? 'heat' : slowed ? 'milk' : null, sx0, sy0, by, bw, bh);
      if (stunned || v.stunA) this.syncStars(v, stunned, sx0, by, bw, bh, s, sy0);
    }
  }

  /** One status particle off an enemy on a timer (one emitter per enemy, so the count stays small). Reduced motion: none. */
  private emitStatus(v: EnemyView, dt: number, kind: 'frost' | 'heat' | 'milk' | null, sx: number, sy: number, by: number, bw: number, bh: number): void {
    v.fxT -= dt;
    if (!kind || v.fxT > 0 || this.reduceMotion) return;
    const r = Math.random;
    const u = this.l.u;
    const dz = D.enemy + sy + 0.6;
    if (kind === 'frost') {
      v.fxT = FROST_EVERY;
      const x = sx + (r() - 0.5) * bw * 0.8;
      const y = by - bh * (0.2 + 0.6 * r());
      const dir = r() < 0.5 ? -1 : 1;
      const w = Math.max(4 * u, bw * 0.07);
      this.fx.spawn(r() < 0.65 ? 'status-shard' : 'status-leaf', x, y, dz, 0.6, w, w * 0.7)
        .fade(0.9, 0, 0.3)
        .to(x + dir * bw * 0.3, y - bh * 0.3)
        .spin(r() * TAU, dir * 3);
    } else if (kind === 'heat') {
      v.fxT = HEAT_EVERY;
      this.wisp(sx, by - bh * 0.8, bw, bh, dz);
    } else {
      v.fxT = MILK_EVERY;
      const x = sx + (r() - 0.5) * bw * 0.6;
      const y = by - bh * (0.45 + 0.2 * r());
      const w = Math.max(3 * u, bw * 0.05);
      this.fx.spawn('status-drip', x, y, dz, 0.55, w, w).fade(1, 0.6, 0.1).to(x, sy, 2);
    }
  }

  /** A chilli-steam wisp that curls up off the enemy. */
  private wisp(sx: number, y: number, bw: number, bh: number, dz: number): void {
    const r = Math.random;
    const w = Math.max(6 * this.l.u, bw * 0.12);
    const x = sx + (r() - 0.5) * bw * 0.5;
    this.fx
      .spawn('status-wisp', x, y, dz, 0.6, w, w * 1.4)
      .fade(0.9, 0, 0.25)
      .to(x + (r() - 0.5) * bw * 0.25, y - bh * 0.45)
      .spin(r() - 0.5, (r() - 0.5) * 2);
  }

  /** A frozen enemy breaks: pale shards fly out from its middle. */
  private shatter(v: EnemyView, sx: number, cy: number, bw: number, sy: number): void {
    const w = Math.max(4 * this.l.u, bw * 0.08);
    const dz = D.enemy + sy + 0.6;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + v.phase;
      const rr = bw * 0.5;
      this.fx
        .spawn('status-shard', sx, cy, dz, 0.45, w, w * 0.6)
        .fade(1, 0, 0.2)
        .to(sx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.6)
        .spin(a, 6);
    }
  }

  /** Two stars circling above the head while stunned (a boss is stunned too: it shows the stars). */
  private syncStars(v: EnemyView, stunned: boolean, sx: number, by: number, bw: number, bh: number, s: number, sy: number): void {
    if (stunned) {
      const u = this.l.u;
      const t = this.time;
      const dz = D.enemy + sy + 0.5;
      const a = (v.stunA ??= this.imgs.get('status-star'));
      const b = (v.stunB ??= this.imgs.get('status-star'));
      const w = Math.max(Math.min(bw * 0.26, 16 * u + bw * 0.08), 9 * u * s);
      const r = bw * 0.34;
      const y0 = by - bh * 1.0;
      const ang = t * 7 + v.phase;
      a.setPosition(sx + Math.cos(ang) * r, y0 + Math.sin(ang) * r * 0.3).setScale(w / a.width).setRotation(ang).setDepth(dz);
      b.setPosition(sx - Math.cos(ang) * r, y0 - Math.sin(ang) * r * 0.3).setScale(w / b.width).setRotation(-ang).setDepth(dz);
    } else if (v.stunA) {
      this.imgs.put(v.stunA);
      if (v.stunB) this.imgs.put(v.stunB);
      v.stunA = null;
      v.stunB = null;
    }
  }

  private dropOverlays(v: EnemyView): void {
    for (const k of ['stunA', 'stunB', 'outline'] as const) {
      const img = v[k];
      if (img) {
        this.imgs.put(img);
        v[k] = null;
      }
    }
  }

  private release(v: EnemyView): void {
    this.dropOverlays(v);
    this.imgs.put(v.body);
    this.imgs.put(v.shadow);
  }

  private drawCorpses(dt: number): void {
    let keep = 0;
    for (let i = 0; i < this.corpses.length; i++) {
      const c = this.corpses[i];
      c.t += dt;
      const u = c.t / CORPSE_LIFE;
      if (u >= 1) {
        this.release(c.v);
        continue;
      }
      this.corpses[keep++] = c;
      // Squash flat and wide in the first third (the hit), then shrink away.
      const q = u < 0.35 ? u / 0.35 : 1;
      const f = u < 0.35 ? 0 : (u - 0.35) / 0.65;
      const sx = (1 + 0.28 * q) * (1 - 0.8 * f * f);
      const sy = (1 - 0.45 * q) * (1 - 0.8 * f * f);
      if (u > 0.12 && c.v.mode === FILL) {
        c.v.body.setTintMode(MULTIPLY);
        c.v.mode = MULTIPLY;
      }
      c.v.body.setScale(c.k * sx, c.k * sy).setAlpha(1 - f * f);
      c.v.shadow.setAlpha(0.34 * (1 - u));
    }
    this.corpses.length = keep;
  }

  private sweep(): void {
    let keep = 0;
    for (let i = 0; i < this.enemies.length; i++) {
      const v = this.enemies[i];
      if (v.stamp === this.frame) this.enemies[keep++] = v;
      else {
        this.enemyMap.delete(v.uid);
        // Gone without a kill event (an exploder blowing up): vanish at once.
        this.release(v);
      }
    }
    this.enemies.length = keep;
    keep = 0;
    for (let i = 0; i < this.shots.length; i++) {
      const s = this.shots[i];
      if (s.stamp === this.frame) this.shots[keep++] = s;
      else {
        this.shotMap.delete(s.uid);
        if (s.motion === 'enemy' || s.motion === 'orbit') this.releaseShot(s);
        else this.fadeShot(s);
      }
    }
    this.shots.length = keep;
    for (const [uid, st] of this.zoneStamp) {
      if (st === this.frame) continue;
      const img = this.zones.get(uid);
      if (img) this.imgs.put(img);
      this.zones.delete(uid);
      this.zoneStamp.delete(uid);
    }
  }

  private clearShots(): void {
    for (const s of this.shots) this.releaseShot(s);
    this.shots.length = 0;
    this.shotMap.clear();
    for (const s of this.spent) {
      if (s.v) this.releaseShot(s.v);
      s.v = null;
    }
  }

  private fadeShot(v: ShotView): void {
    for (const s of this.spent) {
      if (s.v) continue;
      // A spent bread gets only a 120ms exit, never a persistent landing prop.
      for (const t of v.trail) this.imgs.put(t.img);
      this.trailCount -= v.trail.length;
      v.trail.length = 0;
      s.v = v;
      s.t = 0;
      return;
    }
    this.releaseShot(v);
  }

  private drawSpent(dt: number): void {
    for (const s of this.spent) {
      if (!s.v) continue;
      s.t += dt;
      if (s.t >= 0.12) {
        this.releaseShot(s.v);
        s.v = null;
      } else {
        const alpha = 1 - s.t / 0.12;
        s.v.disc?.cont.setAlpha(alpha);
        s.v.img?.setAlpha(alpha);
        if (!this.reduceMotion) {
          const f = s.t / 0.12;
          const sx = s.v.kx * (1 + SPLAT_X * f);
          const sy = s.v.ky * (1 - SPLAT_Y * f);
          if (s.v.disc) s.v.disc.cont.setScale(sx, sy);
          else s.v.img?.setScale(sx, sy);
        }
        s.v.shadow?.setAlpha(0.3 * alpha);
      }
    }
  }

  // ── Shots ──────────────────────────────────────────────────────────────────────────────────────────────────

  private addShot(s: Projectile): ShotView {
    const enemy = s.owner === 'enemy';
    const v: ShotView = {
      uid: s.uid, stamp: 0, motion: s.motion, disc: null, img: null, shadow: null, dia: 0, texMax: 1,
      px: s.x, py: s.y, pz: s.z, lx: -1, ly: -1, trail: [], trailT: 0, trailNext: 0,
      age: 0, hover: 0, phase: (s.uid * 2.399) % 6.283, kx: 1, ky: 1,
    };
    if (enemy) {
      v.img = this.imgs.get(s.sprite);
      v.shadow = this.imgs.get('shadow');
      v.dia = ENEMY_SHOT_U;
      v.texMax = Math.max(v.img.width, v.img.height);
    } else if (s.motion === 'lob') {
      v.img = this.imgs.get(s.sprite);
      v.shadow = this.imgs.get('shadow');
      v.dia = LOB_U;
      v.texMax = Math.max(v.img.width, v.img.height);
    } else {
      v.disc = this.discs.get(s.sprite);
      v.texMax = Math.max(v.disc.img.width, v.disc.img.height);
      if (s.flake) {
        const img = v.disc.img;
        img.setCrop(img.width * 0.32, img.height * 0.4, img.width * 0.34, img.height * 0.2);
      }
      if (s.motion === 'wave') {
        // The thosai roll lies diagonal in its art: turn it level, then the container stretches it across the street.
        v.disc.img.setRotation(0.7);
        if (!this.reduceMotion && s.sprite === 'breads/thosai') {
          prepareThosaiTexture(v.disc.img.scene, v.disc.img);
          if (v.disc.img.scene.textures.exists(THOSAI_TEXTURE)) v.disc.img.setTexture(THOSAI_TEXTURE, 'roll-0').setRotation(0);
        }
        v.dia = 0;
      } else {
        v.dia = s.flake ? SHOT_MIN_U * 0.75 / 0.34 : Math.max(SHOT_MIN_U, 2 * s.radius * SHOT_FIT);
        // A flat bread rides above the street (the sim has no height for it): tissue floats, murtabak skims.
        if (!s.flake && s.motion !== 'orbit') {
          v.hover = HOVER[s.breadId ?? ''] ?? HOVER_DEFAULT;
          v.shadow = this.imgs.get('shadow');
        }
        // A flying bread leaves a soft swoosh behind it (the thick end is the head, so it trails when turned to the heading).

      }
    }
    if (s.loaded || s.charged) v.dia *= 1.65;
    if (s.charged) {
      const image = v.img ?? v.disc?.img;
      if (image) image.scene.tweens.add({ targets: image, alpha: 0.6, duration: 140, yoyo: true, repeat: 2 });
    }
    // Three fading copies per moving bread, capped at 48 atlas images for the whole arena.
    if (!enemy && !this.reduceMotion && !s.flake && (s.motion === 'straight' || s.motion === 'boomerang' || s.motion === 'lob') && this.trailCount < 48) {
      for (let i = 0; i < 3; i++) v.trail.push({ img: this.imgs.get(s.sprite).setVisible(false), x: 0, y: 0, k: 1, spin: 0, t: 1 });
      this.trailCount += 3;
    }
    this.shots.push(v);
    this.shotMap.set(s.uid, v);
    return v;
  }

  private drawShots(w: World, alpha: number, dt: number): void {
    const P = this.proj;
    const list = w.projectiles;
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      if (s.ttl < 0) continue;
      const v = this.shotMap.get(s.uid) ?? this.addShot(s);
      v.stamp = this.frame;
      const x = v.px + (s.x - v.px) * alpha;
      const y = v.py + (s.y - v.py) * alpha;
      P.at(x, y);
      const sc = s.owner === 'player' ? Math.max(0.55, P.s) : P.s;
      let sx = P.sx;
      let sy = P.sy;
      if (s.owner === 'player' && s.motion !== 'orbit') {
        // Leaves Kannan's hand, then settles onto the field projection.
        const f = Math.max(0, 1 - y / LAUNCH_U);
        sx += this.handX * f;
        sy += this.handY * f;
      }
      if (s.owner === 'enemy') {
        const k = (v.dia * P.ppu * sc) / v.texMax;
        // It flies above the street and lands on the counter spot its warning marked: the lift fades out on arrival.
        const lift = 30 * P.ppu * sc * Math.min(1, y / 160);
        const shw = (v.dia * P.ppu * sc * 0.8) / 64;
        const gy = sy;
        const img = v.img as Img;
        // The flame trails behind the shot: turn it away from the screen heading.
        const hx = sx - v.lx;
        const hy = gy - lift - v.ly;
        const rot = v.ly >= 0 && hy > 0.2 ? Math.atan2(-hx, hy) : 0;
        img.setPosition(sx, gy - lift).setScale(k).setRotation(s.sprite === 'fx/flame' ? rot : s.spin).setDepth(D.enemyShot + gy);
        (v.shadow as Img).setPosition(sx, gy).setScale(shw, shw * 0.6).setAlpha(0.3).setDepth(D.shadow);
        v.lx = sx;
        v.ly = gy - lift;
        continue;
      }
      if (s.motion === 'lob') {
        const z = v.pz + (s.z - v.pz) * alpha;
        const lift = z * (40 + 0.32 * s.ty) * P.ppu * sc;
        v.age += dt;
        const lq = this.reduceMotion ? 0 : Math.max(0, 1 - v.age / LAUNCH_T);
        const k = ((v.dia * P.ppu * sc) / v.texMax) * (1 + 0.28 * z);
        v.kx = k; v.ky = k;
        (v.img as Img).setPosition(sx, sy - lift).setScale(k * (1 + 0.25 * lq), k * (1 - 0.2 * lq)).setRotation(s.spin).setDepth(D.shot + sy);
        this.drawTrail(v, sx, sy - lift, k, s.spin, dt);
        const shw = (v.dia * P.ppu * sc * 0.85 * (1 - 0.45 * z)) / 64;
        (v.shadow as Img).setPosition(sx, sy).setScale(shw, shw * 0.6).setAlpha(0.36 * (1 - 0.5 * z)).setDepth(D.shadow);
        continue;
      }
      const d = v.disc as Disc;
      if (s.motion === 'wave') {
        const widthPx = 2 * s.radius * P.ppu * sc;
        const kx = widthPx / (v.texMax * 1.18);
        d.cont.setPosition(sx, sy).setScale(kx, kx * 0.52).setDepth(D.shot + sy);
        if (!this.reduceMotion && s.sprite === 'breads/thosai' && d.img.texture.key === THOSAI_TEXTURE) d.img.setFrame(`roll-${thosaiRollFrame(y, 2 * s.radius)}`);
        continue;
      }
      const layers = 1 - (s.flakesShed ?? 0) * 0.08;
      v.age += dt;
      const lift = v.hover * P.ppu * sc;
      const k = ((v.dia * P.ppu * sc * layers) / v.texMax) * (1 + v.hover / 240);
      const spin = s.motion === 'boomerang' ? s.spin * 1.8 : s.spin;
      let ky = k * DISC_SQUASH;
      let kx = k;
      let bank = 0;
      let bob = 0;
      if (!this.reduceMotion) {
        // Frisbee: the disc's tilt oscillates (foreshortened 0.45..1 of its width) and it banks toward its travel direction.
        const sp = Math.hypot(s.vx, s.vy) || 1;
        ky = k * (0.725 + 0.275 * Math.sin(spin * WOBBLE + v.phase));
        bank = (s.vx / sp) * 0.3;
        if (v.hover > 25) bob = Math.sin(v.age * 7 + v.phase) * 3 * P.ppu * sc;
        const lq = Math.max(0, 1 - v.age / LAUNCH_T);
        kx *= 1 + 0.25 * lq;
        ky *= 1 - 0.25 * lq;
      }
      v.kx = kx; v.ky = ky;
      d.cont.setPosition(sx, sy - lift + bob).setScale(kx, ky).setRotation(bank).setDepth(D.shot + sy);
      d.img.setRotation(spin);
      if (v.shadow) {
        const h = Math.min(1, v.hover / 40);
        const shw = (v.dia * P.ppu * sc * 0.8 * (1 - 0.35 * h)) / 64;
        v.shadow.setPosition(sx, sy).setScale(shw, shw * 0.6).setAlpha(0.3 * (1 - 0.4 * h)).setDepth(D.shadow);
      }
      this.drawTrail(v, sx, sy - lift + bob, kx, spin, dt);
    }
  }

  private drawTrail(v: ShotView, x: number, y: number, k: number, spin: number, dt: number): void {
    if (v.trail.length === 0) return;
    for (const t of v.trail) {
      t.t += dt;
      t.img.setVisible(t.t < 0.16).setPosition(t.x, t.y).setScale(t.k, t.k * DISC_SQUASH)
        .setRotation(t.spin).setAlpha(Math.max(0, 0.32 * (1 - t.t / 0.16))).setDepth(D.shot + t.y - 1);
    }
    v.trailT += dt;
    if (v.trailT < 0.045 || (v.ly >= 0 && (x - v.lx) ** 2 + (y - v.ly) ** 2 < 4)) return;
    v.trailT = 0;
    const t = v.trail[v.trailNext];
    t.x = x; t.y = y; t.k = k; t.spin = spin; t.t = 0;
    v.trailNext = (v.trailNext + 1) % v.trail.length;
    v.lx = x; v.ly = y;
  }

  private releaseShot(s: ShotView): void {
    const image = s.img ?? s.disc?.img;
    if (image) {
      image.scene.tweens.killTweensOf(image);
      image.setAlpha(1).setCrop();
    }
    if (s.disc) {
      s.disc.img.setRotation(0);
      this.discs.put(s.disc);
    }
    if (s.img) this.imgs.put(s.img);
    if (s.shadow) this.imgs.put(s.shadow);
    for (const t of s.trail) this.imgs.put(t.img);
    this.trailCount -= s.trail.length;
  }

  // ── Zones ──────────────────────────────────────────────────────────────────────────────────────────────────

  private drawZones(w: World): void {
    const P = this.proj;
    for (let i = 0; i < w.zones.length; i++) {
      const z = w.zones[i];
      let img = this.zones.get(z.uid);
      if (!img) {
        img = this.imgs.get(z.sprite).setTint(ZONE_TINT);
        this.zones.set(z.uid, img);
      }
      this.zoneStamp.set(z.uid, this.frame);
      P.at(z.x, z.y);
      const wpx = 2.2 * z.radius * P.ppu * P.s;
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 4 + z.uid);
      img
        .setPosition(P.sx, P.sy - 4 * this.l.u * P.s)
        .setScale(wpx / img.width, (wpx / img.width) * 0.5)
        .setAlpha(Math.min(1, z.time / 0.5) * (0.4 + 0.18 * pulse))
        .setDepth(D.ground);
    }
  }

  /** A debug read: how many views are alive. */
  counts(): { enemies: number; shots: number; corpses: number } {
    return { enemies: this.enemies.length, shots: this.shots.length, corpses: this.corpses.length };
  }
}
