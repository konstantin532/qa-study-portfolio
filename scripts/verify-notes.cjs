const assert = require('node:assert/strict');

async function waitForNotes(page, predicate) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const notes = await page.evaluate(() => IDB.getAll('notes'));
    if (predicate(notes)) return notes;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Rapid-switch note snapshots were not preserved independently');
}

async function verifyRapidNoteSwitch(page) {
  await page.evaluate(() => { location.hash = '#notes'; });
  await page.waitForFunction(() => App.state.currentRoute === 'notes');
  async function create(title, content) {
    const first = page.getByRole('button',{name:'Создать заметку',exact:true});
    if (await first.isVisible()) await first.click();
    else await page.locator('[data-act="create"]').click();
    await page.locator('[data-field="title"]').fill(title);
    await page.getByRole('textbox',{name:'Пишите своими словами',exact:true}).fill(content);
    const notes = await waitForNotes(page, notes => notes.some(note => note.title === title && note.content.includes(content)));
    return notes.find(note => note.title === title).id;
  }
  const idA = await create('Rapid A', 'Original body A');
  const idB = await create('Rapid B', 'Original body B');
  await page.locator('[data-select="' + idA + '"]').click();
  await page.locator('[data-field="title"]').fill('Rapid A changed');
  await page.locator('[data-field="conclusion"]').fill('Conclusion A');
  await page.getByRole('textbox',{name:'Пишите своими словами',exact:true}).fill('Body A changed');
  await page.locator('[data-select="' + idB + '"]').click();
  const notes = await waitForNotes(page, notes => {
    const a = notes.find(note => note.id === idA), b = notes.find(note => note.id === idB);
    return a && b && a.title === 'Rapid A changed' && a.conclusion === 'Conclusion A' && a.content.includes('Body A changed')
      && b.title === 'Rapid B' && b.content.includes('Original body B');
  });
  assert.equal(notes.find(note => note.id === idB).conclusion, '');
  await page.reload();
  await page.waitForFunction(id => App.state && App.state.notes[id] && App.state.notes[id].title === 'Rapid A changed', idA);
  assert(await page.evaluate(id => App.state.notes[id].content.includes('Body A changed'), idA));
}

module.exports = verifyRapidNoteSwitch;
if (require.main === module) {
  (async () => {
    const {chromium} = require('playwright');
    const browser = await chromium.launch({headless:true});
    try {
      const context = await browser.newContext({reducedMotion:'reduce'});
      const page = await context.newPage();
      await page.goto(process.env.QA_BASE_URL || 'http://127.0.0.1:8765/');
      await page.locator('.modal--onboarding').waitFor();
      await page.getByRole('button',{name:'Пропустить',exact:true}).click();
      await verifyRapidNoteSwitch(page);
      console.log('PASS Rapid note switching preserves both notes and editor content');
    } finally { await browser.close(); }
  })().catch(error => {console.error(error);process.exitCode=1;});
}
