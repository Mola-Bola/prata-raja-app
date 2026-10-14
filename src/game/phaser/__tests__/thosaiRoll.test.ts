import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Projectile, World } from '@/core/types';
import { Actors } from '../actors';
import { DiscPool, ImagePool } from '../pools';
import { rollThosaiPixels, THOSAI_FRAMES, THOSAI_TEXTURE, thosaiRollFrame } from '../thosaiTexture';

const width = 24, height = 12;
function food(): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 2; y < 10; y++) for (let x = 2; x < 22; x++) {
    const i = (y * width + x) * 4;
    pixels.set([x * 8, y * 20, (x + y) * 5, 255], i);
  }
  return pixels;
}

describe('Thosai cylinder texture', () => {
  it('carries real surface detail between phases without changing silhouette, mouth or end caps', () => {
    const source = food();
    const original = source.slice();
    const a = rollThosaiPixels(source, width, height, 0);
    const b = rollThosaiPixels(source, width, height, Math.PI / 2);
    let moved = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      expect(a[i + 3]).toBe(source[i + 3]);
      expect(b[i + 3]).toBe(source[i + 3]);
      if (x < width * 0.3 || x >= width * 0.74) {
        expect(a.slice(i, i + 4)).toEqual(source.slice(i, i + 4));
        expect(b.slice(i, i + 4)).toEqual(source.slice(i, i + 4));
      } else if (a[i + 1] !== b[i + 1]) moved++;
    }
    expect(moved).toBeGreaterThan(30);
    expect(source).toEqual(original);
  });

  it('picks eight travel-driven frames, repeats per width and stays still when travel does', () => {
    expect(Array.from({ length: THOSAI_FRAMES }, (_, i) => thosaiRollFrame(i * 240 / THOSAI_FRAMES, 240))).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(thosaiRollFrame(239.999, 240)).toBe(7);
    expect(thosaiRollFrame(240, 240)).toBe(0);
    expect(thosaiRollFrame(269.999, 240)).toBe(0);
    expect(thosaiRollFrame(270, 240)).toBe(1);
    expect(thosaiRollFrame(30, 240)).toBe(thosaiRollFrame(60, 480));
    expect(thosaiRollFrame(30, 240)).toBe(1);
    expect(thosaiRollFrame(-30, 240)).toBe(7);
  });

  it('ignores transparent RGB when sampling and preserves transparent output pixels', () => {
    const source = food();
    for (let i = 0; i < source.length; i += 4) source.set(source[i + 3] ? [190, 150, 80, 255] : [255, 0, 255, 0], i);
    source.set([255, 0, 255, 0], (5 * width + 12) * 4);
    for (let phase = 0; phase < THOSAI_FRAMES; phase++) {
      const result = rollThosaiPixels(source, width, height, phase * Math.PI / 4);
      for (let i = 0; i < result.length; i += 4) expect(result.slice(i, i + 4)).toEqual(source.slice(i, i + 4));
    }
  });

});

vi.mock('phaser', () => ({ TintModes: { MULTIPLY: 0, FILL: 1 }, BlendModes: { NORMAL: 0 } }));
vi.mock('../tex', () => ({
  addImage: (scene: unknown, key: string) => sprite(scene, key),
  setImage: (img: ReturnType<typeof sprite>, key: string) => img.setTexture(key),
}));
afterEach(() => vi.unstubAllGlobals());

function sprite(scene: unknown, key: string) {
  return {
    scene, width: 256, height: 254, texture: { key }, rotation: 0, scaleX: 1, scaleY: 1, alpha: 1, visible: true,
    frame: { name: key, source: { image: {} }, cutX: 0, cutY: 0, cutWidth: 256, cutHeight: 254, x: 0, y: 0, realWidth: 256, realHeight: 254 },
    setTexture(k: string, frame = k) { this.texture = { key: k }; this.frame.name = frame; this.width = k === THOSAI_TEXTURE ? 512 : 256; this.height = k === THOSAI_TEXTURE ? 128 : 254; return this; },
    setFrame(frame: string) { this.frame.name = frame; return this; },
    setRotation(v: number) { this.rotation = v; return this; },
    setAngle(v: number) { this.rotation = v; return this; },
    setScale(x: number, y = x) { this.scaleX = x; this.scaleY = y; return this; },
    setAlpha(v: number) { this.alpha = v; return this; },
    setVisible(v: boolean) { this.visible = v; return this; },
    setCrop() { return this; }, setPosition() { return this; }, setDepth() { return this; }, clearTint() { return this; }, setTint() { return this; },
    setFlip() { return this; }, setOrigin() { return this; }, setBlendMode() { return this; },
  };
}

function renderer(reduced: boolean) {
  vi.stubGlobal('window', { matchMedia: () => ({ matches: reduced }) });
  const pixels = new Uint8ClampedArray(512 * 128 * 4);
  for (let y = 30; y < 95; y++) for (let x = 150; x < 380; x++) pixels.set([180, 120, 50, 255], (y * 512 + x) * 4);
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ({ translate() {}, rotate() {}, drawImage() {}, getImageData: () => ({ data: pixels }) }) }) });
  vi.stubGlobal('ImageData', class { constructor(public data: Uint8ClampedArray, public width: number, public height: number) {} });
  const textures = new Map<string, object>();
  const createCanvas = vi.fn((key: string) => {
    const texture = { add: vi.fn(), refresh: vi.fn(), getContext: () => ({ putImageData: vi.fn() }) };
    textures.set(key, texture); return texture;
  });
  const scene = {
    textures: { exists: (key: string) => textures.has(key), createCanvas },
    tweens: { killTweensOf: vi.fn() },
    add: { container: (_x: number, _y: number, list: unknown[]) => ({
      list, scaleX: 1, scaleY: 1, alpha: 1, visible: true,
      setVisible(v: boolean) { this.visible = v; return this; },
      setScale(x: number, y = x) { this.scaleX = x; this.scaleY = y; return this; },
      setAlpha(v: number) { this.alpha = v; return this; }, setPosition() { return this; }, setDepth() { return this; }, setRotation() { return this; },
    }) },
  };
  const discs = new DiscPool(scene as never);
  const actors = new Actors({ ppu: 1, s: 1, sx: 200, sy: 400, at() { return this; } } as never, new ImagePool(scene as never), discs, {} as never) as unknown as {
    drawShots(w: World, alpha: number, dt: number): void; clearShots(): void;
    shotMap: Map<number, { disc: { img: ReturnType<typeof sprite>; cont: ReturnType<typeof scene.add.container> }; texMax: number }>;
  };
  const shot = { uid: 1, owner: 'player', sprite: 'breads/thosai', motion: 'wave', x: 0, y: 0, z: 0, ttl: 1, radius: 120, spin: 0 } as Projectile;
  const w = { projectiles: [shot] } as World;
  return { actors, shot, w, textures, createCanvas };
}

for (const reduced of [false, true]) it(`actual Actors wave/pool behavior (reduced motion ${reduced})`, () => {
  const { actors, shot, w, textures, createCanvas } = renderer(reduced);
  const before = JSON.stringify(shot);
  actors.drawShots(w, 1, 0);
  const first = actors.shotMap.get(1)!;
  expect(JSON.stringify(shot)).toBe(before);
  expect(first.texMax).toBe(256); // Preserve the original width denominator even with a wider atlas frame.
  expect(first.disc.cont.scaleX).toBeCloseTo(240 / (256 * 1.18));
  expect(first.disc.cont.scaleY / first.disc.cont.scaleX).toBeCloseTo(0.52);
  expect(first.disc.img.rotation).toBe(reduced ? 0.7 : 0);
  expect(first.disc.img.frame.name).toBe(reduced ? 'breads/thosai' : 'roll-0');
  expect(createCanvas).toHaveBeenCalledTimes(reduced ? 0 : 1);
  const shared = textures.get(THOSAI_TEXTURE);
  shot.y = 239.999;
  actors.drawShots(w, 1, 0);
  expect(first.disc.img.frame.name).toBe(reduced ? 'breads/thosai' : 'roll-7');
  shot.y = 240;
  actors.drawShots(w, 1, 0);
  expect(first.disc.img.frame.name).toBe(reduced ? 'breads/thosai' : 'roll-0');
  actors.clearShots();
  expect(first.disc.img.rotation).toBe(0);
  expect(first.disc.img.scaleX).toBe(1);
  expect(first.disc.cont.visible).toBe(false);
  const next = { ...shot, uid: 2, sprite: 'breads/kosong', motion: 'straight', spin: 0.2 } as Projectile;
  w.projectiles = [next];
  actors.drawShots(w, 1, 0);
  const reused = actors.shotMap.get(2)!;
  expect(reused.disc).toBe(first.disc);
  expect(reused.disc.cont.list).toHaveLength(1);
  expect(reused.disc.img.texture.key).toBe('breads/kosong');
  expect(reused.disc.img.frame.name).toBe('breads/kosong');
  expect(reused.disc.img.rotation).toBe(0.2);
  actors.clearShots();
  w.projectiles = [{ ...shot, uid: 3 }];
  actors.drawShots(w, 1, 0);
  expect(textures.get(THOSAI_TEXTURE)).toBe(shared);
  expect(createCanvas).toHaveBeenCalledTimes(reduced ? 0 : 1);
});


for (const reduced of [false, true]) for (const typhoonFirst of [false, true]) {
  it(`keeps each wave's exact artwork across order and restart (Typhoon first ${typhoonFirst}, reduced ${reduced})`, () => {
    const { actors, shot, w, textures, createCanvas } = renderer(reduced);
    const sprites = typhoonFirst ? ['evolutions/thosai-typhoon', 'breads/thosai'] : ['breads/thosai', 'evolutions/thosai-typhoon'];
    let holder: unknown;
    // Two runs through the same cache, reversing the first/second order after the simulated restart.
    for (const name of [...sprites, ...sprites.toReversed()]) {
      const current = { ...shot, uid: shot.uid++, sprite: name } as Projectile;
      w.projectiles = [current];
      const before = JSON.stringify(current);
      actors.drawShots(w, 1, 0);
      const view = actors.shotMap.get(current.uid)!;
      if (holder) expect(view.disc).toBe(holder);
      holder = view.disc;
      const cylinder = name === 'breads/thosai' && !reduced;
      expect(view.disc.img.texture.key).toBe(cylinder ? THOSAI_TEXTURE : name);
      expect(view.disc.img.frame.name).toBe(cylinder ? 'roll-0' : name);
      expect(view.disc.img.rotation).toBe(cylinder ? 0 : 0.7);
      expect(view.texMax).toBe(256);
      expect(view.disc.cont.scaleX).toBeCloseTo(240 / (256 * 1.18));
      expect(view.disc.cont.scaleY / view.disc.cont.scaleX).toBeCloseTo(0.52);
      expect(JSON.stringify(current)).toBe(before);
      actors.clearShots();
    }
    expect(textures.size).toBe(reduced ? 0 : 1);
    expect(createCanvas).toHaveBeenCalledTimes(reduced ? 0 : 1);
  });
}
