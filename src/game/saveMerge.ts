// Local vs cloud save: the one with the newer stamp (ms since epoch) wins; a tie keeps local. A save with no stamp is 0.
export type Stamped = { json: string; at: number };
export function pickNewer(local: Stamped | null, cloud: Stamped | null): 'local' | 'cloud' {
  return cloud && (!local || cloud.at > local.at) ? 'cloud' : 'local';
}
