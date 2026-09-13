const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const STORAGE_KEYS = [];

function watchRuntime(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console.error: ${message.text()}`); });
  return errors;
}

test('главная страница загружается без ошибок консоли', async ({ page }) => {
  const errors = watchRuntime(page);
  const response = await page.goto('/');
  expect(response && response.ok()).toBeTruthy();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('body')).toBeVisible();
  expect(errors, errors.join('
')).toEqual([]);
});

test('нет критических и серьёзных нарушений доступности', async ({ page }) => {
  await page.goto('/'); await page.waitForLoadState('networkidle');
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(v => ['critical','serious'].includes(v.impact));
  expect(blocking, blocking.map(v => `${v.id}: ${v.help} (${v.nodes.length})`).join('
')).toEqual([]);
});

test('клавиатурный фокус видим и попадает на интерактивный элемент', async ({ page }) => {
  await page.goto('/'); await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toBeVisible();
  const outline = await focused.evaluate(el => { const s=getComputedStyle(el); return {outline:s.outlineStyle, width:parseFloat(s.outlineWidth)||0, shadow:s.boxShadow}; });
  expect(outline.width > 0 || (outline.shadow && outline.shadow !== 'none')).toBeTruthy();
});

test('поля форм имеют доступные имена', async ({ page }) => {
  await page.goto('/');
  const unnamed = await page.locator('input:not([type=hidden]), select, textarea').evaluateAll(nodes => nodes.filter(el => {
    const labelled = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title') || el.closest('label') || (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`));
    return !labelled;
  }).map(el => el.id || el.name || el.outerHTML.slice(0,120)));
  expect(unnamed, `Поля без доступного имени:
${unnamed.join('
')}`).toEqual([]);
});

test('идентификаторы DOM уникальны', async ({ page }) => {
  await page.goto('/');
  const duplicateIds = await page.locator('[id]').evaluateAll(nodes => { const a=nodes.map(n=>n.id); return [...new Set(a.filter((id,i)=>a.indexOf(id)!==i))]; });
  expect(duplicateIds).toEqual([]);
});

test('хранилище переживает повреждённые значения без падения страницы', async ({ page }) => {
  test.skip(STORAGE_KEYS.length === 0, 'Статические ключи localStorage не найдены');
  const errors = watchRuntime(page);
  await page.goto('/');
  await page.evaluate(keys => keys.forEach(key => localStorage.setItem(key, '{not-valid-json'))), STORAGE_KEYS);
  await page.reload(); await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('body')).toBeVisible();
  expect(errors, errors.join('
')).toEqual([]);
});

test('ошибка квоты localStorage не делает интерфейс недоступным', async ({ page }) => {
  const errors = watchRuntime(page);
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Quota exceeded','QuotaExceededError'); }; });
  await page.goto('/'); await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('body')).toBeVisible();
  expect(errors, errors.join('
')).toEqual([]);
});

test('формы не вызывают нативную навигацию при пустой отправке', async ({ page }) => {
  await page.goto('/');
  const forms = page.locator('form');
  for (let i=0; i<await forms.count(); i++) {
    const form=forms.nth(i); if (!await form.isVisible()) continue;
    const before=page.url();
    await form.evaluate(f => f.requestSubmit());
    await page.waitForTimeout(100);
    expect(page.url()).toBe(before);
  }
});
