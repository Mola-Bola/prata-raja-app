// Recycled display objects: nothing is created or destroyed while a run is live, objects just hide and come back.
import * as Phaser from 'phaser';

import { addImage, setImage } from './tex';

export type Img = Phaser.GameObjects.Image;

/** Images of any sprite. get() hands one out ready to use; put() wipes it back to neutral and hides it. */
export class ImagePool {
  private free: Img[] = [];

  constructor(private scene: Phaser.Scene) {}

  get(name: string): Img {
    const img = this.free.pop();
    if (img) return setImage(img, name).setVisible(true);
    return addImage(this.scene, name);
  }

  put(img: Img): void {
    img
      .setVisible(false)
      .setAlpha(1)
      .setScale(1)
      .setRotation(0)
      .setFlip(false, false)
      .setOrigin(0.5, 0.5)
      .setBlendMode(Phaser.BlendModes.NORMAL)
      .clearTint();
    this.free.push(img);
  }
}

/** A thrown-bread holder: the image spins inside a container that is squashed, which gives the tilted-disc look. */
export type Disc = { cont: Phaser.GameObjects.Container; img: Img };

export class DiscPool {
  private free: Disc[] = [];

  constructor(private scene: Phaser.Scene) {}

  get(name: string): Disc {
    let d = this.free.pop();
    if (d) setImage(d.img, name);
    else {
      const img = addImage(this.scene, name);
      d = { cont: this.scene.add.container(0, 0, [img]), img };
    }
    d.cont.setVisible(true);
    return d;
  }

  put(d: Disc): void {
    d.cont.setVisible(false).setScale(1).setAlpha(1);
    d.img.setRotation(0).setScale(1).setAngle(0).clearTint();
    this.free.push(d);
  }
}
