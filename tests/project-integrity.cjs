const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const jsDir = path.join(root, 'js');
const files = fs.readdirSync(jsDir).filter(name => name.endsWith('.js'));
for (const file of files) {
  const source = fs.readFileSync(path.join(jsDir, file), 'utf8');
  assert.doesNotThrow(() => new vm.Script(source, { filename: file }), `Syntax error in ${file}`);
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const storageAt = html.indexOf('js/safe-storage.js');
const utilsAt = html.indexOf('js/utils.js');
assert(storageAt >= 0 && storageAt < utilsAt, 'safe-storage.js must load before application modules');
assert(!/<script[^>]+src=["']js\/debug\.js["']/i.test(html), 'debug.js must remain opt-in');
const main = fs.readFileSync(path.join(jsDir, 'main.js'), 'utf8');
assert.strictEqual((main.match(/function\s+_importDataManual\s*\(/g) || []).length, 2, 'Unexpected _importDataManual fallback count');
assert(!fs.existsSync(path.join(root, 'qa-study-portfolio.zip')), 'Nested source archive must not be committed');
console.log(JSON.stringify({ parsedJavaScriptFiles: files.length, storageOrder: 'passed', duplicateImportFunction: 'passed', status: 'passed' }, null, 2));
