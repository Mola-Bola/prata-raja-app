// The walkable stall: the home screen between runs. A three-quarter room of real art frames (room/*), Kannan walking in it with a
// floating joystick (touch anywhere), tap-to-walk or WASD/arrows, and eight stations. Walking into a station's range tells the
// React overlay (hub event `hubStation`), which opens that station's panel; walking out closes it. All scene/UI talk goes through
// src/game/hub.ts. RunScene is asleep while this scene shows, and this one is asleep during a run (enter()/leave() below).
import * as Phaser from 'phaser';

import { FRAME_ATLAS } from '../atlas';
import { startMusic, stopMusic } from '../audio/music';
import { playSfx } from '../audio/sfx';
import type { Hub, StationId } from '../hub';
import { BOUNDS, DECALS, PROPS, RANGE, ROOM_H, ROOM_W, route, SPEED, STATIONS, START, step, stationById, stationNear, type Prop } from './hub/layout';

type Dir = 'down' | 'up' | 'left' | 'right';
type Pt = { x: number; y: number };
type Placed = { img: Phaser.GameObjects.Image; x: number; y: number; w: number; /** Floor tile row: laid by screen size so tiles stay square when the screen is not 9:19. */ row?: number };

const FPS = 8;
const JOY_R = 56; // joystick travel, design units
const DRAG = 10; // a touch that moves this far (px) is the joystick, not a tap
const FLOOR_TRIM = 10; // px cut from every edge of a floor tile
const KANNAN_H = 92; // Kannan's drawn height, design units
// Station labels: the React overlay's cream text on the glass pill (GameUi.css --cream, and --glass at 0.78).
const LABEL_INK = '#FFF4E0';
const LABEL_PILL = 0x22140a;
const LABEL_PILL_ALPHA = 0.78;
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
  private labels = new Map<StationId, { tag: Phaser.GameObjects.Container; text: Phaser.GameObjects.Text; pill: Phaser.GameObjects.Graphics }>();
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
      // A glass pill behind the name: the pill is drawn in relayout(), once the text has its size.
      const text = this.add.text(0, 0, st.label, { fontFamily: 'Fredoka, system-ui, sans-serif', fontSize: '14px', color: LABEL_INK }).setOrigin(0.5, 1);
      const pill = this.add.graphics();
      const tag = this.add.container(0, 0, [pill, text]).setDepth(9500);
      this.labels.set(st.id, { tag, text, pill });
    }
    this.shadow = this.add.image(0, 0, 'shadow').setDepth(0);
    this.kannan = this.add.image(0, 0, FRAME_ATLAS['kannan/walk-down-idle'], 'kannan/walk-down-idle').setOrigin(0.5, 1);
    const jb = frame('roomui/joystick-base'), jk = frame('roomui/joystick-knob-v2');
    // Screen-fixed: the joystick is placed in screen px, so it must not move with the camera pan.
    this.joyBase = this.add.image(0, 0, jb.key, jb.frame).setDepth(20000).setAlpha(0.85).setVisible(false).setScrollFactor(0);
    this.joyKnob = this.add.image(0, 0, jk.key, jk.frame).setDepth(20001).setVisible(false).setScrollFactor(0);
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
      const { tag, text, pill } = this.labels.get(st.id)!;
      const w = text.width + 16, h = text.height + 6;
      pill.clear().fillStyle(LABEL_PILL, LABEL_PILL_ALPHA).fillRoundedRect(-w / 2, -text.height - 3, w, h, h / 2);
      tag.setPosition(st.x * this.s, (st.y - 22) * this.sy).setScale(this.s * 0.95);
    }
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

  private animateProps(): void {
    for (const [sid, ring] of this.rings) {
      const on = sid === this.current;
      ring.setVisible(on);
      if (on) ring.setAlpha(this.reduceMotion ? 0.9 : 0.7 + 0.3 * Math.sin(this.clock * 4));
      this.labels.get(sid)!.tag.setAlpha(on ? 1 : 0.82);
    }
    if (this.fan && !this.reduceMotion) this.fan.setAngle(this.clock * 40);
    if (this.uncle && !this.reduceMotion) this.uncle.img.setScale(this.uncle.img.scaleX, ((this.uncle.w * this.s) / (this.uncle.img.frame.realWidth)) * (1 + Math.sin(this.clock * 2) * 0.012));
    if (!this.reduceMotion) for (const b of this.bobbers) {
      const k = (b.p.w * this.s) / b.p.img.frame.realWidth;
      b.p.img.setScale(k, k * (1 + Math.sin(this.clock * 2.2 + b.phase) * 0.012));
    }
  }
}
