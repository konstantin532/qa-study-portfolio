const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

async function collectRuntimeErrors(page) {
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`); });
  return errors;
}

test('главная страница загружается без ошибок консоли', async ({ page }) => {
  const errors = await collectRuntimeErrors(page);
  const response = await page.goto('/index.html');
  expect(response && response.ok()).toBeTruthy();
  await page.waitForLoadState('networkidle');
  expect(await page.locator('body').isVisible()).toBeTruthy();
  expect(errors).toEqual([]);
});

test('нет серьёзных и критических нарушений доступности', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForLoadState('networkidle');
  const result = await new AxeBuilder({ page }).analyze();
  const blocking = result.violations.filter(v => ['critical', 'serious'].includes(v.impact));
  expect(blocking, blocking.map(v => `${v.id}: ${v.help}`).join('\n')).toEqual([]);
});

test('интерактивные поля имеют доступные имена', async ({ page }) => {
  await page.goto('/index.html');
  const controls = page.locator('input:not([type="hidden"]), select, textarea, button');
  for (let i = 0; i < await controls.count(); i++) {
    const item = controls.nth(i);
    if (!(await item.isVisible())) continue;
    const name = await item.getAttribute('aria-label') || await item.getAttribute('title') || (await item.innerText().catch(() => '')) || await item.getAttribute('placeholder');
    const id = await item.getAttribute('id');
    const hasLabel = id ? await page.locator(`label[for="${id}"]`).count() > 0 : false;
    expect(Boolean((name || '').trim()) || hasLabel, `Control ${i} (${id || 'without id'}) has no accessible name`).toBeTruthy();
  }
});

test('повреждённые данные и переполнение localStorage не ломают интерфейс', async ({ page }) => {
  const errors = await collectRuntimeErrors(page);
  await page.goto('/index.html');
  const result = await page.evaluate(() => {
    localStorage.setItem('__stabilization_corrupt__', '{broken-json');
    const fallback = window.safeStorage.get('__stabilization_corrupt__', { recovered: true });
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function () { throw new DOMException('Quota exceeded', 'QuotaExceededError'); };
    const saved = window.safeStorage.set('__stabilization_quota__', { test: true });
    Storage.prototype.setItem = original;
    localStorage.removeItem('__stabilization_corrupt__');
    return { fallback, saved };
  });
  expect(result.fallback).toEqual({ recovered: true });
  expect(result.saved).toBe(false);
  expect(await page.locator('body').isVisible()).toBeTruthy();
  expect(errors).toEqual([]);
});

test('клавиатурный фокус видим', async ({ page }) => {
  await page.goto('/index.html');
  await page.keyboard.press('Tab');
  const active = page.locator(':focus');
  await expect(active).toBeVisible();
  const style = await active.evaluate(el => { const s=getComputedStyle(el); return { outline:s.outlineStyle, width:s.outlineWidth, shadow:s.boxShadow }; });
  expect(style.outline !== 'none' || style.shadow !== 'none').toBeTruthy();
});
