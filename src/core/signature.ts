import type { BreadId } from './types';

export function signatureIdentity(id: BreadId): string {
  switch (id) {
    case 'murtabak': return 'Every fourth throw bursts into filling.';
    case 'roti-bomb': return 'Every fourth bomb leaves a hot tawa patch.';
    case 'appam': return 'Every fourth bowl chains farther without fading.';
    case 'kosong': return 'Honest impact, growing into ricochets.';
    case 'tissue': return 'A narrow shot pierces the queue.';
    case 'egg-telur': return 'Egg fragments fan out on impact.';
    case 'thosai': return 'A broad wave sweeps the street.';
    case 'chapati': return 'Out and back for a second helping.';
    case 'naan': return 'A slow landing with a heavy blast.';
    case 'garlic-naan': return 'Garlic patches linger under the queue.';
    case 'idli': return 'Rapid volleys build Sticky stacks.';
    case 'vadai': return 'Spinning rings guard the counter.';
    default: return 'An evolved serving of your favourite bread.';
  }
}
