import { expect, test } from '@playwright/test';
import type { Projectile } from '../../src/core/types';
import type { Actors } from '../../src/game/phaser/actors';
import type { Projector } from '../../src/game/phaser/layout';
import type { Disc } from '../../src/game/phaser/pools';
import type * as Phaser from 'phaser';

type ShotProbe = { disc: Disc };
type ActorProbe = { draw: Actors['draw']; clear: Actors['clear']; shotMap: Map<number, ShotProbe> };
type SceneProbe = { actors: ActorProbe; proj: Projector; hold(): void; start(seed: number): void };

test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
  await page.route('**/auth/v1/**', route => route.fulfill({ json: {} }));
});

for (const width of [320, 390]) for (const reduced of [false, true]) test(`Thosai rolls on its long axis at ${width} (reduced ${reduced})`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await page.goto('/play?seed=300650584');
  await page.getByTestId('ui-start').click();
  await page.getByTestId('story-skip').click();
  await page.waitForFunction(() => !!window.__world && window.__world.time > 0.5);
  // Let the actual core create a level-two Thosai, then freeze only the simulation for controlled renderer frames.
  await page.evaluate(() => {
    window.__world!.player.breads = [{ id: 'thosai', level: 2, cd: 0, volleyLeft: 0, volleyT: 0 }];
  });
  await page.waitForFunction(() => window.__world!.projectiles.some(s => s.motion === 'wave'));
  const fixture = await page.evaluate(() => {
    const game = window.__game!;
    const scene = game.scene.getScene('RunScene') as unknown as SceneProbe;
    scene.hold(); game.loop.sleep();
    const w = window.__world!;
    const shot = w.projectiles.find(s => s.motion === 'wave')!;
    w.projectiles = [shot]; w.enemies = []; w.zones = [];
    shot.y = 360;
    scene.actors.clear();
    scene.actors.draw(w, 1, w.time, 0);
    const view = scene.actors.shotMap.get(shot.uid)!;
    // Hold framing/perspective constant while the real shot's travel supplies roll phase.
    const at = scene.proj.at.bind(scene.proj);
    scene.proj.at = () => at(0, 360);
    return { uid: shot.uid, radius: shot.radius, initial: JSON.stringify(shot), rotation: view.disc.img.rotation };
  });
  expect(fixture.radius).toBe(120);
  expect(fixture.rotation).toBeCloseTo(reduced ? 0.7 : 0);
  const frames = [];
  for (const travel of [360, 390, 420, 450, 480, 510, 540, 570]) {
    const frame = await page.evaluate(({ uid, travel }) => {
      const game = window.__game!;
      const scene = game.scene.getScene('RunScene') as unknown as SceneProbe;
      const w = window.__world!;
      const shot = w.projectiles.find(s => s.uid === uid)!;
      shot.y = travel;
      const before = JSON.stringify(shot);
      scene.actors.draw(w, 1, w.time, 0);
      game.step(performance.now(), 0); // paused Scene updates no core state, but Phaser renders the new pose
      const v = scene.actors.shotMap.get(uid)!;
      return {
        unchanged: before === JSON.stringify(shot), x: v.disc.cont.x, y: v.disc.cont.y,
        scaleX: v.disc.cont.scaleX, scaleY: v.disc.cont.scaleY, rotation: v.disc.img.rotation,
        alpha: v.disc.img.alpha, flip: v.disc.img.flipY,
        frame: v.disc.img.frame.name, texture: v.disc.img.texture.key, children: v.disc.cont.list.length,
      };
    }, { uid: fixture.uid, travel });
    frames.push(frame);
    if (width === 390 && !reduced && [390, 450, 510, 570].includes(travel)) await page.screenshot({ clip: { x: frame.x - 90, y: frame.y - 32, width: 180, height: 64 }, path: test.info().outputPath(`roll-${travel}.png`) });
  }
  for (const frame of frames) {
    expect(frame.unchanged).toBe(true);
    expect(frame.rotation).toBeCloseTo(reduced ? 0.7 : 0);
    expect(frame.scaleX).toBeCloseTo(frames[0].scaleX);
    expect(frame.x).toBeCloseTo(frames[0].x);
    expect(frame.y).toBeCloseTo(frames[0].y);
    expect(frame.scaleY / frame.scaleX).toBeCloseTo(0.52);
    expect(frame.alpha).toBe(1);
    expect(frame.flip).toBe(false);
  }
  expect(new Set(frames.map(f => f.scaleY)).size).toBe(1);
  if (reduced) expect(new Set(frames.map(f => f.frame)).size).toBe(1);
  else {
    expect(new Set(frames.map(f => f.frame)).size).toBe(8);
    expect(frames.every(f => f.texture === 'thosai-surface-roll')).toBe(true);
  }
  const reuse = await page.evaluate(uid => {
    const game = window.__game!;
    const scene = game.scene.getScene('RunScene') as unknown as SceneProbe;
    const w = window.__world!;
    const old = scene.actors.shotMap.get(uid)!;
    const holder = old.disc;
    // Advancing only render time while travel is fixed must not move surface detail.
    const beforePause = { scaleY: holder.cont.scaleY, frame: holder.img.frame.name, alpha: holder.img.alpha };
    scene.actors.draw(w, 1, w.time + 10, 0);
    const afterPause = { scaleY: holder.cont.scaleY, frame: holder.img.frame.name, alpha: holder.img.alpha };
    const oldShot = w.projectiles[0];
    const atlas = game.textures.exists('thosai-surface-roll') ? game.textures.get('thosai-surface-roll') as Phaser.Textures.CanvasTexture : null;
    scene.actors.clear();
    const restored = {
      children: holder.cont.list.length, rotation: holder.img.rotation, scaleX: holder.img.scaleX, scaleY: holder.img.scaleY,
      alpha: holder.img.alpha, tint: holder.img.tint,
    };
    const straight: Projectile = { ...oldShot, uid: uid + 1, sprite: 'breads/kosong', breadId: 'kosong', motion: 'straight', spin: 0.2 };
    w.projectiles = [straight];
    scene.actors.draw(w, 1, w.time, 0);
    const next = scene.actors.shotMap.get(straight.uid)!;
    game.step(performance.now(), 0);
    const nextTexture = next.disc.img.texture.key, nextFrame = next.disc.img.frame.name;
    const nextRotation = next.disc.img.rotation, nextChildren = next.disc.cont.list.length;
    scene.start(300650584); scene.hold(); game.loop.sleep();
    const restarted = window.__world!;
    restarted.projectiles = [{ ...oldShot, uid: uid + 2 }];
    scene.actors.draw(restarted, 1, restarted.time, 0);
    const cached = game.textures.exists('thosai-surface-roll') ? game.textures.get('thosai-surface-roll') : null;
    const restart = { reused: cached === atlas, count: game.textures.getTextureKeys().filter(key => key === 'thosai-surface-roll').length };
    game.destroy(true); game.step(performance.now(), 0);
    const disposed = atlas === null || (atlas.canvas === null && atlas.context === null && atlas.source.length === 0);
    return { restart, disposed, pauseStill: JSON.stringify(beforePause) === JSON.stringify(afterPause), restored,
      reused: next.disc === holder, children: nextChildren, rotation: nextRotation,
      texture: nextTexture, frame: nextFrame, mutation: straight.motion !== 'straight' };
  }, fixture.uid);
  expect(reuse.pauseStill).toBe(true);
  expect(reuse.reused).toBe(true);
  expect(reuse.restored).toMatchObject({ children: 1, rotation: 0, scaleX: 1, scaleY: 1, alpha: 1 });
  expect(reuse.children).toBe(1);
  expect(reuse.rotation).toBeCloseTo(0.2);
  expect(reuse.texture).not.toBe('thosai-surface-roll');
  expect(reuse.frame).toBe('breads/kosong');
  expect(reuse.mutation).toBe(false);
  expect(reuse.restart).toEqual({ reused: true, count: reduced ? 0 : 1 });
  expect(reuse.disposed).toBe(true);
  await test.info().attach('travel-frames-and-pool-restoration', { body: JSON.stringify({ fixture, frames, reuse }, null, 2), contentType: 'application/json' });
});
