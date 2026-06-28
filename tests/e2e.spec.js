const { test, expect } = require('@playwright/test');

test('homepage loads', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page).toHaveTitle(/Bookshelf/);
});

test('login page', async ({ page }) => {
  await page.goto('http://localhost:3000/login.html');
  await expect(page.locator('h1')).toContainText(/Login/);
});

test('health endpoint', async ({ request }) => {
  const response = await request.get('http://localhost:3000/api/health');
  expect(response.ok()).toBeTruthy();
});
