// Loads every sprite, then hands over to RunScene. Until the run scene exists, hub.controls already answers: a start()
// that arrives while the sprites are still loading is remembered and happens the moment the scene is ready.
import * as Phaser from 'phaser';

import type { KitchenConfig } from '@/core/kitchen';
import type { Loadout } from '@/core/types';

import type { Hub } from '../hub';
import { loadSprites, makeShadow, makeStatusTextures } from './tex';

export class BootScene extends Phaser.Scene {
  private pending: { seed?: number; loadout?: Loadout; chapterId?: string } | null = null;

  private pendingKitchen: KitchenConfig | null = null;

  constructor() {
    super('BootScene');
  }

  preload(): void {
    const hub = this.registry.get('hub') as Hub | undefined;
    if (hub) {
      hub.controls = {
        start: (seed, loadout, chapterId) => {
          this.pending = { seed, loadout, chapterId };
          this.pendingKitchen = null;
        },
        startKitchen: (config) => { this.pendingKitchen = config; this.pending = null; },
        tuneKitchen: (tuning) => { if (this.pendingKitchen) this.pendingKitchen = { ...this.pendingKitchen, tuning }; },
        stopKitchen: () => { this.pendingKitchen = null; },
        openPicks: () => {},
        choose: () => {},
        reroll: () => {},
        pause: () => {},
        resume: () => {},
        quit: () => {
          this.pending = null;
          this.pendingKitchen = null;
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
    makeStatusTextures(this);
    this.scene.start('RunScene', { pending: this.pending, pendingKitchen: this.pendingKitchen });
  }
}
