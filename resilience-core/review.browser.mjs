import { test, expect } from '@playwright/test';
test('reviewer sees evidence, records decisions and publishes from the separate console', async ({ page }) => {
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByText('Synthetic demonstration', { exact: false })).toBeVisible();
  await expect(page.getByText('Status: unreviewed', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Approve', exact: true }).first().click();
  await expect(page.getByRole('status')).toHaveText('Enter a reason for this decision.');
  await page.getByText('Source and reviewed reasoning', { exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Synthetic escalation policy' }).first()).toBeVisible();
  await page.getByLabel('Legal review reason', { exact: true }).fill('Synthetic browser review.');
  await page.getByRole('button', { name: 'Approve', exact: true }).first().click();
  await expect(page.getByText('Status: awaiting owner review', { exact: false })).toBeVisible();
  for (let index = 0; index < 2; index++) {
    const card = page.getByRole('article').nth(index);
    await card.getByLabel('Recorded owner’s reason').fill('Synthetic owner consent.');
    await card.getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Up to date.');
  }
  await expect(page.getByText('Status: approved', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Publish to synthetic store' }).first().click();
  await expect(page.getByText('Status: partially published', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Publish to synthetic store' }).click();
  await expect(page.getByText('Status: published ·', { exact: false })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
