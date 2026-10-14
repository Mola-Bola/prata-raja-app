// Shared steps for the specs that touch the walkable hub (src/game/ui/hub/HubOverlay.tsx, the home screen) and the old stall menu
// (src/game/ui/stall/StallHub.tsx) it links to from the hub's settings. Not a spec: Playwright runs only *.spec.ts.
import { expect, type Page } from '@playwright/test';

/** Opens the old stall menu from the hub's settings row. Its sheets (calendar, gear, tip jar, ...) are what the old specs test. */
export async function openOldStall(page: Page): Promise<void> {
  await page.getByTestId('hub-settings').click();
  await page.getByTestId('settings-old-stall').click();
  await expect(page.getByTestId('stall-hub')).toBeVisible();
}

/** Opens the Kitchen from the hub's settings row. */
export async function openKitchen(page: Page): Promise<void> {
  await page.getByTestId('hub-settings').click();
  await page.getByTestId('hub-kitchen').click();
}
