import type { BreadId, Content } from '../core/types';
import { runPools } from './recipes';
import type { SaveV2 } from './types';

/** Only known base breads can become a signature; invalid choices leave the save intact. */
export function chooseSignature(save: SaveV2, id: unknown, content: Content): SaveV2 {
  if (!save.unlocks.signature || !runPools(save, content).breadPool.includes(id as BreadId)) return save;
  return { ...save, signatureBread: id as BreadId };
}
