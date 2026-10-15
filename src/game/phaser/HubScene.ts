// The walkable stall: the home screen between runs. A three-quarter room of real art frames (room/*), Kannan walking in it with a
// floating joystick (touch anywhere), tap-to-walk or WASD/arrows, and eight stations. Walking into a station's range tells the
// React overlay (hub event `hubStation`), which opens that station's panel; walking out closes it. All scene/UI talk goes through
// src/game/hub.ts. RunScene is asleep while this scene shows, and this one is asleep during a run (enter()/leave() below).
import * as Phaser from 'phaser';

import { FRAME_ATLAS } from '../atlas';
import { startMusic, stopMusic } from '../audio/music';
import { playSfx } from '../audio/sfx';
import { brand } from '@/ui/brand';

import type { Hub, StationId } from '../hub';
import { BOUNDS, DECALS, PROPS, NEAR, RANGE, ROOM_H, ROOM_W, route, SPEED, STATIONS, START, step, stationById, stationNear, type Prop } from './hub/layout';

type Dir = 'down' | 'up' | 'left' | 'right';
type Pt = { x: number; y: number };
type Placed = { img: Phaser.GameObjects.Image; x: number; y: number; w: number; /** Floor tile row: laid by screen size so tiles stay square when the screen is not 9:19. */ row?: number };

const FPS = 8;
const JOY_R = 56; // joystick travel, design units
const DRAG = 10; // a touch that moves this far (px) is the joystick, not a tap
const FLOOR_TRIM = 10; // px cut from every edge of a floor tile
const KANNAN_H = 92; // Kannan's drawn height, design units
// Station signs: the React overlay's cream text on the glass pill (GameUi.css --cream, and --glass at 0.78); lit, a warm pill.
const hex = (c: string): number => parseInt(c.slice(1), 16);
const LABEL_INK = '#FFF4E0';
const LABEL_PILL = 0x22140a;
const LABEL_PILL_ALPHA = 0.85;
const WARM = hex(brand.semantic.light.warnContainer);
const WARM_INK = brand.semantic.light.onWarnContainer;
const EXIT_GREEN = hex(brand.light.primary);
const SIGN_H = 28; // sign pill height, design units (text is 15 px at 390 wide)
const LIFT = 1.04; // the near station's art grows by this
type Sign = { tag: Phaser.GameObjects.Container; pill: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text; icon?: Phaser.GameObjects.Image; verb: Phaser.GameObjects.Container; w: number; hot: boolean | null; badge: Phaser.GameObjects.Container; /** Locked: a padlock and the reason, small, under the pill. */ lock: Phaser.GameObjects.Container; lockText: Phaser.GameObjects.Text; locked: boolean; baseY: number };
const reducedMotion = (): boolean => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const frame = (name: string): { key: string; frame: string } => ({ key: FRAME_ATLAS[name], frame: name });

export class HubScene extends Phaser.Scene {
  private hub!: Hub;
  private reduceMotion = false;
  private s = 1; // design unit -> screen px (by width)
  private sy = 1; // design y -> screen px
  private placed: Placed[] = [];
  private propArt = new Map<Prop, Placed>();
  private kannan!: Phaser.GameObjects.Image;
  private shadow?: Phaser.GameObjects.Image;
  private uncle?: Placed;
  private fan?: Phaser.GameObjects.Image;
  private rings = new Map<StationId, Phaser.GameObjects.Image>();
  private signs = new Map<StationId, Sign>();
  private halos = new Map<StationId, Phaser.GameObjects.Image>();
  private lift = new Map<StationId, number>();
  private near: StationId | null = null; // the one station whose sign is lit (closest within NEAR)
  private bubble?: { tag: Phaser.GameObjects.Container; until: number };
  private barked = false;
  private lockedBy: Partial<Record<StationId, string>> = {}; // onboarding: stations still closed, with their reason
  private pulseId: StationId | null = null; // onboarding: the one station that pulses
  private chests = 0; // unopened chests: a badge on the Pantry and Gear signs
  private shadows: { img: Phaser.GameObjects.Image; x: number; y: number; w: number }[] = [];
  private joyBase!: Phaser.GameObjects.Image;
  private joyKnob!: Phaser.GameObjects.Image;
  private pos: Pt = { ...START };
  private dir: Dir = 'down';
  private animT = 0;
  private walking = false;
  private path: Pt[] = [];
  private stuckFor = 0;
  private touch: { id: number; x: number; y: number; drag: boolean } | null = null;
  private joy: Pt = { x: 0, y: 0 };
  private keys!: { up: Phaser.Input.Keyboard.Key[]; down: Phaser.Input.Keyboard.Key[]; left: Phaser.Input.Keyboard.Key[]; right: Phaser.Input.Keyboard.Key[] };
  private current: StationId | null = null;
  private dismissed: StationId | null = null;
  private clock = 0;
  private bobbers: { p: Placed; phase: number }[] = []; // NPCs with a gentle idle bob

  constructor() {
    super('HubScene');
  }

  create(): void {
    this.hub = this.registry.get('hub') as Hub;
    this.hub.on('hubBadges', ({ chests }) => { this.chests = chests; });
    this.hub.on('hubGuide', ({ locked, next }) => { this.lockedBy = locked; this.pulseId = next; });
    this.reduceMotion = reducedMotion();
    this.cameras.main.setBackgroundColor(0xd8c5a6);
    this.build();
    const kb = this.input.keyboard;
    const k = (...codes: string[]) => codes.map((c) => kb!.addKey(c, false));
    if (kb) this.keys = { up: k('W', 'UP'), down: k('S', 'DOWN'), left: k('A', 'LEFT'), right: k('D', 'RIGHT') };
    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    this.input.on('pointerupoutside', this.onUp, this);
    this.scale.on('resize', this.relayout, this);
    this.events.on('sleep', this.onSleep, this);
    this.events.on('wake', this.relayout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.relayout, this));
    this.relayout();
    this.wireControls();
    this.scene.sleep(); // the title and the runs come first; enter() shows this scene
  }

  /** Add the hub's controls onto the run scene's (it booted first), and make a run start put this scene away. */
  private wireControls(): void {
    const c = this.hub.controls;
    if (!c) return;
    const runStart = c.start, runKitchen = c.startKitchen;
    c.start = (...a) => { this.leave(); runStart(...a); };
    c.startKitchen = (...a) => { this.leave(); runKitchen(...a); };
    c.hubEnter = () => this.enter();
    c.hubLeave = () => this.leave();
    c.hubWalkTo = (id) => { this.dismissed = null; const st = stationById(id); this.walkTo(st.x, st.y); };
    c.hubDismiss = () => { this.dismissed = this.current; };
  }

  private enter(): void {
    this.scene.sleep('RunScene');
    this.scene.wake('HubScene');
    this.reduceMotion = reducedMotion(); // the phone's setting may have changed while a run was on
    this.dismissed = null;
    startMusic('hub');
    // The loop sleeps whenever no run is live (RunScene.update); the queued scene changes need a step to happen.
    if (!this.game.loop.running) {
      if (this.scale.getParentBounds()) this.scale.refresh();
      this.game.loop.wake();
    }
  }

  private leave(): void {
    if (this.sys.isSleeping() || !this.sys.isActive()) return;
    this.scene.sleep('HubScene');
    this.scene.wake('RunScene');
    stopMusic(); // the run starts its own
  }

  private onSleep(): void {
    this.touch = null;
    this.joy = { x: 0, y: 0 };
    this.path = [];
    this.walking = false;
    this.joyBase.setVisible(false);
    this.joyKnob.setVisible(false);
    this.setStation(null);
    this.near = null;
    this.tweens.killTweensOf(this.cameras.main);
    this.cameras.main.setScroll(0, 0);
  }

  // ── Building the room ──────────────────────────────────────────────────────────────────────────────────────

  private image(name: string, w: number, depth: number, originY = 1): Phaser.GameObjects.Image {
    const { key, frame: f } = frame(name);
    const img = this.add.image(0, 0, key, f).setOrigin(0.5, originY).setDepth(depth);
    img.setData('w', w);
    return img;
  }

  private place(img: Phaser.GameObjects.Image, x: number, y: number, w: number): void {
    const fw = img.frame.realWidth || img.width;
    img.setScale((w * this.s) / fw).setPosition(x * this.s, y * this.sy);
  }

  private build(): void {
    // Floor: big terrazzo tiles (the frame is a seamless square), one screen wide, warmed and faded into the floor colour so the
    // speckle reads as calm texture rather than noise.
    for (let r = 0; r < 4; r++) {
      const img = this.image('room/hawker-floor-terrazzo-v2', ROOM_W, -1000, 0).setOrigin(0, 0).setCrop(FLOOR_TRIM, FLOOR_TRIM, 384 - 2 * FLOOR_TRIM, 384 - 2 * FLOOR_TRIM);
      img.setTint(r === 0 ? 0xb9a07c : 0xd9c4a2).setAlpha(0.8); // the top row sits behind the back wall: darker, so its gaps read as shade
      this.placed.push({ img, x: ROOM_W / 2, y: 0, w: ROOM_W, row: r });
    }
    for (const d of DECALS) {
      const img = this.image(d.frame, d.w, d.depth).setAlpha(d.alpha ?? 1);
      this.placed.push({ img, x: d.x, y: d.y, w: d.w });
    }
    for (const p of PROPS) {
      const img = this.image(p.frame, p.w, p.y);
      const placed = { img, x: p.x, y: p.y, w: p.w };
      this.placed.push(placed);
      this.propArt.set(p, placed);
      if (p.frame.startsWith('room/npc-')) this.bobbers.push({ p: placed, phase: this.bobbers.length * 1.7 });
    }
    // Soft ellipse shadows under every standing thing: they tie the three-quarter props to the flat floor.
    const soften = (x: number, y: number, w: number) => {
      const img = this.add.image(0, 0, 'shadow').setDepth(y - 0.6).setAlpha(0.35);
      this.shadows.push({ img, x, y, w });
    };
    for (const p of PROPS) soften(p.x, p.y - 2, p.w * 0.95);
    soften(82, 322, 40);
    const uncle = this.image('room/npc-uncle-ah-seng', 54, 320);
    this.uncle = { img: uncle, x: 82, y: 322, w: 54 };
    this.placed.push(this.uncle);
    for (const x of [100, 290]) {
      const lights = this.image('room/fairy-light-string', 200, 9000, 0);
      this.placed.push({ img: lights, x, y: -34, w: 200 });
    }
    this.fan = this.image('room/ceiling-fan-shadow', 240, 8000, 0.5).setAlpha(0.14);
    this.placed.push({ img: this.fan, x: 195, y: 520, w: 240 });

    for (const st of STATIONS) {
      const ring = this.image('roomui/station-prompt-ring', 64, st.y - 1000 + 1, 0.5).setVisible(false);
      this.placed.push({ img: ring, x: st.x, y: st.y, w: 64 });
      this.rings.set(st.id, ring);
      // The halo: the station's own art as a warm silhouette just behind it (an outline) while it is the near one.
      const prop = PROPS.find((q) => q.station === st.id)!;
      const halo = this.image(prop.frame, prop.w * 1.08, prop.y - 0.1).setTint(WARM).setTintMode(Phaser.TintModes.FILL).setAlpha(0).setVisible(false);
      this.placed.push({ img: halo, x: prop.x, y: prop.y, w: prop.w * 1.08 });
      this.halos.set(st.id, halo);
      this.lift.set(st.id, 1);
      this.signs.set(st.id, this.makeSign(st));
    }
    this.bubble = { tag: this.makeBubble('Kopi before you go?'), until: 0 };
    this.shadow = this.add.image(0, 0, 'shadow').setDepth(0);
    this.kannan = this.add.image(0, 0, FRAME_ATLAS['kannan/walk-down-idle'], 'kannan/walk-down-idle').setOrigin(0.5, 1);
    const jb = frame('roomui/joystick-base'), jk = frame('roomui/joystick-knob-v2');
    // Screen-fixed: the joystick is placed in screen px, so it must not move with the camera pan.
    this.joyBase = this.add.image(0, 0, jb.key, jb.frame).setDepth(20000).setAlpha(0.85).setVisible(false).setScrollFactor(0);
    this.joyKnob = this.add.image(0, 0, jk.key, jk.frame).setDepth(20001).setVisible(false).setScrollFactor(0);
  }

  /** A hanging sign: icon + 1-2 word name on a pill, and (hidden until near) a verb tag above it. Drawn in drawSign(). */
  private makeSign(st: (typeof STATIONS)[number]): Sign {
    const text = this.add.text(0, 0, st.label, { fontFamily: 'Fredoka, system-ui, sans-serif', fontSize: '15px', fontStyle: '700', color: LABEL_INK }).setOrigin(0, 0.5).setResolution(2);
    const pill = this.add.graphics();
    const icon = st.icon ? this.add.image(0, 0, FRAME_ATLAS[st.icon], st.icon).setOrigin(0, 0.5) : undefined;
    if (icon) icon.setScale(22 / icon.frame.realHeight);
    const vtext = this.add.text(0, 0, st.verb, { fontFamily: 'Nunito, system-ui, sans-serif', fontSize: '13px', fontStyle: '800', color: WARM_INK }).setOrigin(0.5).setResolution(2);
    const vw = vtext.width + 16;
    const vpill = this.add.graphics().fillStyle(WARM, 1).fillRoundedRect(-vw / 2, -9, vw, 18, 9).lineStyle(1.5, hex(brand.light.onSurface), 0.6).strokeRoundedRect(-vw / 2, -9, vw, 18, 9);
    const verb = this.add.container(0, -SIGN_H - 12, [vpill, vtext]).setVisible(false);
    const bt = this.add.text(0, 0, '!', { fontFamily: 'Fredoka, system-ui, sans-serif', fontSize: '13px', fontStyle: '700', color: '#FFFFFF' }).setOrigin(0.5).setResolution(2);
    const badge = this.add.container(0, 0, [this.add.graphics().fillStyle(hex(brand.semantic.light.coral), 1).fillCircle(0, 0, 10).lineStyle(2, hex(LABEL_INK), 1).strokeCircle(0, 0, 10), bt]).setVisible(false);
    // The lock note: a small padlock and the reason ("After run 2") on a dark chip under the sign. Hidden while open.
    const lockText = this.add.text(0, 0, '', { fontFamily: 'Nunito, system-ui, sans-serif', fontSize: '12px', fontStyle: '800', color: LABEL_INK }).setOrigin(0, 0.5).setResolution(2);
    const lockBg = this.add.graphics();
    const lock = this.add.container(0, 0, [lockBg, lockText]).setVisible(false);
    const tag = this.add.container(0, 0, [pill, ...(icon ? [icon] : []), text, verb, badge, lock]).setDepth(9500);
    return { tag, pill, text, icon, verb, w: 0, hot: null, badge, lock, lockText, locked: false, baseY: 0 };
  }

  private makeBubble(msg: string): Phaser.GameObjects.Container {
    const text = this.add.text(0, 0, msg, { fontFamily: 'Fredoka, system-ui, sans-serif', fontSize: '14px', fontStyle: '600', color: brand.light.onSurface }).setOrigin(0.5).setResolution(2);
    const w = text.width + 20, h = 28;
    const g = this.add.graphics().fillStyle(hex(brand.light.surface), 1).fillRoundedRect(-w / 2, -h / 2, w, h, 12).fillTriangle(-6, h / 2 - 1, 6, h / 2 - 1, -10, h / 2 + 9)
      .lineStyle(2, hex(brand.light.onSurface), 0.7).strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
    return this.add.container(0, 0, [g, text]).setDepth(9600).setVisible(false);
  }

  /** (Re)draw a sign's pill for its resting or lit look; only when that changes (or the text got its real width). */
  private drawSign(id: StationId, hot: boolean): void {
    const sg = this.signs.get(id)!;
    const iconW = sg.icon ? 22 * (sg.icon.frame.realWidth / sg.icon.frame.realHeight) : 0;
    const w = 12 + (sg.icon ? iconW + 6 : 0) + sg.text.width + 14;
    if (sg.hot === hot && sg.w === w) return;
    sg.hot = hot; sg.w = w;
    const exit = id === 'exit';
    const fill = hot ? WARM : exit ? EXIT_GREEN : LABEL_PILL;
    sg.pill.clear().fillStyle(fill, hot ? 1 : exit ? 1 : LABEL_PILL_ALPHA).fillRoundedRect(-w / 2, -SIGN_H, w, SIGN_H, SIGN_H / 2)
      .lineStyle(2, hot ? hex(brand.light.onSurface) : hex(LABEL_INK), hot ? 0.8 : 0.55).strokeRoundedRect(-w / 2, -SIGN_H, w, SIGN_H, SIGN_H / 2);
    let x = -w / 2 + 12;
    if (sg.icon) { sg.icon.setPosition(x, -SIGN_H / 2); x += iconW + 6; }
    sg.text.setPosition(x, -SIGN_H / 2 + 1).setColor(hot ? WARM_INK : LABEL_INK);
    sg.badge.setPosition(w / 2 - 2, -SIGN_H + 2);
  }

  /** The lock note under a locked sign (padlock + reason), or hidden when the station is open. */
  private drawLock(id: StationId): void {
    const sg = this.signs.get(id)!;
    const reason = this.lockedBy[id];
    const was = sg.lock.getData('reason') as string | undefined;
    sg.locked = !!reason;
    sg.lock.setVisible(!!reason);
    if (!reason || was === reason) return;
    sg.lock.setData('reason', reason);
    sg.lockText.setText(reason);
    const w = 22 + sg.lockText.width + 8, h = 18;
    const bg = sg.lock.list[0] as Phaser.GameObjects.Graphics;
    bg.clear().fillStyle(LABEL_PILL, 0.8).fillRoundedRect(-w / 2, 0, w, h, h / 2);
    // Padlock: a body and a shackle.
    const lx = -w / 2 + 9;
    bg.fillStyle(hex(LABEL_INK), 1).fillRoundedRect(lx - 4, 7, 8, 7, 1.5).lineStyle(1.5, hex(LABEL_INK), 1).beginPath().arc(lx, 7, 3, Math.PI, 0, false).strokePath();
    sg.lockText.setPosition(-w / 2 + 18, h / 2 + 0.5);
    sg.lock.setPosition(0, 4);
  }

  private relayout(): void {
    const { width: W, height: H } = this.scale;
    this.s = W / ROOM_W;
    this.sy = H / ROOM_H;
    for (const p of this.placed) {
      if (p.row === undefined) { this.place(p.img, p.x, p.y, p.w); continue; }
      // A floor tile: its art's edge is a lighter line, so trim it and let the tiles overlap by a pixel.
      const k = (ROOM_W * this.s + 1) / (384 - 2 * FLOOR_TRIM);
      p.img.setScale(k).setPosition(Math.round((p.x - ROOM_W / 2) * this.s) - FLOOR_TRIM * k, Math.round(p.row * ROOM_W * this.s) - FLOOR_TRIM * k);
    }
    for (const st of STATIONS) {
      const sg = this.signs.get(st.id)!;
      const prop = this.propArt.get(PROPS.find((q) => q.station === st.id)!)!;
      // The art has about a fifth of empty margin above its content: hang the sign on the content.
      const h = (prop.w * prop.img.frame.realHeight) / prop.img.frame.realWidth;
      sg.hot = null; // the font may have loaded since: measure again
      this.drawSign(st.id, st.id === this.near);
      sg.baseY = (prop.y - h * 0.82 - 4) * this.sy;
      sg.tag.setPosition(prop.x * this.s, sg.baseY).setScale(this.s);
    }
    if (this.uncle && this.bubble) this.bubble.tag.setPosition(this.uncle.x * this.s, (this.uncle.y - 66) * this.sy).setScale(this.s);
    for (const sh of this.shadows) sh.img.setPosition(sh.x * this.s, sh.y * this.sy).setScale((sh.w * this.s) / 64, (sh.w * 0.22 * this.s) / 64);
    this.joyBase.setScale((120 * this.s) / this.joyBase.frame.realWidth);
    this.joyKnob.setScale((48 * this.s) / this.joyKnob.frame.realWidth);
    this.drawKannan();
  }

  // ── Input ──────────────────────────────────────────────────────────────────────────────────────────────────

  private onDown(p: Phaser.Input.Pointer): void {
    if (this.touch) return;
    this.touch = { id: p.id, x: p.x, y: p.y, drag: false };
  }

  private onMove(p: Phaser.Input.Pointer): void {
    const t = this.touch;
    if (!t || t.id !== p.id || !p.isDown) return;
    const dx = p.x - t.x, dy = p.y - t.y;
    if (!t.drag && Math.hypot(dx, dy) > DRAG) {
      t.drag = true;
      this.path = []; // dragging takes the wheel from tap-to-walk
      this.joyBase.setPosition(t.x, t.y).setVisible(true);
      this.joyKnob.setVisible(true);
    }
    if (!t.drag) return;
    const max = JOY_R * this.s;
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / max);
    this.joy = { x: (dx / d) * k, y: (dy / d) * k };
    this.joyKnob.setPosition(t.x + (dx / d) * Math.min(d, max), t.y + (dy / d) * Math.min(d, max));
  }

  private onUp(p: Phaser.Input.Pointer): void {
    const t = this.touch;
    if (!t || t.id !== p.id) return;
    this.touch = null;
    this.joy = { x: 0, y: 0 };
    this.joyBase.setVisible(false);
    this.joyKnob.setVisible(false);
    if (!t.drag) this.tap(p.x / this.s, (p.y + this.cameras.main.scrollY) / this.sy); // the room is panned, the tap is not
  }

  /** A tap on a station prop walks to it; a tap on the floor walks to that spot. */
  private tap(x: number, y: number): void {
    this.dismissed = null;
    const hit = [...PROPS].filter((q) => q.station).sort((a, b) => b.y - a.y).find((q) => this.over(q, x, y));
    if (hit) {
      const st = stationById(hit.station!);
      this.walkTo(st.x, st.y);
    } else this.walkTo(x, y);
  }

  private over(p: Prop, x: number, y: number): boolean {
    const f = this.propArt.get(p)!.img.frame;
    const h = (p.w * f.realHeight) / f.realWidth;
    return Math.abs(x - p.x) < p.w / 2 && y < p.y + 8 && y > p.y - h;
  }

  private walkTo(x: number, y: number): void {
    const to = { x: Math.min(BOUNDS.x1, Math.max(BOUNDS.x0, x)), y: Math.min(BOUNDS.y1, Math.max(BOUNDS.y0, y)) };
    this.path = route(this.pos, to);
    this.stuckFor = 0;
  }

  // ── Frame ──────────────────────────────────────────────────────────────────────────────────────────────────

  update(_t: number, delta: number): void {
    const dt = Math.min(delta, 100) / 1000;
    this.clock += dt;
    let vx = this.joy.x, vy = this.joy.y;
    const kb = this.keys;
    if (kb) {
      const on = (ks: Phaser.Input.Keyboard.Key[]) => ks.some((key) => key.isDown);
      const kx = (on(kb.right) ? 1 : 0) - (on(kb.left) ? 1 : 0), ky = (on(kb.down) ? 1 : 0) - (on(kb.up) ? 1 : 0);
      if (kx || ky) { vx = kx; vy = ky; this.path = []; }
    }
    if (!vx && !vy && this.path.length) {
      const w = this.path[0];
      const d = Math.hypot(w.x - this.pos.x, w.y - this.pos.y);
      if (d < 4) this.path.shift();
      else { vx = (w.x - this.pos.x) / d; vy = (w.y - this.pos.y) / d; }
    }
    const m = Math.min(1, Math.hypot(vx, vy));
    this.walking = m > 0.05;
    if (this.walking) {
      const n = Math.hypot(vx, vy);
      const before = this.pos;
      this.pos = step(before.x, before.y, (vx / n) * m * SPEED * dt, (vy / n) * m * SPEED * dt);
      if (Math.abs(vx) > Math.abs(vy)) this.dir = vx > 0 ? 'right' : 'left';
      else this.dir = vy > 0 ? 'down' : 'up';
      // Stuck against a prop while tap-walking: give up rather than push forever.
      const moved = Math.hypot(this.pos.x - before.x, this.pos.y - before.y);
      this.stuckFor = this.path.length && moved < 0.2 * m * SPEED * dt ? this.stuckFor + dt : 0;
      if (this.stuckFor > 0.4) { this.path = []; this.stuckFor = 0; }
      const before2 = Math.floor(this.animT * FPS / 2);
      this.animT += dt;
      if (Math.floor(this.animT * FPS / 2) !== before2) playSfx('step'); // a footfall on every second frame
    } else this.animT = 0;
    this.drawKannan();
    this.updateStation();
    this.animateProps();
  }

  private drawKannan(): void {
    if (!this.kannan) return;
    const name = this.walking ? `kannan/walk-${this.dir}-walk-${(Math.floor(this.animT * FPS) % 4) + 1}` : `kannan/walk-${this.dir}-idle`;
    this.kannan.setTexture(FRAME_ATLAS[name], name);
    // A breath on the idle frame; reduced motion keeps him still.
    const breath = !this.walking && !this.reduceMotion ? 1 + Math.sin(this.clock * 2.4) * 0.012 : 1;
    const k = (KANNAN_H * this.s) / 190;
    this.kannan.setScale(k, k * breath);
    this.kannan.setPosition(this.pos.x * this.s, this.pos.y * this.sy).setDepth(this.pos.y);
    this.shadow?.setPosition(this.pos.x * this.s, (this.pos.y - 1) * this.sy).setScale((46 * this.s) / 64, (16 * this.s) / 64).setDepth(this.pos.y - 0.5).setAlpha(0.6);
  }

  private updateStation(): void {
    this.near = stationNear(this.pos.x, this.pos.y, NEAR)?.id ?? null;
    const near = stationNear(this.pos.x, this.pos.y);
    let id: StationId | null = near?.id ?? null;
    // Out of range: the panel closes (with a little slack so the edge does not flicker). Held open while still close.
    if (this.current && !near) {
      const st = stationById(this.current);
      if (Math.hypot(st.x - this.pos.x, st.y - this.pos.y) <= RANGE + 24) id = this.current;
    }
    if (this.dismissed && id !== this.dismissed) this.dismissed = null;
    if (id && id === this.dismissed) id = null; // closed by hand: stay shut until Kannan leaves
    this.setStation(id);
  }

  private setStation(id: StationId | null): void {
    if (id === this.current) return;
    this.current = id;
    this.hub.emit('hubStation', { id });
    this.panFor(id ? this.pos.y : null);
  }

  /** The open sheet covers the lower 55% of the screen: slide the room up so Kannan stands above it (0.38 of the height), and back
   *  down on close. A 250 ms tween; reduced motion jumps. */
  private panFor(y: number | null): void {
    const cam = this.cameras.main;
    const to = y === null ? 0 : Math.max(0, y - ROOM_H * 0.38) * this.sy;
    this.tweens.killTweensOf(cam);
    if (this.reduceMotion) cam.setScroll(0, to);
    else this.tweens.add({ targets: cam, scrollY: to, duration: 250, ease: 'Sine.easeInOut' });
  }

  /** Kannan's first walk near the kopi uncle each session: a 2 s speech bubble. */
  private updateBark(): void {
    const b = this.bubble;
    if (!b || !this.uncle) return;
    if (!this.barked && !this.lockedBy.kopi && Math.hypot(this.uncle.x - this.pos.x, this.uncle.y - this.pos.y) < 90) {
      this.barked = true;
      b.until = this.clock + 2;
      b.tag.setVisible(true);
    }
    if (b.tag.visible && this.clock > b.until) b.tag.setVisible(false);
  }

  private animateProps(): void {
    for (const [sid, ring] of this.rings) {
      this.drawLock(sid);
      const sg = this.signs.get(sid)!;
      const closed = sg.locked;
      const on = sid === this.near && !closed;
      // The one onboarding pulse: a warm sign and halo that breathe (and the sign bobs); reduced motion holds them static.
      const pulse = sid === this.pulseId && !closed;
      const wave = this.reduceMotion ? 1 : 0.5 + 0.5 * Math.sin(this.clock * 4);
      ring.setVisible(on);
      if (on) ring.setAlpha(this.reduceMotion ? 0.9 : 0.7 + 0.3 * Math.sin(this.clock * 4));
      this.drawSign(sid, on || pulse);
      sg.verb.setVisible(on);
      sg.tag.setAlpha(closed ? 0.7 : 1);
      sg.tag.y = sg.baseY - (pulse && !this.reduceMotion ? Math.abs(Math.sin(this.clock * 4)) * 5 * this.s : 0);
      const badged = (sid === 'pantry' || sid === 'gear') && this.chests > 0 && !closed;
      sg.badge.setVisible(badged);
      if (badged) (sg.badge.list[1] as Phaser.GameObjects.Text).setText(String(this.chests));
      // The lit station lifts a little (a 4% grow, eased); reduced motion only glows. A closed one is dimmed.
      const prop = PROPS.find((q) => q.station === sid)!;
      const art = this.propArt.get(prop)!.img, halo = this.halos.get(sid)!;
      if (closed) art.setTint(0x8a8078).setAlpha(0.75); else art.clearTint().setAlpha(1);
      const want = on && !this.reduceMotion ? LIFT : 1;
      const k = this.lift.get(sid)! + (want - this.lift.get(sid)!) * 0.25;
      this.lift.set(sid, k);
      const base = (prop.w * this.s) / art.frame.realWidth;
      art.setScale(base * k);
      const glow = on ? 0.9 : pulse ? 0.45 + 0.4 * wave : 0;
      halo.setVisible(glow > 0).setAlpha(glow).setScale(base * 1.08 * k);
    }
    this.updateBark();
    if (this.fan && !this.reduceMotion) this.fan.setAngle(this.clock * 40);
    if (this.uncle && !this.reduceMotion) this.uncle.img.setScale(this.uncle.img.scaleX, ((this.uncle.w * this.s) / (this.uncle.img.frame.realWidth)) * (1 + Math.sin(this.clock * 2) * 0.012));
    if (!this.reduceMotion) for (const b of this.bobbers) {
      const k = (b.p.w * this.s) / b.p.img.frame.realWidth;
      b.p.img.setScale(k, k * (1 + Math.sin(this.clock * 2.2 + b.phase) * 0.012));
    }
  }
}
