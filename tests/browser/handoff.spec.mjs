import { test, expect } from '@playwright/test';

test.describe('pairing animation alignment', () => {
  test.use({ reducedMotion: 'no-preference' });
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    test(`paired phone frame stops pulsing before the logo flies to chat at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.route('**/api/handoff', route => route.fulfill({ json: {
        claimed: true, connected: true,
        svg: '<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="white"/></svg>',
      } }));
      await page.goto('/?mobile=1&handoff=animation-test');
      await expect(page.locator('#intro')).toHaveAttribute('data-step', 'paired');
      const frame = page.locator('.ks-phone-box');
      expect(await frame.evaluate(element => getComputedStyle(element, '::after').animationName)).toBe('none');
      await expect.poll(() => frame.evaluate(element => Number(getComputedStyle(element, '::after').opacity))).toBe(0);
      await expect(page.locator('#intro')).toBeHidden();
      await expect(page.locator('.ks-phone-box')).toHaveCount(0);
      await expect(page.getByRole('textbox', { name: 'Your question' })).toBeVisible();
      const stage = await page.locator('#guide > .mg-stage').boundingBox();
      const guide = await page.locator('#guide').boundingBox();
      expect(Math.abs(stage.x + stage.width / 2 - guide.x - guide.width / 2)).toBeLessThan(2);
    });
  }
});

test('expired phone handoff shows a GMC logo and still opens chat', async ({ page }) => {
  await page.route('**/api/handoff', route => route.fulfill({ status: 410, json: { error: 'This QR has expired. Scan the current kiosk code.' } }));
  await page.goto('/?mobile=1&handoff=expired');
  await expect(page.getByRole('img', { name: 'GMC logo', exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('expired');
  await page.getByRole('button', { name: 'Open chat', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Your question' })).toBeVisible();
  await expect(page).toHaveURL(/\?mobile=1$/);
});

test('connected phone removes the handoff token and restores conversation on reload', async ({ page }) => {
  let claims = 0;
  await page.route('**/api/handoff', route => {
    claims++;
    return route.fulfill({ json: { claimed: true, connected: true } });
  });
  await page.route('**/api/chat', route => route.fulfill({ json: { answer: 'GMC brings mindfulness and nature together.', sources: [] } }));
  await page.goto('/?mobile=1&handoff=connected');
  await expect(page.getByRole('textbox', { name: 'Your question' })).toBeVisible();
  await expect(page).toHaveURL(/\?mobile=1$/);
  await page.getByRole('textbox', { name: 'Your question' }).fill('What is GMC?');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.locator('.mg-bot').last()).toContainText('GMC brings mindfulness');
  await page.reload();
  await expect(page.locator('.mg-user')).toHaveText('What is GMC?');
  await expect(page.locator('.mg-bot').last()).toHaveText('GMC brings mindfulness and nature together.');
  expect(claims).toBe(1);
  await expect(page.getByRole('button', { name: 'Open chat', exact: true })).toHaveCount(0);
});
