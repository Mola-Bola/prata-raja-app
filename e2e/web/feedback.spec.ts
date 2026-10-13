// "Tell Kannan" inside the game (src/game/ui/FeedbackSheet.tsx): open it from the pause sheet and the results screen, write a
// note, see a failed send keep the text and Retry, and see the Analytics switch hold its setting. The edge function is mocked
// (nothing reaches a real project); the unit tests cover the payload and the server's checks. Needs only the web build
// (bash scripts/check.sh --web).
import { expect, type Page, type Route, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

const tid = (page: Page, id: string) => page.locator(`[data-testid="${id}"]`).filter({ visible: true }).first();
const DEVICE_KEY = 'game:prata-raja/device';

type Note = { id: string; device_id: string; chip: string; body: string; from: string; context: Record<string, unknown> };

test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', (route) => route.fulfill({ json: [] }));
  await page.route('**/auth/v1/**', (route) => route.fulfill({ json: {} }));
});

/** Answer the game-feedback call: the first `fail` calls drop the connection, later ones succeed. Returns what was sent. */
async function mockFeedback(page: Page, fail = 0): Promise<Note[]> {
  const sent: Note[] = [];
  await page.route('**/functions/v1/game-feedback', async (route: Route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
    sent.push(JSON.parse(request.postData() ?? '{}') as Note);
    if (sent.length <= fail) return route.abort('failed');
    return route.fulfill({ json: { ok: true, id: sent[sent.length - 1].id }, headers: { 'access-control-allow-origin': '*' } });
  });
  return sent;
}

async function startRunAndPause(page: Page) {
  await page.goto('/play');
  await tid(page, 'ui-start').click();
  await page.waitForFunction(() => !!window.__world, null, { timeout: 60_000 });
  await tid(page, 'ui-pause').click();
  await expect(tid(page, 'ui-resume')).toBeVisible();
}

test('a note from the pause sheet: chips, clear, a failed send keeps the text, Retry files it once', async ({ page }) => {
  test.setTimeout(150_000);
  const sent = await mockFeedback(page, 1);
  await startRunAndPause(page);

  await tid(page, 'ui-tell').click();
  await expect(tid(page, 'feedback-sheet')).toBeVisible();
  // It says what travels with the note, and cannot send nothing.
  await expect(tid(page, 'feedback-context')).toContainText('run');
  await expect(tid(page, 'feedback-send')).toBeDisabled();

  // Kind chips: Idea is chosen first; one at a time.
  await expect(tid(page, 'feedback-chip-idea')).toHaveAttribute('aria-checked', 'true');
  await tid(page, 'feedback-chip-balance').click();
  await expect(tid(page, 'feedback-chip-balance')).toHaveAttribute('aria-checked', 'true');
  await expect(tid(page, 'feedback-chip-idea')).toHaveAttribute('aria-checked', 'false');

  // The note box has a clear button.
  await tid(page, 'feedback-text').fill('first try, cleared');
  await tid(page, 'feedback-clear').click();
  await expect(tid(page, 'feedback-text')).toHaveValue('');
  await expect(tid(page, 'feedback-send')).toBeDisabled();

  await tid(page, 'feedback-text').fill('  The first boss comes too early.  ');
  await tid(page, 'feedback-from').fill('Mum');
  await tid(page, 'feedback-send').click();

  // The first call fails: the text stays and the button becomes Retry.
  await expect(tid(page, 'feedback-error')).toBeVisible();
  await expect(tid(page, 'feedback-text')).toHaveValue('  The first boss comes too early.  ');
  await expect(tid(page, 'feedback-send')).toHaveText('Retry');
  await tid(page, 'feedback-send').click();

  await expect(tid(page, 'feedback-sent')).toBeVisible();
  expect(sent).toHaveLength(2);
  // A retry is the same note (the server files an id once).
  expect(sent[1].id).toBe(sent[0].id);
  expect(sent[1]).toMatchObject({ chip: 'balance', body: 'The first boss comes too early.', from: 'Mum' });
  expect(sent[1].context).toMatchObject({ screen: 'run', platform: 'web' });
  expect(sent[1].device_id).toMatch(/^[0-9a-f-]{36}$/);

  // The sheet steps aside by itself and the pause sheet is back underneath.
  await expect(tid(page, 'feedback-sheet')).toBeHidden({ timeout: 8_000 });
  await expect(tid(page, 'ui-resume')).toBeVisible();

  // The name was remembered on this device.
  const saved = JSON.parse((await page.evaluate((k) => localStorage.getItem(k), DEVICE_KEY)) ?? '{}');
  expect(saved).toMatchObject({ v: 1, from: 'Mum', analytics: true });
  expect(saved.id).toBe(sent[0].device_id);
});

test('the same sheet opens from the results screen, and the name comes back', async ({ page }) => {
  test.setTimeout(150_000);
  const sent = await mockFeedback(page);
  await page.addInitScript((k) => localStorage.setItem(k, JSON.stringify({ v: 1, id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', from: 'Dad', analytics: true })), DEVICE_KEY);
  await startRunAndPause(page);
  await tid(page, 'ui-quit').click(); // wakes Kannan early: the results screen
  await expect(tid(page, 'ui-again')).toBeVisible();

  await tid(page, 'ui-tell').click();
  await expect(tid(page, 'feedback-from')).toHaveValue('Dad');
  await expect(tid(page, 'feedback-context')).toContainText('results');
  await tid(page, 'feedback-chip-art').click();
  await tid(page, 'feedback-text').fill('Kannan looks great');
  await tid(page, 'feedback-text').press('Control+Enter'); // the keyboard shortcut sends
  await expect(tid(page, 'feedback-sent')).toBeVisible();
  expect(sent).toHaveLength(1);
  expect(sent[0]).toMatchObject({ chip: 'art', from: 'Dad', device_id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d' });
  expect(sent[0].context).toMatchObject({ screen: 'results' });
  await expect(tid(page, 'feedback-sheet')).toBeHidden({ timeout: 8_000 });
});

test('the sheet can be closed without sending, and the pause sheet stays', async ({ page }) => {
  test.setTimeout(150_000);
  const sent = await mockFeedback(page);
  await startRunAndPause(page);
  await tid(page, 'ui-tell').click();
  await tid(page, 'feedback-text').fill('never mind');
  await tid(page, 'feedback-close').click();
  await expect(tid(page, 'feedback-sheet')).toBeHidden();
  await expect(tid(page, 'ui-resume')).toBeVisible();
  expect(sent).toHaveLength(0);
  // Opened again it starts empty.
  await tid(page, 'ui-tell').click();
  await expect(tid(page, 'feedback-text')).toHaveValue('');
});

test('the Analytics switch is on by default, turns off, and is remembered', async ({ page }) => {
  test.setTimeout(150_000);
  await startRunAndPause(page);
  const sw = tid(page, 'ui-analytics');
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await expect(sw).toContainText('Off');
  const saved = JSON.parse((await page.evaluate((k) => localStorage.getItem(k), DEVICE_KEY)) ?? '{}');
  expect(saved.analytics).toBe(false);
  // After a reload the pause sheet still says Off.
  await page.reload();
  await tid(page, 'ui-start').click();
  await page.waitForFunction(() => !!window.__world, null, { timeout: 60_000 });
  await tid(page, 'ui-pause').click();
  await expect(tid(page, 'ui-analytics')).toHaveAttribute('aria-checked', 'false');
});
