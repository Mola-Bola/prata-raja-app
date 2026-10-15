// Shared steps for the specs that touch the walkable hub (src/game/ui/hub/HubOverlay.tsx, the home screen). Not a spec: Playwright
// runs only *.spec.ts.
import { expect, type Page } from '@playwright/test';

export type Station = 'tawa' | 'dips' | 'gear' | 'pantry' | 'spec' | 'orders' | 'kopi' | 'exit';

/** Walks Kannan to a station and waits for its panel (what walking into its range does), then picks a tab if one is named.
 *  Closes whatever panel is open first. A station he already stands at does not re-open by walking, so if its panel stays shut
 *  the helper walks out to the kopi stall and back. */
export async function openStation(page: Page, station: Station, tab?: string): Promise<void> {
  const panel = page.locator(`[data-testid="hub-panel"][data-station="${station}"]`);
  if (!(await panel.isVisible())) {
    const open = page.locator('[data-testid="hub-panel"]');
    if (await open.isVisible()) await page.getByTestId('hub-close').click();
    await page.evaluate((s) => window.__hub!.controls!.hubWalkTo!(s), station);
    if (!(await panel.waitFor({ state: 'visible', timeout: 4_000 }).then(() => true, () => false))) {
      await page.evaluate(() => window.__hub!.controls!.hubWalkTo!('kopi'));
      await page.waitForTimeout(300);
      await page.evaluate((s) => window.__hub!.controls!.hubWalkTo!(s), station);
    }
    await expect(panel).toBeVisible();
  }
  if (tab) await page.locator(`[data-testid="hub-tab-${tab.toLowerCase().replace(/\W+/g, '-')}"]`).click();
}

/** Opens the Kitchen from the hub's settings row. */
export async function openKitchen(page: Page): Promise<void> {
  await page.getByTestId('hub-settings').click();
  await page.getByTestId('hub-kitchen').click();
}
