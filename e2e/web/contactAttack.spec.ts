import { expect, test } from '@playwright/test';

for (const width of [320, 390]) for (const calm of [false, true]) {
  test(`counter phases and interruption at ${width}px${calm ? ' with reduced motion' : ''}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: calm ? 'reduce' : 'no-preference' });
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
    await page.route('**/auth/v1/**', route => route.fulfill({ json: {} }));
    await page.goto('/play?kitchen=1');
    await page.getByTestId('kitchen-start').click();
    await page.waitForFunction(() => window.__world?.phase === 'wave');
    await page.evaluate(() => {
      const w = window.__world!;
      const scene = window.__game!.scene.getScene('RunScene') as unknown as { paused: boolean; acc: number; hitStop: number; actors: { clear(): void }; frame(dt: number): void };
      scene.paused = true; scene.acc = 0; scene.hitStop = 0; scene.actors.clear();
      w.enemies = []; w.projectiles = []; w.events = []; w.zones = []; w.budgetLeft = 0; w.waveTime = -10000;
      w.player.breads = []; w.player.stats.maxHp = 1000; w.player.hp = 1000;
      const def = { ...w.content.enemies['sugar-ant'], speed: 0 };
      w.enemies.push({ uid: w.nextUid++, def, boss: false, elite: false, x: 0, y: 30, hp: 1000, maxHp: 1000, shield: 0, statuses: [], state: 'attack', contactClock: 0,
        t: 7, age: 1, knock: 0, flash: 0, cooldowns: { bx: 0, ph: 0 }, phase: 0, holdY: 0 });
      scene.frame(0);
    });
    const snapshots: { phase: string; hp: number; y: number; time: number }[] = [];
    for (const [phase, frames] of [['prep', 12], ['hit', 12], ['rest', 21]] as const) {
      const snapshot = await page.evaluate(frames => {
        const w = window.__world!;
        type Mark = { type: string; text?: string; visible: boolean; x: number; width: number; originX: number };
        const scene = window.__game!.scene.getScene('RunScene') as unknown as { acc: number; hitStop: number; frame(dt: number): void;
          actors: { viewOf(uid: number): { body: { y: number } } }; children: { list: Mark[] } };
        for (let n = 0; n < frames; n++) { scene.hitStop = 0; scene.frame(1 / 60); }
        const marks = scene.children.list.filter(o => o.type === 'Text' && o.text === '!' && o.visible);
        const mark = marks[0];
        const root = document.querySelector('[data-testid="game-root"]')!.getBoundingClientRect();
        return { phase: w.enemies[0].contactClock! < .3 ? 'prep' : w.enemies[0].contactClock! < .5 ? 'hit' : 'rest', marks: marks.length, hp: w.player.hp, y: scene.actors.viewOf(w.enemies[0].uid).body.y, time: w.enemies[0].contactClock!,
          left: mark ? mark.x - mark.width * mark.originX : 0, right: mark ? mark.x + mark.width * (1 - mark.originX) : 0, width: root.width };
      }, frames);
      expect(snapshot.phase).toBe(phase); expect(snapshot.marks).toBe(phase === 'rest' ? 0 : 1);
      expect(snapshot.left).toBeGreaterThanOrEqual(0); expect(snapshot.right).toBeLessThanOrEqual(snapshot.width);
      snapshots.push(snapshot);
      await page.screenshot({ path: testInfo.outputPath(`${width}-${calm ? 'calm-' : ''}${phase}.png`) });
    }
    expect(snapshots[0].hp).toBe(1000);
    expect(snapshots[1].hp).toBeCloseTo(997.5); expect(snapshots[2].hp).toBeCloseTo(995);
    if (!calm) expect(snapshots[1].y).toBeGreaterThan(snapshots[0].y + 10);
    const interrupted = await page.evaluate(() => {
      const w = window.__world!; const e = w.enemies[0];
      const scene = window.__game!.scene.getScene('RunScene') as unknown as { hitStop: number; frame(dt: number): void; children: { list: { type: string; text?: string; visible: boolean }[] } };
      e.knock = 100; e.statuses = [{ id: 'stun', time: .5, stacks: 1, dps: 0, amount: 0 }]; scene.hitStop = 0; scene.frame(.1);
      return { clock: e.contactClock, state: e.state, marks: scene.children.list.filter(o => o.type === 'Text' && o.text === '!' && o.visible).length };
    });
    expect(interrupted).toEqual({ clock: undefined, state: 'walk', marks: 0 });
    expect(errors).toEqual([]);
  });
}
