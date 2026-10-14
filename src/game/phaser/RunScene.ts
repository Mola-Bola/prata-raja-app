// The run, drawn. Owns the World: steps the sim on a fixed 1/60 s clock, turns its events into effects, draws its state,
// and talks to the React overlay only through the hub (src/game/hub.ts). Rules live in src/core; nothing here decides
// damage, spawns or drops, it only shows them.
import * as Phaser from 'phaser';

import { applyKitchenTuning, createKitchenRun, DEFAULT_KITCHEN_TUNING, type KitchenConfig, type KitchenTuning } from '@/core/kitchen';
import { CONTENT } from '@/content';
import { bossAtOf, isFlow } from '@/core/director';
import { autoInput, autoPick } from '@/core/autoplay';
import { SAVE_KEY } from '@/core/save';
import { chooseCard, createRun, drainEvents, reroll, step } from '@/core/sim';
import { FIELD, type GameEvent, type Loadout, type RunInput, type RunResult, type World } from '@/core/types';
import { computeLoadout } from '@/meta/loadout';
import { parseSaveV2 } from '@/meta/migrate';

import { playSfx, setSfxEnabled, unlockAudio, type SfxName } from '../audio/sfx';
import type { Bridge, HapticKind } from '../bridgeTypes';
import type { Hub, HudState, KitchenStats } from '../hub';
import { Actors } from './actors';
import { FeedbackGate, strongerHaptic } from './combatFeedback';
import { DangerCue } from './danger';
import { Fx } from './fx';
import { DragInput } from './input';
import { makeLayout, Projector, type Layout } from './layout';
import { CURRY, D, HAZARD, HUD_PERIOD, MAX_STEPS, SHAKE_SHARE, STEEL, STEP, TRAUMA_DECAY } from './look';
import { DiscPool, ImagePool } from './pools';
import { Stall } from './stall';
import { Street } from './street';
import { Telegraphs } from './telegraph';

declare global {
  interface Window {
    /** The current run's World, for tests and the console. */
    __world?: World | null;
  }
}

const TAU = Math.PI * 2;
const hex = (c: string): number => parseInt(c.slice(1), 16);

/** URL switches for tests: ?seed=N fixes the run's seed, ?bot=1 plays by itself (and starts at once), ?speed=N runs the sim N times faster. */
function readUrl(): { seed: number | null; bot: boolean; speed: number; kitchen: boolean } {
  if (typeof window === 'undefined') return { seed: null, bot: false, speed: 1, kitchen: false };
  const q = new URLSearchParams(window.location.search);
  const seed = q.get('seed');
  const speed = Number(q.get('speed'));
  return {
    seed: seed !== null && Number.isFinite(Number(seed)) ? Number(seed) >>> 0 : null,
    bot: q.get('bot') === '1',
    kitchen: q.get('kitchen') === '1',
    speed: Number.isFinite(speed) && speed > 0 ? Math.min(speed, 16) : 1,
  };
}

export class RunScene extends Phaser.Scene {
  private hub!: Hub;
  private bridge: Bridge | undefined;
  private l!: Layout;
  private proj = new Projector();
  private imgs!: ImagePool;
  private discs!: DiscPool;
  private stall!: Stall;
  private street!: Street;
  private actors!: Actors;
  private fx!: Fx;
  private tele!: Telegraphs;
  private danger!: DangerCue;
  private drag!: DragInput;
  private url = readUrl();
  private reduceMotion = false;

  private world: World | null = null;
  private paused = false;
  private kitchenTuning: KitchenTuning | null = null;
  private damageShown = 0;
  private bootRequest = 0;
  private levelUpOpen = false;
  /** The run is over (won, lost, or Kannan woke up early): the world stays on screen, frozen, until the next start or quit. */
  private ended = false;
  private wokeEarly = false;
  private acc = 0;
  private hitStop = 0;
  private trauma = 0;
  private uiTime = 0;
  private hudT = 0;
  private critUid = -1;
  private lastGold = 0;
  private lastKill = { x: 0, y: 0, on: false };
  private hapticGate = new FeedbackGate();
  private damageGate = new FeedbackGate();
  private traumaGate = new FeedbackGate();
  private eliteGate = new FeedbackGate();
  private hapticBatch: { kind: HapticKind | null; gap: number } | null = null;
  private healAt = 0;
  private hapticsOn = true;
  private dipColors: number[] = [];
  private hits = 0;
  private faults = 0;
  private input_: RunInput = { targetX: null, moving: false };

  constructor() {
    super('RunScene');
  }

  create(data: { pending?: { seed?: number; loadout?: Loadout; chapterId?: string } | null; pendingKitchen?: KitchenConfig | null }): void {
    this.hub = this.registry.get('hub') as Hub;
    this.bridge = this.registry.get('bridge') as Bridge | undefined;
    this.reduceMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.imgs = new ImagePool(this);
    this.discs = new DiscPool(this);
    this.stall = new Stall(this, this.imgs);
    this.street = new Street(this);
    this.actors = new Actors(this.proj, this.imgs, this.discs);
    this.fx = new Fx(this, this.imgs);
    this.tele = new Telegraphs(this.imgs, this.proj, (uid, out) => this.actors.locate(uid, out));
    this.danger = new DangerCue(this, this.actors);
    this.drag = new DragInput(this, () => this.l);
    // Browsers only start sound from a tap: the first touch on the canvas unlocks it (the Start button's click does too).
    this.input.on('pointerdown', unlockAudio);
    this.relayout();
    this.scale.on('resize', this.relayout, this);
    // The page went hidden (the app was backgrounded, the tab switched): hold the run. Phaser raises this for the browser's
    // visibilitychange and for the WebView's own pause event.
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.onHidden, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.relayout, this);
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.onHidden, this);
      this.input.off('pointerdown', unlockAudio);
      window.__world = null;
    });
    this.hub.controls = {
      start: (seed, loadout, chapterId) => this.start(seed, loadout, chapterId),
      startKitchen: (config) => this.startKitchen(config),
      tuneKitchen: (tuning) => this.tuneKitchen(tuning),
      stopKitchen: () => this.stopKitchen(),
      choose: (i) => this.choose(i),
      reroll: () => this.rerollOffer(),
      pause: () => this.hold(),
      resume: () => {
        this.paused = false;
        this.applySettings();
      },
      quit: () => this.quit(),
    };
    this.applySettings();
    // Tests: ?bot=1 starts a self-playing run without anyone tapping the title screen.
    if (data?.pendingKitchen) this.startKitchen(data.pendingKitchen);
    else if (data?.pending) this.start(data.pending.seed, data.pending.loadout, data.pending.chapterId);
    else if (this.url.bot && !this.url.kitchen) this.startBot();
  }

  /** The bot starts a run the way the Start button does: with the gear and training its save holds (none if it cannot be read). */
  private startBot(): void {
    if (!this.bridge) return this.start();
    const request = ++this.bootRequest;
    this.bridge.load(SAVE_KEY).then(
      (json) => { if (request === this.bootRequest) this.start(undefined, computeLoadout(parseSaveV2(json), CONTENT)); },
      () => { if (request === this.bootRequest) this.start(); },
    );
  }

  // ── Layout ─────────────────────────────────────────────────────────────────────────────────────────────────

  private relayout(): void {
    this.l = makeLayout(this.scale.width, this.scale.height);
    this.proj.setLayout(this.l);
    this.stall.setLayout(this.l);
    this.actors.setLayout(this.l);
    this.fx.u = this.l.u;
    this.danger.setUnit(this.l.u);
  }

  // ── Controls (what the React overlay calls) ────────────────────────────────────────────────────────────────

  private start(seed?: number, loadout?: Loadout, chapterId?: string): void {
    const s = this.url.seed ?? seed ?? Math.floor(Math.random() * 0x100000000);
    this.showWorld(createRun({ seed: s, content: CONTENT, loadout, chapterId }));
    this.hub.emit('runStart', { seed: s });
    void this.bridge?.track('run_start', {}).catch(() => {});
    this.wake();
  }

  private startKitchen(config: KitchenConfig): void {
    const world = createKitchenRun(config, CONTENT);
    const tuning = applyKitchenTuning(world, { ...DEFAULT_KITCHEN_TUNING, ...config.tuning });
    this.showWorld(world);
    this.kitchenTuning = tuning;
    this.hub.emit('kitchenStart', { seed: world.seed, tuning: { ...tuning }, ...(config.flakyKosong !== undefined ? { flakyKosong: world.flakyKosong === true } : {}) });
    this.publishKitchenStats();
    this.wake();
  }

  private tuneKitchen(tuning: KitchenTuning): void {
    if (!this.world || !this.kitchenTuning) return;
    this.kitchenTuning = applyKitchenTuning(this.world, tuning);
    this.publishKitchenStats();
  }

  private kitchenStats(): KitchenStats | null {
    const w = this.world, tuning = this.kitchenTuning;
    if (!w || !tuning) return null;
    return { time: w.time, wave: w.wave, phase: w.phase, hp: Math.max(0, w.player.hp), maxHp: w.player.stats.maxHp,
      kills: w.kills, damageShown: this.damageShown, damageShownPerSecond: w.time > 0 ? this.damageShown / w.time : 0,
      tuning: { ...tuning }, flakyKosong: w.flakyKosong === true };
  }

  private publishKitchenStats(): void {
    const stats = this.kitchenStats();
    if (stats) this.hub.emit('kitchenStats', stats);
  }

  private stopKitchen(): void {
    if (!this.kitchenTuning) return;
    const stats = this.kitchenStats();
    this.clearWorld();
    this.paused = false;
    if (stats) this.hub.emit('kitchenEnd', { reason: 'stopped', stats });
    this.wake(); // Draw the cleared scene even if the completed run put the loop to sleep.
  }

  private showWorld(w: World): void {
    unlockAudio();
    this.applySettings();
    this.clearWorld();
    this.stall.setBackground(w.chapter.background);
    this.street.setVisible(isFlow(w.chapter));
    this.world = w;
    window.__world = w;
    this.paused = false;
    this.levelUpOpen = false;
    this.ended = false;
    this.wokeEarly = false;
    this.acc = 0;
    this.hudT = HUD_PERIOD;
    this.lastGold = 0;
    this.stall.snapshot(0);
    this.refreshDips();
  }

  /** Stop the run where it is (the sim does not step, the frame is left as drawn). */
  private hold(): void {
    this.paused = true;
    this.trauma = 0;
    this.hitStop = 0;
    this.drag.release();
    this.cameras.main.setScroll(0, 0);
  }

  /** The page went hidden mid-run: hold it, and tell the overlay to show its pause sheet. A level-up already holds the sim
   *  behind its own card sheet, and nothing is running before a start or after an end. */
  private onHidden(): void {
    const w = this.world;
    if (!w || this.ended || this.paused || w.phase === 'levelup') return;
    this.hold();
    this.hub.emit('paused', { reason: 'hidden' });
  }

  /** "Quit to title". A live run ends the way a lost one does (Kannan wakes up early) so it pays out and the results
   *  screen shows it; a run that already ended, or none, just goes back to the idle stall. */
  private quit(): void {
    if (this.kitchenTuning) { this.stopKitchen(); return; }
    const w = this.world;
    this.paused = false;
    if (w && !this.ended && w.phase !== 'won' && w.phase !== 'lost') {
      this.drag.release();
      this.wokeEarly = true;
      w.result = this.earlyResult(w);
      this.endRun(w);
      return;
    }
    this.clearWorld();
  }

  /** The RunResult core/sim.ts endRun builds for a loss, from the world as it stands. */
  private earlyResult(w: World): RunResult {
    const p = w.player;
    return {
      chapterId: w.chapter.id,
      bossAttempted: w.bossAttempted ?? false,
      won: false,
      wave: w.wave,
      ...(isFlow(w.chapter) ? { dist: Math.round(w.dist) } : {}),
      kills: w.kills,
      bossKills: w.bossKills,
      time: w.time,
      level: p.level,
      gold: Math.round(w.gold) + 5 * Math.max(0, w.wave - 1),
      breads: p.breads.map((b) => ({ ...b })),
      dips: p.dips.map((d) => ({ ...d })),
      dipUseXp: { ...w.dipUseXp },
    };
  }

  private clearWorld(): void {
    this.bootRequest++;
    this.kitchenTuning = null;
    this.damageShown = 0;
    this.world = null;
    this.ended = false;
    this.wokeEarly = false;
    this.levelUpOpen = false;
    window.__world = null;
    this.actors.clear();
    this.fx.clear();
    this.tele.clear();
    this.danger.clear();
    this.stall.reset();
    this.street.setVisible(false);
    this.drag.release();
    this.trauma = 0;
    this.hitStop = 0;
    this.hapticGate.reset();
    this.damageGate.reset();
    this.traumaGate.reset();
    this.eliteGate.reset();
    this.hapticBatch = null;
    this.cameras.main.setScroll(0, 0);
  }

  private choose(i: number): void {
    const w = this.world;
    if (!w || this.kitchenTuning || w.phase !== 'levelup') return;
    const card = w.offer[i];
    if (!card) return;
    chooseCard(w, i);
    this.refreshDips();
    this.sfx('cardPick');
    void this.bridge?.track('card_pick', { kind: card.kind }).catch(() => {});
    if ((w.phase as string) === 'levelup') this.openLevelUp(w);
    else this.levelUpOpen = false;
  }

  private rerollOffer(): void {
    const w = this.world;
    if (w && !this.kitchenTuning && reroll(w)) this.openLevelUp(w);
  }

  private openLevelUp(w: World): void {
    this.levelUpOpen = true;
    // The cards swallow touches: a finger that was down will not report its release to the canvas.
    this.drag.release();
    this.hub.emit('levelUp', { offer: w.offer, rerolls: w.rerolls, level: w.player.level - w.pendingLevelUps + 1 });
  }

  /** The Sound and Haptics switches live in the save, which the overlay writes. Read them when a run starts or resumes. */
  private applySettings(): void {
    this.bridge
      ?.load(SAVE_KEY)
      .then((json) => {
        // The save is SaveV2 now (parseSave would read it as unknown and give back the default switches).
        const s = parseSaveV2(json).settings;
        this.hapticsOn = s.haptics;
        setSfxEnabled(s.sfx);
      })
      .catch(() => {});
  }

  private refreshDips(): void {
    this.dipColors.length = 0;
    const w = this.world;
    if (!w) return;
    for (const d of w.player.dips) this.dipColors.push(hex(w.content.dips[d.id].color));
  }

  // ── Frame ──────────────────────────────────────────────────────────────────────────────────────────────────

  update(_time: number, delta: number): void {
    if (this.paused) return;
    // An exception that escaped the scene's update would stop Phaser's frame loop for good (the screen freezes with the
    // pause button still on top). Log the first few and keep drawing.
    try {
      this.frame(Math.min(delta, 100) / 1000);
    } catch (e) {
      if (this.faults++ < 5) console.error('[run] frame failed', e);
    }
    // No run on screen (the title, the stall, the wake-up screen: the overlay covers the canvas): stop drawing it. This frame
    // still finishes and renders, so the last picture is there; start() wakes the loop.
    if (!this.world || this.ended) this.game.loop.sleep();
  }

  /** Wake the loop for a run. It sleeps (see update) whenever none is live, so a start can find it stopped. */
  private wake(): void {
    const loop = this.game.loop;
    if (loop.running) return;
    // The window may have changed shape while the loop slept (rotation, split screen): look again before the first frame.
    if (this.scale.getParentBounds()) this.scale.refresh();
    loop.wake();
  }

  private frame(dt: number): void {
    this.uiTime += dt;
    const w = this.world;
    const l = this.l;
    let alpha = 1;
    if (w && !this.ended) {
      alpha = this.stepSim(w, dt);
      if (w.phase === 'levelup' && !this.kitchenTuning) {
        if (this.url.bot) this.choose(autoPick(w));
        else if (!this.levelUpOpen) this.openLevelUp(w);
      }
    }
    if (w) this.street.draw(w.dist, this.proj);
    this.stall.update(w ? w.player : null, w ? (this.wokeEarly ? 'lost' : w.phase) : null, alpha, this.uiTime, dt, this.reduceMotion);
    // A shot leaves his raised hand and settles onto the field projection of its own lane.
    const home = this.proj.at(this.stall.fieldX, 0);
    this.actors.setHand(this.stall.handX - home.sx, this.stall.handY - home.sy);
    this.fx.tx = this.stall.chestX;
    this.fx.ty = this.stall.chestY;
    if (w) {
      this.actors.draw(w, alpha, this.uiTime, dt);
      this.publishHud(w, dt);
    }
    this.tele.draw(w ? w.time : 0, l.u);
    if (w) this.danger.update(w, l, this.uiTime, this.reduceMotion);
    this.fx.update(dt);
    this.shake(dt);
  }

  /** Run as many fixed steps as the elapsed time covers. Returns how far into the next step we are (0..1) for drawing. */
  private stepSim(w: World, dt: number): number {
    if (w.phase !== 'intro' && w.phase !== 'wave') {
      this.hitStop = 0;
      this.acc = 0;
      return 1;
    }
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      return Math.min(1, this.acc / STEP);
    }
    this.acc += dt * this.url.speed;
    const max = Math.ceil(MAX_STEPS * Math.max(1, this.url.speed));
    let n = 0;
    while (this.acc >= STEP && n < max) {
      this.acc -= STEP;
      n++;
      this.actors.snapshot(w);
      this.stall.snapshot(w.player.x);
      if (this.url.bot) {
        const b = autoInput(w);
        this.input_.targetX = b.targetX;
        this.input_.moving = b.moving;
      } else this.drag.read(this.input_);
      step(w, STEP, this.input_);
      this.handle(w, drainEvents(w));
      if ((w.phase !== 'wave' && w.phase !== 'intro') || this.hitStop > 0) break;
    }
    // Too far behind (a slow frame): drop the backlog rather than chase it.
    if (n >= max) this.acc = 0;
    return Math.min(1, this.acc / STEP);
  }

  private publishHud(w: World, dt: number): void {
    this.hudT += dt;
    if (this.hudT < HUD_PERIOD) return;
    this.hudT = 0;
    const p = w.player;
    let boss: HudState['boss'] = null;
    for (const e of w.enemies) {
      if (e.boss && e.state !== 'dead') {
        boss = { name: e.def.name, hp: Math.max(0, e.hp), maxHp: e.maxHp };
        break;
      }
    }
    this.publishKitchenStats();
    this.hub.emit('hud', {
      wave: w.wave,
      waves: w.chapter.waves.length,
      route: isFlow(w.chapter) ? { name: w.chapter.name, dist: w.dist, bossAt: bossAtOf(w.chapter) } : null,
      hp: Math.max(0, p.hp),
      maxHp: p.stats.maxHp,
      xp: p.xp,
      xpToNext: p.xpToNext,
      level: p.level,
      gold: Math.round(w.gold),
      kills: w.kills,
      time: w.time,
      boss,
      breads: p.breads.map((b) => ({ id: b.id, level: b.level })),
      dips: p.dips.map((d) => ({ id: d.id, level: d.level })),
    });
  }

  private shake(dt: number): void {
    const cam = this.cameras.main;
    if (this.trauma <= 0) {
      if (cam.scrollX !== 0 || cam.scrollY !== 0) cam.setScroll(0, 0);
      return;
    }
    this.trauma = Math.max(0, this.trauma - TRAUMA_DECAY * dt);
    const a = this.trauma * this.trauma * SHAKE_SHARE * this.l.w;
    cam.setScroll((Math.random() * 2 - 1) * a, (Math.random() * 2 - 1) * a);
  }

  // ── Events to effects ──────────────────────────────────────────────────────────────────────────────────────

  private sfx(name: SfxName): void {
    playSfx(name);
  }

  private buzz(kind: HapticKind, gap = 0): void {
    if (!this.hapticsOn) return;
    if (this.hapticBatch) {
      this.hapticBatch.kind = strongerHaptic(this.hapticBatch.kind, kind);
      this.hapticBatch.gap = Math.max(this.hapticBatch.gap, gap);
      return;
    }
    if (!this.hapticGate.allow(performance.now(), gap)) return;
    this.bridge?.haptic(kind).catch(() => {});
  }

  private addTrauma(v: number): void {
    if (!this.reduceMotion) this.trauma = Math.min(1, this.trauma + v);
  }

  private stop(seconds: number): void {
    if (!this.reduceMotion) this.hitStop = Math.max(this.hitStop, seconds);
  }

  /** The dip colour a splash or sparkle takes. */
  private dipTint(preferred = 0): number {
    if (preferred) return preferred;
    const n = this.dipColors.length;
    return n > 0 ? this.dipColors[this.hits++ % n] : CURRY;
  }

  private handle(w: World, events: GameEvent[]): void {
    this.hapticBatch = { kind: null, gap: 0 };
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (this.kitchenTuning && (ev.t === 'hit' || ev.t === 'dot')) this.damageShown += Math.max(0, ev.dmg);
      switch (ev.t) {
        case 'throw': {
          this.stall.release();
          this.sfx('throw');
          // A puff of flour where the bread leaves his hand.
          const u = this.l.u;
          this.fx.spawn('fx/flour-puff', this.stall.handX, this.stall.handY, D.fxTop - 1, 0.3, 14 * u, 40 * u).fade(0.6, 0, 0.2);
          break;
        }
        case 'hit':
          this.onHit(ev);
          break;
        case 'dot':
          this.onDot(ev);
          break;
        case 'shieldHit':
          this.onShield(ev, false);
          break;
        case 'shieldBreak':
          this.onShield(ev, true);
          break;
        case 'kill':
          this.onKill(ev);
          break;
        case 'blast':
          this.onBlast(w, ev);
          break;
        case 'chain':
          this.onChain(ev);
          break;
        case 'status':
          this.onStatus(ev);
          break;
        case 'aim': {
          this.tele.aim(ev.uid, ev.x, ev.y, ev.tx, w.time, ev.time);
          this.actors.aim(ev.uid, w.time, w.time + ev.time);
          break;
        }
        case 'enemyShot':
          this.actors.fired(ev.uid);
          break;
        case 'theft': {
          const v = this.actors.viewOf(ev.uid);
          if (v && ev.gold > 0) this.fx.spawn('ui/coins', v.sx, v.sy, D.fxTop, 0.7, 22 * this.l.u, 12 * this.l.u)
            .to(v.sx, v.sy - 50 * this.l.u).fade(1, 0);
          this.sfx('throw');
          break;
        }
        case 'splat': {
          const P = this.proj.at(ev.x, FIELD.reachY + 14);
          const u = this.l.u;
          this.fx.spawn('fx/curry-splash', P.sx, P.sy, D.ground + 20, 1.2, 30 * u, 70 * u).tint(CURRY).fade(0.85, 0, 0.5).squash(0.55);
          break;
        }
        case 'playerHit':
          this.onPlayerHit(ev);
          break;
        case 'dodge':
          this.sfx('dodge');
          this.fx.spawn('fx/swoosh', this.stall.chestX, this.stall.chestY, D.fxTop, 0.3, 120 * this.l.u, 160 * this.l.u).fade(0.8, 0, 0.2);
          break;
        case 'heal':
          // Dhal heals a little on every kill: show the plus sign at most every 0.35 s.
          if (this.uiTime - this.healAt > 0.35) {
            this.healAt = this.uiTime;
            this.fx.spawn('fx/heal', this.stall.chestX, this.stall.chestY - 30 * this.l.u, D.fxTop, 0.7, 36 * this.l.u, 56 * this.l.u).to(this.stall.chestX, this.stall.chestY - 90 * this.l.u).fade(1, 0, 0.4);
          }
          break;
        case 'xp':
          this.onXp(ev);
          break;
        case 'levelUp':
          this.fx.spawn('fx/levelup-ring', this.stall.chestX, this.stall.feetY, D.fxTop, 0.8, 50 * this.l.u, 230 * this.l.u).add().fade(0.85, 0, 0.3);
          this.sfx('levelUp');
          this.buzz('medium');
          if (!this.kitchenTuning) void this.bridge?.track('level_up', {}).catch(() => {});
          break;
        case 'waveStart':
          this.hub.emit('waveStart', { wave: ev.wave, waves: ev.total });
          this.sfx('waveStart');
          break;
        case 'bossSpawn':
          if (!this.kitchenTuning) this.hub.emit('boss', { name: ev.name });
          this.sfx('bossAppear');
          this.buzz('heavy');
          this.addTrauma(0.35);
          break;
        case 'bossTell': {
          const boss = this.bossUid(w);
          this.tele.tell(ev.kind, boss, ev.xs, ev.width, w.time, ev.time);
          this.actors.tell(boss, w.time + ev.time);
          this.sfx('bossTell');
          break;
        }
        case 'bossPhase': {
          this.stop(0.06);
          this.addTrauma(0.8);
          const v = this.actors.viewOf(this.bossUid(w));
          if (v) {
            v.squash = 1;
            this.fx.spawn('fx/levelup-ring', v.sx, v.sy - v.bh * 0.4, D.fxTop, 0.7, v.bw * 0.5, v.bw * 1.8).tint(HAZARD).add().fade(1, 0, 0.3);
          }
          break;
        }
        case 'revive':
          this.fx.spawn('fx/levelup-ring', this.stall.chestX, this.stall.feetY, D.fxTop, 0.9, 50 * this.l.u, 260 * this.l.u).add().fade(0.85, 0, 0.3);
          this.fx.spawn('fx/heal', this.stall.chestX, this.stall.chestY, D.fxTop, 0.9, 50 * this.l.u, 90 * this.l.u).fade(1, 0, 0.5);
          this.addTrauma(0.5);
          this.sfx('levelUp');
          break;
        case 'runEnd':
          this.onRunEnd(w, ev.won);
          break;
        default:
          break;
      }
    }
    const cue = this.hapticBatch;
    this.hapticBatch = null;
    if (cue?.kind) this.buzz(cue.kind, cue.gap);
    // Gold earned this step flies to the counter as coins.
    if (w.gold - this.lastGold >= 1 && this.lastKill.on) {
      const n = Math.min(3, Math.floor(w.gold - this.lastGold));
      const u = this.l.u;
      for (let i = 0; i < n; i++) {
        this.fx
          .spawn('dips/coin', this.lastKill.x, this.lastKill.y, D.fxTop, 0.6 + 0.06 * i, 22 * u, 14 * u)
          .fade(1, 1, 0)
          .to(this.fx.tx, this.fx.ty, 2, (i % 2 ? 1 : -1) * 36 * u)
          .seek()
          .delay(0.05 * i);
      }
      this.sfx('coin');
      this.lastKill.on = false;
    }
    this.lastGold = w.gold;
  }

  private bossUid(w: World): number {
    for (const e of w.enemies) if (e.boss && e.state !== 'dead') return e.uid;
    return -1;
  }

  private onHit(ev: Extract<GameEvent, { t: 'hit' }>): void {
    const P = this.proj.at(ev.x, ev.y);
    const u = this.l.u;
    const s = Math.max(0.55, P.s);
    const v = this.actors.viewOf(ev.uid);
    const sx = P.sx;
    const cy = P.sy - (v ? v.bh * 0.5 : 18 * u * P.s);
    const dip = ev.color ? hex(ev.color) : 0;
    this.actors.hit(ev.uid, dip);
    const big = ev.crit ? 1.5 : 1;
    this.fx
      .spawn('fx/impact', sx, cy, D.fx, 0.2, 24 * u * s * big, 54 * u * s * big)
      .spin(((ev.uid * 1.7) % TAU), 0)
      .fade(1, 0, 0.25)
      .tint(dip || (ev.crit ? 0xfff0a0 : 0xffffff));
    if (!ev.color && this.dipColors.length > 0 && ((this.hits++ & 1) === 0 || ev.crit)) {
      this.fx.spawn('fx/curry-splash', sx, cy, D.fx - 1, 0.3, 22 * u * s, 56 * u * s).tint(this.dipTint()).fade(0.9, 0, 0.2).spin(ev.uid * 2.1, 0);
    }
    this.fx.number(ev.uid, sx, v ? v.topY : P.sy - 36 * u * P.s, ev.dmg, ev.crit ? 1 : ev.color ? 2 : 0, P.s);
    if (ev.crit) this.critUid = ev.uid;
    if (v && (v.elite || v.boss) && this.eliteGate.allow(performance.now())) this.addTrauma(v.boss ? 0.1 : 0.2);
    this.sfx(ev.crit ? 'crit' : 'hit');
  }

  private onDot(ev: Extract<GameEvent, { t: 'dot' }>): void {
    if (ev.dmg < 1) return;
    const P = this.proj.at(ev.x, ev.y);
    const v = this.actors.viewOf(ev.uid);
    this.fx.number(ev.uid, P.sx, v ? v.topY : P.sy - 36 * this.l.u * P.s, ev.dmg, 2, P.s);
  }

  private onShield(ev: { uid: number; x: number; y: number }, broke: boolean): void {
    const P = this.proj.at(ev.x, ev.y);
    const u = this.l.u;
    const s = Math.max(0.55, P.s);
    const v = this.actors.viewOf(ev.uid);
    const cy = P.sy - (v ? v.bh * 0.5 : 18 * u * P.s);
    this.actors.hit(ev.uid, 0);
    this.fx.spawn('fx/spark', P.sx, cy, D.fx, 0.22, 26 * u * s, 56 * u * s).tint(STEEL).fade(1, 0, 0.2).spin(ev.uid, 0);
    if (broke) {
      this.fx.spawn('fx/smoke', P.sx, cy, D.fx, 0.5, 30 * u * s, 80 * u * s).tint(STEEL).fade(0.8, 0, 0.2);
      this.fx.spawn('fx/impact', P.sx, cy, D.fx, 0.3, 40 * u * s, 90 * u * s).tint(STEEL).fade(1, 0, 0.3);
      this.sfx('shieldBreak');
    } else this.sfx('hit');
  }

  private onKill(ev: Extract<GameEvent, { t: 'kill' }>): void {
    const v = this.actors.kill(ev.uid);
    const P = this.proj.at(ev.x, ev.y);
    const u = this.l.u;
    const s = Math.max(0.55, P.s);
    const big = ev.boss ? 3 : ev.elite ? 1.4 : 1;
    const sx = P.sx;
    const cy = P.sy - (v ? v.bh * 0.4 : 14 * u * P.s);
    this.fx.spawn('fx/flour-puff', sx, cy, D.fx + 1, 0.4, 30 * u * s * big, 84 * u * s * big).fade(0.95, 0, 0.15);
    this.fx.spawn('fx/curry-splash', sx, cy, D.fx, 0.34, 30 * u * s * big, 74 * u * s * big).tint(this.dipTint(v?.dip)).fade(0.9, 0, 0.2).spin(ev.uid * 3.3, 0);
    this.lastKill.x = sx;
    this.lastKill.y = cy;
    this.lastKill.on = true;
    this.sfx('kill');
    if (ev.elite && this.critUid === ev.uid) this.stop(0.05);
    if (ev.elite) {
      this.addTrauma(0.3);
      for (let i = 0; i < 3; i++) {
        this.fx
          .spawn('fx/spark', sx, cy, D.fxTop, 0.5, 18 * u, 34 * u)
          .tint(0xffd23f)
          .to(sx + (i - 1) * 44 * u * s, cy - (24 + 14 * (i % 2)) * u * s, 1, 18 * u)
          .fade(1, 0, 0.3)
          .spin(i, 3);
      }
    }
    if (ev.boss) {
      this.stop(0.1);
      this.addTrauma(1);
      this.buzz('heavy');
      for (let i = 0; i < 4; i++) {
        this.fx
          .spawn('fx/explosion', sx + (i - 1.5) * 50 * u * s, cy - (i % 2) * 40 * u * s, D.fxTop, 0.5, 60 * u * s, 190 * u * s)
          .fade(1, 0, 0.5)
          .delay(0.12 * i);
      }
    }
  }

  private onBlast(w: World, ev: Extract<GameEvent, { t: 'blast' }>): void {
    const P = this.proj.at(ev.x, ev.y);
    const wpx = ev.radius * 2 * P.ppu * P.s * 1.3;
    const tint = ev.color ? hex(ev.color) : 0;
    const ex = this.fx.spawn('fx/explosion', P.sx, P.sy - wpx * 0.18, D.fxTop, 0.42, wpx * 0.35, wpx).fade(1, 0, 0.45);
    if (tint) ex.tint(tint);
    this.fx.spawn('fx/smoke', P.sx, P.sy - wpx * 0.1, D.fx + 2, 0.7, wpx * 0.4, wpx * 0.95).fade(0.55, 0, 0.1);
    this.sfx('blast');
    // A blast near Kannan is the dangerous kind: shake and a heavy buzz. His own bombs land far up the street.
    const p = w.player;
    if (Math.abs(ev.x - p.x) < ev.radius + 110 && ev.y < ev.radius + 110) {
      if (this.traumaGate.allow(performance.now())) this.addTrauma(0.5);
      this.buzz('heavy', 150);
    }
  }

  private onChain(ev: Extract<GameEvent, { t: 'chain' }>): void {
    const u = this.l.u;
    const pts: number[] = [];
    for (let i = 0; i < ev.points.length; i++) {
      const P = this.proj.at(ev.points[i].x, ev.points[i].y);
      const y = P.sy - 20 * u * P.s;
      pts.push(P.sx, y);
      this.fx.spawn('fx/spark', P.sx, y, D.fxTop, 0.26, 24 * u * Math.max(0.55, P.s), 48 * u * Math.max(0.55, P.s)).fade(1, 0, 0.3).spin(i * 1.3, 4);
    }
    this.fx.bolt(pts);
    this.sfx('chain');
  }

  private onStatus(ev: Extract<GameEvent, { t: 'status' }>): void {
    const v = this.actors.viewOf(ev.uid);
    if (!v) return;
    const u = this.l.u;
    if (ev.status === 'freeze') {
      this.fx.spawn('fx/ice', v.sx, v.sy, D.fx, 0.4, v.bw * 0.9, v.bw * 1.4).fade(0.9, 0, 0.3);
      this.sfx('freeze');
    } else if (ev.status === 'stun' && v.sugarStacks >= 3) {
      // Sugar Crash: the fifth sugar stack tips it over.
      this.fx.spawn('fx/sugar-sparkle', v.sx, v.sy - v.bh * 0.6, D.fxTop, 0.5, 30 * u, v.bw * 1.5).fade(1, 0, 0.3).spin(0, 4);
      this.sfx('sugarCrash');
    } else if (ev.status === 'ccImmune') {
      // A freeze or stun just ended, or was turned away: for a few seconds it cannot be held again. A white outline says so.
      this.actors.immune(ev.uid);
    }
  }

  private onPlayerHit(ev: Extract<GameEvent, { t: 'playerHit' }>): void {
    this.buzz('light', 250);
    if (!this.damageGate.allow(performance.now())) return;
    if (ev.source === 'contact') this.actors.counterHit();
    // Blasts share the camera cue, but must not consume the distinct damage indication.
    if (this.traumaGate.allow(performance.now())) {
      this.addTrauma(ev.source === 'contact' ? 0.45 : ev.source === 'boss' ? 0.7 : ev.source === 'explode' ? 0.6 : 0.45);
    }
    const u = this.l.u;
    this.fx.spawn('fx/impact', this.stall.chestX, this.l.counter.top + 8 * u, D.fxTop, 0.22, 60 * u, 140 * u).tint(HAZARD).squash(0.35).fade(1, 0);
    if (!this.reduceMotion) this.stall.flash();
    this.sfx('playerHurt');
  }

  private onXp(ev: Extract<GameEvent, { t: 'xp' }>): void {
    const P = this.proj.at(ev.x, ev.y);
    const u = this.l.u;
    const n = Math.max(1, Math.min(3, Math.ceil(ev.amount / 3)));
    const cy = P.sy - 14 * u * P.s;
    for (let i = 0; i < n; i++) {
      this.fx
        .spawn('dips/xp-orb', P.sx + (i - (n - 1) / 2) * 10 * u, cy, D.fxTop, 0.5 + 0.06 * i, 24 * u * Math.max(0.6, P.s), 12 * u)
        .fade(1, 1, 0)
        .to(this.fx.tx, this.fx.ty, 2, (i % 2 ? 1 : -1) * 28 * u)
        .seek()
        .delay(0.04 * i);
    }
  }

  /** The sim ended the run (Kannan won or lost). */
  private onRunEnd(w: World, won: boolean): void {
    this.sfx(won ? 'win' : 'lose');
    this.endRun(w);
  }

  /** Freeze the run on screen and hand its result to the overlay. */
  private endRun(w: World): void {
    if (this.ended) return;
    this.ended = true;
    this.levelUpOpen = false;
    if (!w.result) return;
    const stats = this.kitchenStats();
    if (stats) {
      this.hub.emit('kitchenStats', stats);
      this.hub.emit('kitchenEnd', { reason: w.result.won ? 'won' : 'lost', stats });
      return;
    }
    void this.bridge?.track('run_end', { wave: w.result.wave, won: w.result.won, kills: w.result.kills, secs: Math.round(w.result.time), ...(w.result.dist !== undefined ? { dist: w.result.dist, pct: Math.round((100 * w.result.dist) / bossAtOf(w.chapter)) } : {}) }).catch(() => {});
    this.hub.emit('runEnd', w.result);
  }
}
