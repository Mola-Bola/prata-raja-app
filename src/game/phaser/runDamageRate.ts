/** One bucket per fixed simulation step; combat bursts never allocate an event queue. */
export class RunDamageRate {
  private readonly buckets = Array.from({ length: 301 }, () => ({ tick: -1, damage: 0 }));

  reset(): void {
    for (const bucket of this.buckets) { bucket.tick = -1; bucket.damage = 0; }
  }

  add(time: number, damage: number): void {
    if (!Number.isFinite(time) || time < 0 || !Number.isFinite(damage) || damage <= 0) return;
    const tick = Math.floor(time * 60 + 1e-7);
    const bucket = this.buckets[tick % this.buckets.length];
    if (bucket.tick !== tick) { bucket.tick = tick; bucket.damage = 0; }
    bucket.damage += damage;
  }

  read(time: number): number {
    if (!Number.isFinite(time) || time <= 0) return 0;
    const tick = Math.floor(time * 60 + 1e-7);
    let damage = 0;
    for (const bucket of this.buckets) {
      if (bucket.tick >= 0 && bucket.tick <= tick && tick - bucket.tick < 300) damage += bucket.damage;
    }
    return damage / Math.min(5, time);
  }
}
