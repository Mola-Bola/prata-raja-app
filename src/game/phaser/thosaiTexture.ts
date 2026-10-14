import type * as Phaser from 'phaser';
import type { Img } from './pools';

export const THOSAI_TEXTURE = 'thosai-surface-roll';
export const THOSAI_FRAMES = 8;

/** Wrap toasted detail around a cylinder, keeping the original silhouette and rolled mouth/end caps. */
export function rollThosaiPixels(source: Uint8ClampedArray, width: number, height: number, phase: number): Uint8ClampedArray<ArrayBuffer> {
  const out = source.slice();
  for (let x = Math.ceil(width * 0.3); x < width * 0.74; x++) {
    let top = 0, bottom = height - 1;
    while (top < height && source[(top * width + x) * 4 + 3] < 32) top++;
    while (bottom > top && source[(bottom * width + x) * 4 + 3] < 32) bottom--;
    if (bottom - top < 4) continue;
    const shoulder = Math.min(1, (x - width * 0.3) / (width * 0.04), (width * 0.74 - x) / (width * 0.04));
    for (let y = top + 1; y < bottom; y++) {
      const angle = Math.asin(Math.max(-1, Math.min(1, 2 * (y - top) / (bottom - top) - 1)));
      const u = ((0.5 + (angle + phase) / (Math.PI * 2)) % 1 + 1) % 1;
      const sample = top + 1 + u * (bottom - top - 2);
      const row = Math.floor(sample), mix = sample - row;
      const a = (row * width + x) * 4, b = ((row + 1) * width + x) * 4;
      const i = (y * width + x) * 4;
      if (source[i + 3] === 0) continue;
      // Transparent atlas pixels must not smear their hidden RGB into the food.
      const wa = (1 - mix) * source[a + 3], wb = mix * source[b + 3];
      if (wa + wb === 0) continue;
      for (let c = 0; c < 3; c++) out[i + c] = source[i + c] * (1 - shoulder) + (source[a + c] * wa + source[b + c] * wb) / (wa + wb) * shoulder;
    }
  }
  return out;
}

/** One shared power-of-two texture per game, prepared once; picking a frame does no pixel work. */
export function prepareThosaiTexture(scene: Phaser.Scene, image: Img): void {
  if (scene.textures.exists(THOSAI_TEXTURE)) return;
  const atlas = scene.textures.createCanvas(THOSAI_TEXTURE, 512, 1024);
  if (!atlas) return;
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const frame = image.frame;
  ctx.translate(256, 64);
  ctx.rotate(0.7);
  ctx.drawImage(frame.source.image as CanvasImageSource, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight,
    frame.x - frame.realWidth / 2, frame.y - frame.realHeight / 2, frame.cutWidth, frame.cutHeight);
  const pixels = ctx.getImageData(0, 0, 512, 128).data;
  for (let i = 0; i < THOSAI_FRAMES; i++) {
    const rolled = rollThosaiPixels(pixels, 512, 128, i * Math.PI * 2 / THOSAI_FRAMES);
    atlas.getContext().putImageData(new ImageData(rolled, 512, 128), 0, i * 128);
    atlas.add(`roll-${i}`, 0, 0, i * 128, 512, 128);
  }
  atlas.refresh();
}

export function thosaiRollFrame(travel: number, width: number): number {
  const turns = travel / Math.max(80, width);
  return Math.floor(((turns % 1 + 1) % 1) * THOSAI_FRAMES);
}
