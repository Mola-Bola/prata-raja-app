import { describe, expect, it } from 'vitest';
import { RunDamageRate } from '../runDamageRate';

describe('current-run shown damage rate', () => {
  it('uses elapsed simulation time at startup, then a five-second window', () => {
    const rate = new RunDamageRate();
    expect(rate.read(0)).toBe(0);
    rate.add(1, 100); rate.add(1, 20);
    expect(rate.read(2)).toBe(60);
    expect(rate.read(5)).toBe(24);
    expect(rate.read(6)).toBe(0);
  });
  it('includes the newest step but excludes damage exactly five seconds old', () => {
    const rate = new RunDamageRate();
    rate.add(10, 100); rate.add(10 + 1 / 60, 50);
    expect(rate.read(15)).toBe(10);
    expect(rate.read(15 + 1 / 60)).toBe(0);
  });
  it('freezes with simulation time, aggregates bursts, and resets for the next run', () => {
    const rate = new RunDamageRate();
    for (let i = 0; i < 100_000; i++) rate.add(2, 1);
    expect(rate.read(2)).toBe(50_000);
    expect(rate.read(2)).toBe(50_000); // wall time never enters the calculation
    for (let i = 0; i < 1000; i++) rate.add(10 + i / 60, 5);
    expect(rate.read(10 + 999 / 60)).toBe(300);
    rate.reset();
    expect(rate.read(2)).toBe(0);
    rate.add(1, 10); expect(rate.read(1)).toBe(10);
  });
  it('ignores malformed or non-damage events', () => {
    const rate = new RunDamageRate();
    for (const damage of [-1, 0, NaN, Infinity]) rate.add(1, damage);
    rate.add(NaN, 10); rate.add(-1, 10);
    expect(rate.read(1)).toBe(0);
    expect(rate.read(Infinity)).toBe(0);
  });
});
