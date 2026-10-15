// Shared steps for the specs that touch the walkable hub (src/game/ui/hub/HubOverlay.tsx, the home screen). Not a spec: Playwright
// runs only *.spec.ts.
import type { Page } from '@playwright/test';

/** The old stall menu is gone (r8-flow). The specs that call this still test sheets that now live in the hub panels
 *  (src/game/ui/hub/HubOverlay.tsx); port them to `hub-panel` testids, then delete this. It fails loudly until then. */
export async function openOldStall(_page: Page): Promise<void> {
  throw new Error('The old stall menu was removed; open the sheet through its hub station panel instead.');
}

/** Opens the Kitchen from the hub's settings row. */
export async function openKitchen(page: Page): Promise<void> {
  await page.getByTestId('hub-settings').click();
  await page.getByTestId('hub-kitchen').click();
}
