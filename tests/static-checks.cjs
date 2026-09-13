const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ids = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map(m => m[1]);
const duplicates = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
assert.deepStrictEqual(duplicates, [], `Duplicate IDs: ${duplicates.join(', ')}`);
const refs = [...html.matchAll(/\b(?:src|href)=["']([^"'#?]+)["']/gi)]
  .map(m => m[1]).filter(x => !/^(?:https?:|data:|mailto:|tel:|javascript:|\/\/)/i.test(x));
const missing = refs.filter(ref => !fs.existsSync(path.resolve(root, ref)));
assert.deepStrictEqual(missing, [], `Missing local resources: ${missing.join(', ')}`);
assert(/<html[^>]+lang=["'][^"']+["']/i.test(html), 'Document language is missing');
assert(/name=["']viewport["']/i.test(html), 'Viewport meta is missing');
const importInput = html.match(/<input\b[^>]*id=["']import-file-input["'][^>]*>/i);
if (importInput) assert(/aria-label|aria-labelledby/i.test(importInput[0]) || /<label[^>]+for=["']import-file-input["']/i.test(html), 'Import input has no accessible name');
console.log(JSON.stringify({ duplicateIds: duplicates.length, missingResources: missing.length, referencedResources: refs.length, status: 'passed' }, null, 2));
