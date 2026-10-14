// The one place that knows how a sprite name ("enemies/roach") becomes a Phaser texture and frame, and how the sprites get
// loaded. Every other file asks here (addImage / setImage / tex), never for a raw texture key. All sprites except scene/*
// are frames of two power-of-two atlas pages (src/game/atlas.ts, packed by scripts/pack_atlas.py): the phone's WebView
// draws one texture per batch, and WebGL1 only mipmaps power-of-two textures. The scene art stays loose (it is one big
// full-screen image each).
import * as Phaser from 'phaser';

import { ASSET_URLS } from '../assets';
import { ATLASES, FRAME_ATLAS } from '../atlas';

export type Tex = { key: string; frame?: string };

/** Full-screen art that only the React overlay shows (title, wake-up and stall screens, as <img>): keep it out of GPU memory. */
const DOM_ONLY = new Set(['scene/hero', 'scene/wake', 'scene/hub']);

/** Queue the atlas pages and the loose scene art on the scene's loader (call from preload). */
export function loadSprites(scene: Phaser.Scene): void {
  for (const a of ATLASES) scene.load.atlas(a.key, a.textureUrl, a.data);
  for (const [name, url] of Object.entries(ASSET_URLS)) {
    if (name.startsWith('street/') || (name.startsWith('scene/') && !DOM_ONLY.has(name) && !name.startsWith('scene/hub-tier-'))) scene.load.image(name, url);
  }
}

/** The soft ground shadow ('shadow'): a radial gradient in a canvas texture. A shadow is allowed to be code-drawn; it is
 *  not part of the art set, so it stays outside the atlases. Call once, after loading. */
export function makeShadow(scene: Phaser.Scene): void {
  if (scene.textures.exists('shadow')) return;
  const t = scene.textures.createCanvas('shadow', 64, 64);
  if (!t) return;
  const ctx = t.getContext();
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(20,10,5,0.9)');
  g.addColorStop(0.55, 'rgba(20,10,5,0.45)');
  g.addColorStop(1, 'rgba(20,10,5,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  t.refresh();
}

/** Little status sprites (frost shards, mint leaves, milk drips, chilli wisps, stars), drawn once with Graphics and baked
 *  to loose textures. Their names are not in the atlas, so tex() resolves them as loose textures. Call once, after loading. */
export function makeStatusTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);
  const bake = (key: string, w: number, h: number, draw: () => void): void => {
    if (scene.textures.exists(key)) return;
    g.clear();
    draw();
    g.generateTexture(key, w, h);
  };
  bake('status-shard', 16, 16, () => {
    g.fillStyle(0xe6fffa, 1).fillTriangle(8, 0, 15, 8, 8, 16);
    g.fillStyle(0x8fe3ff, 1).fillTriangle(8, 0, 1, 8, 8, 16);
  });
  bake('status-leaf', 16, 12, () => {
    g.fillStyle(0x5fd9a8, 1).fillEllipse(8, 6, 15, 9);
    g.fillStyle(0xbff5dc, 1).fillEllipse(7, 5, 7, 3);
  });
  bake('status-drip', 8, 12, () => {
    g.fillStyle(0xfff0c2, 1).fillTriangle(4, 0, 0, 8, 8, 8).fillCircle(4, 8, 4);
  });
  bake('status-wisp', 14, 16, () => {
    g.fillStyle(0xff7a2e, 1).fillTriangle(7, 0, 13, 11, 1, 11).fillCircle(7, 10, 6);
    g.fillStyle(0xffd24a, 1).fillCircle(7, 11, 3);
  });
  bake('status-star', 16, 16, () => {
    g.fillStyle(0xffe066, 1).fillTriangle(8, 0, 9.2, 8, 6.8, 8).fillTriangle(8, 16, 9.2, 8, 6.8, 8);
    g.fillTriangle(0, 8, 8, 6.8, 8, 9.2).fillTriangle(16, 8, 8, 6.8, 8, 9.2).fillCircle(8, 8, 3);
  });
  g.destroy();
}

/** Where a sprite lives: its atlas page and frame, or (scene art, generated textures) a loose texture of that name. Pure: it
 *  does not check that anything was loaded (see addImage / setImage for that). */
export function tex(name: string): Tex {
  const atlas = FRAME_ATLAS[name];
  return atlas ? { key: atlas, frame: name } : { key: name };
}

/** The engine's placeholder: a missing sprite is a bug in the art list, not a reason to crash a run. */
const MISSING: Tex = { key: '__MISSING' };

function resolve(scene: Phaser.Scene, name: string): Tex {
  const t = tex(name);
  if (!scene.textures.exists(t.key)) return MISSING;
  if (t.frame !== undefined && !scene.textures.get(t.key).has(t.frame)) return MISSING;
  return t;
}

export function hasSprite(scene: Phaser.Scene, name: string): boolean {
  return resolve(scene, name) !== MISSING;
}

export function addImage(scene: Phaser.Scene, name: string): Phaser.GameObjects.Image {
  const t = resolve(scene, name);
  return scene.add.image(0, 0, t.key, t.frame);
}

export function setImage(img: Phaser.GameObjects.Image, name: string): Phaser.GameObjects.Image {
  const t = resolve(img.scene, name);
  return img.setTexture(t.key, t.frame);
}

/** An image showing only a rectangle of a loose texture (scene art): its frame is made the first time it is asked for. */
export function addCrop(scene: Phaser.Scene, name: string, id: string, x: number, y: number, w: number, h: number): Phaser.GameObjects.Image {
  const t = resolve(scene, name);
  const texture = scene.textures.get(t.key);
  if (!texture.has(id)) texture.add(id, 0, x, y, w, h);
  return scene.add.image(0, 0, t.key, id);
}
