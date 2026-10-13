// Loads every sprite, then hands over to RunScene. Until the run scene exists, hub.controls already answers: a start()
// that arrives while the sprites are still loading is remembered and happens the moment the scene is ready.
import * as Phaser from 'phaser';

import type { Loadout } from '@/core/types';

import type { Hub } from '../hub';
import { loadSprites, makeShadow } from './tex';

export class BootScene extends Phaser.Scene {
  private pending: { seed?: number; loadout?: Loadout; chapterId?: string } | null = null;

  constructor() {
    super('BootScene');
  }

  preload(): void {
    const hub = this.registry.get('hub') as Hub | undefined;
    if (hub) {
      hub.controls = {
        start: (seed, loadout, chapterId) => {
          this.pending = { seed, loadout, chapterId };
        },
        choose: () => {},
        reroll: () => {},
        pause: () => {},
        resume: () => {},
        quit: () => {
          this.pending = null;
        },
      };
    }
    this.load.on('loaderror', (file: Phaser.Loader.File) => console.error('texture failed to load', file.key, file.src));
    const t0 = performance.now();
    loadSprites(this);
    this.load.once('complete', () => this.registry.set('loadMs', Math.round(performance.now() - t0)));
  }

  create(): void {
    makeShadow(this);
    this.scene.start('RunScene', { pending: this.pending });
  }
}
