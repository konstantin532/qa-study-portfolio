/* Dev-only regression checks. Requires Playwright; application remains dependency-free.
 * Start python -m http.server 8765, then: node scripts/verify-ui.cjs
 * Optional: QA_BASE_URL, QA_SCREENSHOTS_DIR. Uses an isolated browser profile.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:8765/';
const artifacts = path.resolve(__dirname, '../work/ui-check');
const shots = process.env.QA_SCREENSHOTS_DIR || artifacts;
const routes = ['dashboard','today','course','roadmap','mindmap','questions','repetition','practice','notes','portfolio','glossary','resources','pomodoro','stats','settings'];
const results = [];
let browser;
function pass(name, detail) { results.push({name, detail, status:'PASS'}); console.log('PASS ' + name); }
async function ready(page) {
  await page.waitForFunction(() => window.App && App.state && Object.keys(App.state.lessons).length === 69 && document.querySelector('#main-content').innerText.trim());
  await page.evaluate(() => document.fonts.ready.then(() => true));
}
async function navigate(page, route) {
  await page.evaluate(route => { location.hash = '#' + route; }, route);
  await page.waitForFunction(route => App.state.currentRoute === route && document.body.dataset.route === route.split('/')[0], route);
  assert(!/Ошибка раздела|Раздел не найден|Раздел загружается/.test(await page.locator('#main-content').innerText()), route);
}
async function checkLayout(page, label) {
  const value = await page.evaluate(() => {
    const main = document.querySelector('#main-content').getBoundingClientRect();
    const frame = document.querySelector('.main-container').getBoundingClientRect();
    return {width:innerWidth, main:{x:main.x,y:main.y,width:main.width}, right:frame.right};
  });
  assert(value.main.y >= 0 && value.main.y < 350, label + ' first content is visible: ' + JSON.stringify(value));
  assert(value.right <= value.width + 1 && value.main.width > 180, label + ' frame fits viewport: ' + JSON.stringify(value));
  pass(label, value);
}
async function waitForPersistedNote(page) {
  // Poll from Node: some browser adapters treat a Promise predicate as truthy.
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    const saved = await page.evaluate(async () => (await IDB.getAll('notes')).some(note => note.title === 'Fieldwork regression fixture' && note.conclusion === 'This note must survive a reload.' && note.content.includes('Original regression note body')));
    if (saved) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Edited note was not persisted in IndexedDB');
}

(async () => {
  await fs.mkdir(artifacts, {recursive:true});
  await fs.mkdir(shots, {recursive:true});
  browser = await chromium.launch({headless:true});
  const context = await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'light',reducedMotion:'reduce'});
  const page = await context.newPage();
  const errors = [];
  const external = [];
  page.on('pageerror', error => errors.push(String(error)));
  await context.route('**/*', route => {
    const url = route.request().url();
    if (/^https?:/.test(url) && !url.startsWith(new URL(base).origin + '/')) { external.push(url); return route.abort(); }
    return route.continue();
  });
  await page.goto(base);
  await ready(page);
  await page.locator('.modal--onboarding').waitFor();
  const dialog = await page.locator('.modal--onboarding').boundingBox();
  const head = await page.locator('.modal--onboarding .modal__head').boundingBox();
  const body = await page.locator('.modal--onboarding .modal__body').boundingBox();
  assert(dialog.y >= 0 && dialog.y + dialog.height <= 1000 && head.y + head.height <= body.y + 1, 'Onboarding is one contiguous visible dialog');
  await page.getByRole('button',{name:'Пропустить',exact:true}).click();
  pass('Onboarding dialog layout and skip');

  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:width===1440?1000:844});
    for (const route of routes) {
      await navigate(page, route);
      await page.evaluate(() => scrollTo(0,0));
      await checkLayout(page, 'Route ' + route + ' at ' + width);
    }
  }
  for (const width of [320,768,1024]) {
    await page.setViewportSize({width,height:900});
    await navigate(page,'dashboard');
    await checkLayout(page,'Dashboard breakpoint ' + width);
  }
  await page.setViewportSize({width:390,height:844});
  await navigate(page,'today');
  assert(await page.locator('#sidebar').evaluate(node => node.inert), 'Closed mobile menu is inert');
  await page.locator('.hamburger').click();
  assert(await page.locator('.main-container').evaluate(node => node.inert), 'Background is inert');
  await page.locator('#sidebar a[href="#dashboard"]').first().focus();
  await page.keyboard.press('Shift+Tab');
  assert(await page.evaluate(() => document.activeElement.closest('#sidebar') !== null), 'Menu focus remains inside');
  await page.locator('.sidebar__brand').click();
  assert(!(await page.locator('.main-container').evaluate(node => node.inert)), 'Brand click releases background');
  assert(!(await page.locator('#sidebar').evaluate(node => node.classList.contains('sidebar--open'))));
  await page.locator('.hamburger').click();
  await page.keyboard.press('Escape');
  assert(await page.locator('.hamburger').evaluate(node => document.activeElement === node));
  pass('Mobile menu, brand navigation, focus trap and Escape');

  await navigate(page,'dashboard');
  const targets = await page.locator('.atlas-module').evaluateAll(nodes => nodes.map(node => node.hash.slice('#course/lesson/'.length)));
  assert.equal(targets.length,23);
  assert(await page.evaluate(ids => ids.every(id => App.state.lessons[id]), targets));
  await page.locator('.atlas-module').first().click();
  await page.waitForFunction(() => App.state.currentRoute === 'course/lesson/:id');
  assert((await page.locator('#main-content').innerText()).includes('Что такое тестирование'));
  pass('23 module links point to real lessons; lesson opens');

  await page.setViewportSize({width:1440,height:1000});
  await navigate(page,'notes');
  await page.getByRole('button',{name:'Создать заметку',exact:true}).click();
  await page.locator('[data-field="title"]').fill('Fieldwork regression fixture');
  await page.locator('[data-field="conclusion"]').fill('This note must survive a reload.');
  await page.getByRole('textbox',{name:'Пишите своими словами',exact:true}).fill('Original regression note body');
  await page.locator('[data-field="conclusion"]').press('Tab');
  await waitForPersistedNote(page);
  await page.reload(); await ready(page);
  await page.waitForFunction(() => Object.values(App.state.notes).some(note => note.title === 'Fieldwork regression fixture'));
  assert(await page.evaluate(() => Object.values(App.state.notes).some(note => note.content.includes('Original regression note body'))));
  pass('Create/edit note through UI and persist across reload');
  await require('./verify-notes.cjs')(page);
  pass('Rapid note switching preserves each note and editor body');

  await navigate(page,'settings');
  const backup = await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Экспорт копии',exact:true}).click()]);
  const backupPath = path.join(artifacts,'backup.json');
  await backup[0].saveAs(backupPath);
  const backupData = JSON.parse(await fs.readFile(backupPath,'utf8'));
  assert(JSON.stringify(backupData).includes('Fieldwork regression fixture'));
  await page.getByRole('button',{name:'Импорт копии',exact:true}).click();
  await page.locator('#import-file-input').setInputFiles(backupPath);
  await page.getByRole('button',{name:'Импортировать',exact:true}).click();
  await page.getByText('Импорт завершён, обновите страницу',{exact:true}).waitFor();
  await page.reload(); await ready(page);
  await page.waitForFunction(() => Object.values(App.state.notes).some(note => note.title === 'Fieldwork regression fixture'));
  pass('Backup download and UI import round trip (isolated fixture)');

  const portfolioDownload = page.waitForEvent('download');
  await page.evaluate(() => App.PresentationManager.exportHTML([{title:'Fixture artifact',type:'test-case',description:'Export verification'}]));
  const exported = path.join(artifacts,'portfolio.html');
  await (await portfolioDownload).saveAs(exported);
  const exportPage = await context.newPage();
  await exportPage.goto(pathToFileURL(exported).href);
  assert.equal(await exportPage.locator('body').evaluate(node => getComputedStyle(node).backgroundColor),'rgb(243, 240, 233)');
  await exportPage.close();
  pass('Standalone portfolio export resolves its own colors');

  await page.locator('#header-search').fill('Семь принципов');
  await page.locator('#header-search').press('Enter');
  await page.locator('.modal--search a[href="#course/lesson/m01-t02"]').click();
  await page.waitForFunction(() => location.hash === '#course/lesson/m01-t02');
  await page.locator('#header-search').fill('');
  await page.waitForFunction(() => App.state.searchQuery === '');
  pass('Header search opens matching course lesson');

  for (const theme of ['dark','light','system']) {
    await page.locator('.theme-switch__select').selectOption(theme);
    assert.equal(await page.evaluate(() => App.state.user.theme),theme);
    assert.equal(await page.locator('html').getAttribute('data-theme'),theme==='dark'?'dark':'light');
  }
  await context.setOffline(true);
  await navigate(page,'dashboard');
  assert.equal(await page.locator('.atlas-module').count(),23);
  await context.setOffline(false);
  pass('Theme switching and offline navigation');
  assert.equal(external.length,0,'No external runtime requests');
  assert.deepEqual(errors,[],'No uncaught JS exceptions');

  const local = await context.newPage();
  local.on('pageerror',error => errors.push(String(error)));
  await local.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  await ready(local);
  const skip = local.getByRole('button',{name:'Пропустить',exact:true});
  if (await skip.isVisible()) await skip.click();
  assert.equal(await local.locator('.atlas-module').count(),23);
  assert(await local.evaluate(() => document.fonts.check('500 18px Unbounded')));
  await local.close();
  pass('Direct file:// launch with local fonts');

  await navigate(page,'dashboard');
  await page.locator('.theme-switch__select').selectOption('light');
  await page.evaluate(() => scrollTo(0,0));
  await page.screenshot({path:path.join(shots,'fieldwork-desktop.png'),fullPage:true});
  await page.locator('.theme-switch__select').selectOption('dark');
  await page.screenshot({path:path.join(shots,'fieldwork-dark.png'),fullPage:true});
  await page.locator('.theme-switch__select').selectOption('light');
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(shots,'fieldwork-mobile.png'),fullPage:true});
  await navigate(page,'today');
  await page.screenshot({path:path.join(shots,'fieldwork-today-mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(shots,'verification.json'),JSON.stringify({results,errors,external},null,2));
  console.log(JSON.stringify({passed:results.length,uncaughtErrors:errors.length,externalRequests:external.length}));
})().catch(error => { console.error(error); process.exitCode=1; }).finally(async () => { if(browser)await browser.close(); });
