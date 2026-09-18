import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCatalog, splitGraphemes } from '../reference/core.mjs';
const load = async name => JSON.parse(await readFile(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
const [styles, decorations, categories] = await Promise.all(['styles','decorations','categories'].map(load));
const ascii = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const forbidden = /[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}\p{M}]/u;
const clean = (text, multiline = false) => {
  assert.equal(typeof text, 'string');
  assert.ok(!forbidden.test(multiline ? text.replaceAll('\n','') : text), `Forbidden character: ${JSON.stringify(text)}`);
};
assert.equal(styles.length, 16);
assert.equal(decorations.length, 200);
assert.equal(categories.length, 10);
createCatalog({styles, decorations, categories});
for (const item of [...styles, ...decorations, ...categories]) {
  assert.match(item.id, /^[a-z][a-z0-9-]*$/u);
  assert.ok(item.id.length <= 64);
  assert.ok(item.label && item.label.length <= 80);
  clean(item.label);
  assert.ok(Array.isArray(item.tags) && item.tags.length > 0);
  assert.equal(new Set(item.tags).size, item.tags.length);
  item.tags.forEach(cleanTag => clean(cleanTag));
}
const signatures = new Set();
for (const s of styles) {
  assert.deepEqual(Object.keys(s.map).sort(), Array.from(ascii).sort());
  for (const [source, target] of Object.entries(s.map)) {
    assert.equal(Array.from(target).length, 1, `${s.id}:${source}`);
    clean(target);
    if (!s.approximate) assert.equal(target.normalize('NFKC'), source, `Wrong semantic mapping: ${s.id}:${source}`);
    if (/^[0-9]$/u.test(source) && s.digitMode === 'preserve') assert.equal(target, source);
  }
  const signature = Array.from(ascii).map(c => s.map[c]).join('');
  assert.ok(!signatures.has(signature), `Duplicate style: ${s.id}`);
  signatures.add(signature);
}
const seen = new Set();
const counts = {snippet:0, wrap:0, template:0};
for (const d of decorations) {
  assert.ok(Object.hasOwn(counts, d.kind));
  counts[d.kind]++;
  let raw;
  if (d.kind === 'snippet') {
    assert.ok(d.text && !('prefix' in d) && !('suffix' in d) && !('template' in d));
    raw = d.text;
  } else if (d.kind === 'wrap') {
    assert.ok(d.prefix && d.suffix && !('text' in d) && !('template' in d));
    raw = d.prefix + '{{text}}' + d.suffix;
  } else {
    assert.ok(d.template && !('prefix' in d) && !('suffix' in d) && !('text' in d));
    assert.equal(d.template.split('{{text}}').length, 2);
    raw = d.template;
  }
  clean(raw, d.kind === 'template');
  assert.ok(splitGraphemes(raw).length <= 100);
  const key = `${d.kind}:${raw}`;
  assert.ok(!seen.has(key), `Duplicate preset: ${d.id}`);
  seen.add(key);
}
assert.deepEqual(counts, {snippet:120, wrap:60, template:20});
for (const c of categories) {
  for (const [kind, expected] of [['snippet',12],['wrap',6],['template',2]]) {
    assert.equal(decorations.filter(d => d.categoryId === c.id && d.kind === kind).length, expected, `${c.id}:${kind}`);
  }
}
console.log(JSON.stringify({result:'PASS', styles:styles.length, decorations:decorations.length, categories:categories.length, counts,
  checks:['unique IDs','unique outputs per kind','all 62 mappings','NFKC mapping semantics except explicit approximation','no unassigned/private/control/combining seed characters','template placeholders','category counts']}, null, 2));

