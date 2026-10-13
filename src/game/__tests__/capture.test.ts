import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureGame, installCapture } from '../capture';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('feedback game frame', () => {
  it('omits a missing, failed or stalled renderer without blocking feedback', async () => {
    expect(await captureGame()).toBeNull();
    const failed = installCapture(() => { throw Error('renderer gone'); });
    expect(await captureGame()).toBeNull(); failed();
    vi.useFakeTimers();
    const stalled = installCapture(() => {});
    const pending = captureGame();
    await vi.advanceTimersByTimeAsync(1200);
    expect(await pending).toBeNull(); stalled();
  });
  it('bounds image size and older renderer cleanup cannot remove the current provider', async () => {
    const canvas = {width:0,height:0,getContext:()=>({drawImage:vi.fn()}),toDataURL:()=> 'data:image/jpeg;base64,AA=='};
    vi.stubGlobal('document', {createElement:()=>canvas});
    const old = installCapture(done=>done(null));
    const latest = installCapture(done=>done({width:780,height:1688} as HTMLImageElement));
    old();
    expect(await captureGame()).toBe('data:image/jpeg;base64,AA==');
    expect(canvas.height).toBe(480);
    expect(canvas.width).toBeLessThan(480);
    canvas.toDataURL=()=> 'data:image/jpeg;base64,'+'A'.repeat(180_000);
    expect(await captureGame()).toBeNull();
    latest();
    expect(await captureGame()).toBeNull();
  });
});
