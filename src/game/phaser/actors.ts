// Draws the World's enemies, shots and zones as pooled sprites. One view per sim entity (found by uid), created when the
// entity first shows up and recycled when it goes. Positions are interpolated between the last two sim steps so a 90 or
// 120 Hz screen stays smooth on a 60 Hz sim. The cut-out life (bob, wobble, flap, squash) is computed from the sim's own
// clocks each frame; nothing here uses a Phaser tween.
import * as Phaser from 'phaser';

import type { Enemy, EnemyKind, Projectile, World } from '@/core/types';

import type { Layout, Projector } from './layout';
import {
  ANIM, CHILL_TINT, D, DISC_SQUASH, ELITE_SCALE, ELITE_TINT, ENEMY_SHOT_U, enemyShare, FREEZE_TINT, LAUNCH_U, LOB_U, SHOT_FIT, SHOT_MIN_U,
  STEP, SWARM_SCALE, TENDER_TINT, WHITE, ZONE_TINT,
} from './look';
import { DiscPool, ImagePool, type Disc, type Img } from './pools';

const TAU = Math.PI * 2;
const MULTIPLY = Phaser.TintModes.MULTIPLY;
const FILL = Phaser.TintModes.FILL;
const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

export type EnemyView = {
  uid: number;
  stamp: number;
  kind: EnemyKind;
  boss: boolean;
  elite: boolean;
  body: Img;
  shadow: Img;
  flame: Img | null;
  sugar: Img | null;
  ice: Img | null;
  stunA: Img | null;
  stunB: Img | null;
  /** The white outline of crowd-control immunity (a white copy of the body, a little larger, behind it) and the seconds it has left. */
  outline: Img | null;
  outlineT: number;
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
  trail: Img | null;
};

type Corpse = { v: EnemyView; t: number; k: number };

const CORPSE_LIFE = 0.24;
/** Seconds a new enemy takes to fade in. */
const FADE_IN = 0.35;
/** The white outline shown when an enemy shrugs off crowd control: how long it takes to fade, and how much bigger than the body its
 *  white copy is. */
const OUTLINE_TIME = 0.7;
const OUTLINE_GROW = 1.12;

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

  constructor(
    private proj: Projector,
    private imgs: ImagePool,
    private discs: DiscPool,
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
    this.drawShots(w, alpha);
    this.drawZones(w);
    this.sweep();
    this.drawCorpses(dt);
  }

  /** Release every view (a run ended or restarted). */
  clear(): void {
    for (const v of this.enemies) this.release(v);
    this.enemies.length = 0;
    this.enemyMap.clear();
    for (const c of this.corpses) this.release(c.v);
    this.corpses.length = 0;
    for (const s of this.shots) this.releaseShot(s);
    this.shots.length = 0;
    this.shotMap.clear();
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
      flame: null, sugar: null, ice: null, stunA: null, stunB: null, outline: null, outlineT: 0,
      share, tw: body.width, th: body.height, texMax: Math.max(body.width, body.height),
      phase: (e.uid * 2.399963) % TAU,
      px: e.x, py: e.y, fx: e.x, fy: e.y, sx: 0, sy: 0, bw: 1, bh: 1, topY: 0,
      clock: e.age, vx: 0, dash: 0, lean: 0, squash: 0, recoil: 0, aimFrom: 0, aimUntil: 0, tellUntil: 0,
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
      const k = (v.share * this.l.w * s * (v.boss ? 1 + 0.55 * (1 - s) : 1)) / v.texMax;
      const bw = v.tw * k;
      const bh = v.th * k;

      // Statuses first: they decide whether the sprite moves at all.
      let frozen = false;
      let stunned = false;
      let chill = false;
      let tender = false;
      let burn = false;
      let sugar = 0;
      const sts = e.statuses;
      for (let j = 0; j < sts.length; j++) {
        switch (sts[j].id) {
          case 'freeze': frozen = true; break;
          case 'stun': stunned = true; break;
          case 'chill': chill = true; break;
          case 'tender': tender = true; break;
          case 'burn': burn = true; break;
          case 'sugar': sugar = sts[j].stacks; break;
          default: break;
        }
      }
      v.sugarStacks = sugar;
      // A boss is never stopped by cold or stars (the sim only slows it): it keeps moving and breathing, under its ice or its sparks.
      const disabled = !v.boss && (frozen || stunned);

      // Animation clock: the sim's movement clock while walking (slows and stops with the enemy), its age otherwise.
      let clk: number;
      if (disabled) clk = v.clock;
      else {
        clk = e.state === 'walk' ? (e.cooldowns._mt ?? e.age) : e.age;
        v.clock = clk;
      }
      const A = ANIM[v.kind];
      const walking = e.state === 'walk';
      const amp = disabled ? 0 : walking ? 1 : e.state === 'attack' ? 0.7 : 0.35;
      v.vx += ((e.x - v.px) / STEP - v.vx) * Math.min(1, dt * 10);
      const lean = clamp(v.vx / 160, -1, 1) * A.lean * 0.3;

      let hop = 0;
      let rot = 0;
      let smx = 1;
      let smy = 1;
      let lift = 0;
      if (v.kind === 'flyer' || v.kind === 'swarm') {
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
      if (e.state === 'attack') {
        // Chewing on the counter: quick small squashes and a lunge at the camera.
        const ch = Math.sin(e.age * 22 + v.phase);
        smy *= 1 + 0.05 * ch;
        smx *= 1.05 - 0.03 * ch;
      }
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
      if (e.flash > 0) {
        tint = WHITE;
        mode = FILL;
      } else if (frozen) tint = FREEZE_TINT;
      else if (tint === WHITE) {
        if (chill) tint = CHILL_TINT;
        else if (tender) tint = TENDER_TINT;
        else if (v.elite) tint = ELITE_TINT;
      }
      if (tint !== v.tint || mode !== v.mode) {
        v.body.setTint(tint).setTintMode(mode);
        v.tint = tint;
        v.mode = mode;
      }

      const by = sy0 - hop - lift;
      // New arrivals fade in (they spawn at the vanishing point or out of a summoner) instead of popping.
      const born = e.age < FADE_IN ? e.age / FADE_IN : 1;
      v.body
        .setPosition(sx0 + shake, by)
        .setScale(k * smx, k * smy)
        .setRotation(rot)
        .setAlpha(born)
        .setDepth(D.enemy + sy0);
      // The shadow stays on the ground; a high flyer's is smaller and fainter.
      const hi = clamp(lift / Math.max(1, bh), 0, 1);
      const shw = (bw * 0.9 * (1 - 0.3 * hi)) / 64;
      v.shadow
        .setPosition(sx0, sy0 - 1 * u * s)
        .setScale(shw, shw * 0.62)
        .setAlpha(0.34 * (1 - 0.35 * hi) * born)
        .setDepth(D.shadow);
      // Shrugged off a freeze or stun: a white copy of the body, a little larger and behind it, that fades.
      if (v.outlineT > 0) {
        v.outlineT = Math.max(0, v.outlineT - dt);
        const o = (v.outline ??= this.imgs.get(e.def.sprite).setTint(WHITE).setTintMode(FILL));
        o.setPosition(sx0 + shake, by - (bh * smy) / 2)
          .setScale(k * smx * OUTLINE_GROW, k * smy * OUTLINE_GROW)
          .setRotation(rot)
          .setAlpha(born * 0.9 * (v.outlineT / OUTLINE_TIME))
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

      if (sts.length > 0 || v.flame || v.sugar || v.ice || v.stunA) this.syncOverlays(v, burn, sugar, frozen, stunned, sx0, sy0, by, bw, bh, s);
    }
  }

  /** Burn flame, sugar sparkle, ice crystal and circling stun sparks: small sprites that follow their enemy. */
  private syncOverlays(v: EnemyView, burn: boolean, sugar: number, frozen: boolean, stunned: boolean, sx: number, sy: number, by: number, bw: number, bh: number, s: number): void {
    const u = this.l.u;
    const t = this.time;
    const dz = D.enemy + sy + 0.5;
    if (burn) {
      const f = (v.flame ??= this.imgs.get('fx/flame').setOrigin(0.5, 1));
      const w = Math.max(Math.min(bw * 0.42, 22 * u + bw * 0.12), 11 * u * s);
      const fl = 1 + 0.16 * Math.sin(t * 31 + v.phase);
      f.setPosition(sx + bw * 0.26, by - bh * 0.68).setScale((w / f.width) * (2 - fl), (w / f.width) * fl).setDepth(dz).setAlpha(0.95);
    } else if (v.flame) {
      this.imgs.put(v.flame);
      v.flame = null;
    }
    if (sugar > 0) {
      const f = (v.sugar ??= this.imgs.get('fx/sugar-sparkle'));
      const w = Math.max(Math.min(bw * (0.3 + 0.07 * sugar), 24 * u + bw * 0.12), 11 * u * s);
      const pulse = sugar >= 4 ? 1 + 0.18 * Math.sin(t * 24) : 1;
      f.setPosition(sx - bw * 0.22, by - bh * 0.92).setScale((w / f.width) * pulse).setRotation(t * 1.5).setDepth(dz);
    } else if (v.sugar) {
      this.imgs.put(v.sugar);
      v.sugar = null;
    }
    if (frozen) {
      const f = (v.ice ??= this.imgs.get('fx/ice').setOrigin(0.5, 1));
      const w = Math.max(bw * 1.1, 14 * u * s);
      f.setPosition(sx, sy + 2 * u * s).setScale(w / f.width).setAlpha(0.8).setDepth(dz + 0.1);
    } else if (v.ice) {
      this.imgs.put(v.ice);
      v.ice = null;
    }
    if (stunned) {
      const a = (v.stunA ??= this.imgs.get('fx/spark'));
      const b = (v.stunB ??= this.imgs.get('fx/spark'));
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
    for (const k of ['flame', 'sugar', 'ice', 'stunA', 'stunB', 'outline'] as const) {
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
        this.releaseShot(s);
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

  // ── Shots ──────────────────────────────────────────────────────────────────────────────────────────────────

  private addShot(s: Projectile): ShotView {
    const enemy = s.owner === 'enemy';
    const v: ShotView = {
      uid: s.uid, stamp: 0, motion: s.motion, disc: null, img: null, shadow: null, dia: 0, texMax: 1,
      px: s.x, py: s.y, pz: s.z, lx: -1, ly: -1, trail: null,
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
      if (s.motion === 'wave') {
        // The thosai roll lies diagonal in its art: turn it level, then the container stretches it across the street.
        v.disc.img.setRotation(0.7);
        v.dia = 0;
      } else {
        v.dia = Math.max(SHOT_MIN_U, 2 * s.radius * SHOT_FIT);
        // A flying bread leaves a soft swoosh behind it (the thick end is the head, so it trails when turned to the heading).
        if (s.motion === 'straight' || s.motion === 'boomerang') v.trail = this.imgs.get('fx/swoosh').setOrigin(0.9, 0.4).setVisible(false);
      }
    }
    this.shots.push(v);
    this.shotMap.set(s.uid, v);
    return v;
  }

  private drawShots(w: World, alpha: number): void {
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
      const sc = P.s;
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
        const k = ((v.dia * P.ppu * sc) / v.texMax) * (1 + 0.28 * z);
        (v.img as Img).setPosition(sx, sy - lift).setScale(k).setRotation(s.spin * 0.5).setDepth(D.shot + sy);
        const shw = (v.dia * P.ppu * sc * 0.85 * (1 - 0.45 * z)) / 64;
        (v.shadow as Img).setPosition(sx, sy).setScale(shw, shw * 0.6).setAlpha(0.36 * (1 - 0.3 * z)).setDepth(D.shadow);
        continue;
      }
      const d = v.disc as Disc;
      if (s.motion === 'wave') {
        const widthPx = 2 * s.radius * P.ppu * sc;
        const kx = widthPx / (v.texMax * 1.18);
        d.cont.setPosition(sx, sy).setScale(kx, kx * 0.52).setDepth(D.shot + sy);
        continue;
      }
      const k = (v.dia * P.ppu * sc) / v.texMax;
      const spin = s.motion === 'boomerang' ? s.spin * 1.8 : s.spin;
      d.cont.setPosition(sx, sy).setScale(k, k * DISC_SQUASH).setDepth(D.shot + sy);
      d.img.setRotation(spin);
      const tr = v.trail;
      if (tr) {
        const hx = sx - v.lx;
        const hy = sy - v.ly;
        // Hidden on the first frame (no heading yet) and when the shot barely moves on screen.
        if (v.ly >= 0 && hx * hx + hy * hy > 4) {
          const len = (v.dia * P.ppu * sc * 3.4) / tr.width;
          tr.setVisible(true).setPosition(sx, sy).setRotation(Math.atan2(hy, hx)).setScale(len, len * 0.5).setAlpha(0.42).setDepth(D.shot + sy - 0.5);
        } else tr.setVisible(false);
        v.lx = sx;
        v.ly = sy;
      }
    }
  }

  private releaseShot(s: ShotView): void {
    if (s.disc) {
      s.disc.img.setRotation(0);
      this.discs.put(s.disc);
    }
    if (s.img) this.imgs.put(s.img);
    if (s.shadow) this.imgs.put(s.shadow);
    if (s.trail) this.imgs.put(s.trail);
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
