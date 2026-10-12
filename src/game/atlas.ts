// Texture atlases written by scripts/pack_atlas.py (python3 scripts/pack_atlas.py after changing assets/game). Every sprite
// except 'scene/*' is a frame named like its manifest key ("enemies/roach") in exactly one atlas.
//
// In a scene's preload, Phaser 4's loader takes the parsed JSON object in place of the atlasURL:
//   for (const a of ATLASES) this.load.atlas(a.key, a.textureUrl, a.data);
// and a frame is drawn from the atlas that holds it:
//   this.add.image(x, y, FRAME_ATLAS['enemies/roach'], 'enemies/roach');
//
// require.context lists the folder at build time (as assets.ts does), so a re-pack with another atlas count needs no edit here.
const images = require.context('../../assets/game-atlas', false, /\.webp$/);
const jsons: { (file: string): object; keys(): string[] } = require.context('../../assets/game-atlas', false, /\.json$/);

/** One Phaser texture per atlas page: its key, the image URL and the Phaser JSON Hash (frames + meta). */
export const ATLASES: { key: string; textureUrl: string; data: object }[] = jsons.keys().sort().map((file) => {
  const key = file.replace(/^\.\//, '').replace(/\.json$/, '');
  return { key, textureUrl: images(`./${key}.webp`).uri, data: jsons(file) };
});

/** Frame name ("enemies/roach") → the ATLASES key of the atlas that holds it. */
export const FRAME_ATLAS: Record<string, string> = Object.fromEntries(
  ATLASES.flatMap(({ key, data }) => Object.keys((data as { frames: object }).frames).map((frame): [string, string] => [frame, key])),
);
