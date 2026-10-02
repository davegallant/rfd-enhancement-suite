#!/usr/bin/env node
// Render script.js (the Tampermonkey userscript) from script.js.tmpl by
// inlining redirects.json and js/stripRedirect.js, the single sources of
// truth. Run with: npm run build:userscript
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = name => readFileSync(join(root, name), 'utf8');
// UTC date, matching the @version convention the template previously used
// with Go's time formatting.
const today = new Date().toISOString().slice(0, 10);
const replacements = {
  '{{ (time.Now).Format "2006-01-02" }}': today,
  '{{ file.Read "redirects.json" }}': read('redirects.json'),
  '{{ file.Read "js/stripRedirect.js" }}': read('js/stripRedirect.js'),
};
let output = read('script.js.tmpl');
for (const [placeholder, value] of Object.entries(replacements)) {
  if (!output.includes(placeholder)) throw new Error(`Placeholder missing from template: ${placeholder}`);
  // Function replacer: the inlined sources contain `$` sequences that must
  // not be treated as replacement patterns.
  output = output.replaceAll(placeholder, () => value);
}
if (/{{.*?}}/.test(output)) throw new Error('Unrendered template placeholder remains in output');
writeFileSync(join(root, 'script.js'), output);
console.log(`Wrote script.js (@version ${today})`);
