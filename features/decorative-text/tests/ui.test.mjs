// Event-level UI contracts in a small in-memory DOM. These do not certify native IME or layout.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
const candidates = ['../../../js/decorative.js', '../../../public/js/decorative.js'].map(p => new URL(p, import.meta.url));
const bundle = readFileSync(candidates.find(p => existsSync(p)), 'utf8');
const key = 'text-tool:decorative-text:v1';

function setup({raw = null, storageError = false, clipboard, segmenter = true} = {}) {
  const writes = [], notices = [], copied = [];
  const stored = new Map([['existing.favorite', 'KEEP']]);
  if (raw !== null) stored.set(key, raw);
  const document = {activeElement: null};
  class Node {
    constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {}; this.attrs = {}; this.listeners = {}; this.className = ''; this.value = ''; this.hidden = false; this.disabled = false; this.selectionStart = 0; this.selectionEnd = 0; this._text = ''; }
    get textContent() { return this._text + this.children.map(n => n.textContent).join(''); }
    set textContent(v) { this.replaceChildren(); this._text = String(v); }
    get isConnected() { return this === host || Boolean(this.parent?.isConnected); }
    get classList() {
      const toggle = (name, on) => { const s = new Set(this.className.split(' ')); on ? s.add(name) : s.delete(name); this.className = [...s].join(' '); };
      return {toggle, add: name => toggle(name, true), remove: name => toggle(name, false)};
    }
    append(...nodes) { for (const n of nodes) { n.parent = this; this.children.push(n); } }
    replaceChildren(...nodes) { this.children.forEach(n => { n.parent = null; }); this.children = []; this._text = ''; this.append(...nodes); }
    setAttribute(k,v) { this.attrs[k] = v; }
    getAttribute(k) { return this.attrs[k] ?? null; }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    emit(type, event = {}) { for (const fn of this.listeners[type] || []) fn({target:this, preventDefault(){}, ...event}); }
    click() { if (!this.disabled) this.emit('click'); }
    focus() { document.activeElement = this; this.emit('focus'); }
    select() { this.selectionStart = 0; this.selectionEnd = this.value.length; }
    setSelectionRange(a,b) { this.selectionStart = a; this.selectionEnd = b; }
    contains(node) { return this === node || this.children.some(n => n.contains(node)); }
    querySelectorAll(selector) {
      const matches = node => selector.split(',').some(s => {
        s = s.trim();
        if (s === '[data-focus-key]') return Boolean(node.dataset.focusKey);
        if (s.startsWith('#')) return node.id === s.slice(1);
        if (s.startsWith('.')) return node.className.split(' ').includes(s.slice(1));
        return node.tagName === s;
      });
      return this.children.flatMap(n => [...(matches(n) ? [n] : []), ...n.querySelectorAll(selector)]);
    }
    querySelector(s) { return this.querySelectorAll(s)[0] || null; }
    showModal() { this.open = true; }
    close() { this.open = false; this.emit('close'); }
  }
  document.createElement = tag => new Node(tag);
  const host = new Node('main');
  const listeners = {};
  const environment = {document, Intl: segmenter ? Intl : {Segmenter: undefined}, isSecureContext: true,
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    navigator: {clipboard: {writeText: text => { copied.push(text); return clipboard ? clipboard(text) : Promise.resolve(); }}},
    localStorage: {getItem(k) { if (storageError) throw Error('denied'); return stored.get(k) ?? null; }, setItem(k,v) { if (storageError) throw Error('denied'); writes.push([k,v]); stored.set(k,v); }} };
  environment.window = environment;
  vm.runInNewContext(bundle, environment);
  const ui = environment.TextTools.createDecorativeUI(host, {onToast: s => notices.push(s), onBack: () => {}});
  const byId = id => host.querySelector('#' + id);
  const all = () => host.querySelectorAll('button');
  const button = label => all().find(n => n.getAttribute('aria-label') === label || n.textContent === label);
  const input = byId('decoSource');
  const fill = text => { input.value = text; input.emit('input'); };
  const tab = id => byId('deco-tab-' + id).click();
  const emitWindow = (type,event={}) => (listeners[type] || []).forEach(fn=>fn(event));
  return {host, document, ui, byId, all, button, input, fill, tab, stored, writes, notices, copied, emitWindow, domain: environment.TextTools.decorativeDomain};
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('shipped bundle preserves every supplied map and preset exactly', () => {
  const app = setup();
  for (const name of ['styles','decorations','categories']) {
    const original = JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
    assert.deepEqual(JSON.parse(JSON.stringify(app.domain.data[name])), original);
  }
});
test('empty examples cannot be copied or used; explicit example enables all 16 styles', () => {
  const a = setup();
  assert.equal(a.host.querySelectorAll('.deco-card').length, 16);
  assert.equal(a.host.querySelectorAll('.deco-card')[1].querySelector('.deco-preview').textContent, '𝓛𝓲𝓹𝓼𝓾𝓶');
  assert.equal(a.button('太筆記体の結果をコピー').disabled, true);
  assert.equal(a.button('太筆記体を名前装飾で使う').disabled, true);
  a.button('例を入力').click();
  assert.equal(a.input.value, 'Lipsum');
  assert.equal(a.button('太筆記体の結果をコピー').disabled, false);
});
test('empty name decoration samples consistently use Lipsum without changing source', () => {
  const a = setup(); a.tab('names');
  assert.equal(a.byId('decoResult').textContent, 'Lipsum');
  assert.equal(a.host.querySelectorAll('.deco-card')[0].querySelector('.deco-preview').textContent, '✦ Lipsum ✦');
  assert.equal(a.input.value, '');
  assert.equal(a.button('完成文をコピー').disabled, true);
});
test('source -> style -> wrapper, reset and template preserve literal source', () => {
  const a = setup(); a.fill('Tetoria'); a.button('太筆記体を名前装飾で使う').click();
  a.button('四つ星で囲むを名前装飾で使う').click();
  assert.equal(a.byId('decoResult').textContent, '✦ 𝓣𝓮𝓽𝓸𝓻𝓲𝓪 ✦');
  a.button('白ハートで囲むを名前装飾で使う').click();
  assert.equal(a.byId('decoResult').textContent, '♡ 𝓣𝓮𝓽𝓸𝓻𝓲𝓪 ♡');
  a.button('通常文字に戻す').click(); a.button('飾りなし・囲みを外す').click();
  assert.equal(a.byId('decoResult').textContent, 'Tetoria');
  assert.equal(a.input.value, 'Tetoria'); assert.equal(a.writes.length, 0);
});
test('UTF16 selections snap to graphemes; insertion is once, no copy, one-step undo', () => {
  const a = setup(); a.fill('A👩🏽‍💻B'); a.input.focus(); a.input.setSelectionRange(2,4); a.input.emit('select'); a.tab('symbols');
  a.button('四つ星を原文に追加').click();
  assert.equal(a.input.value, 'A✦B'); assert.equal(a.input.selectionStart, 2);
  assert.equal(a.copied.length, 0); a.button('追加前に戻す').click();
  assert.equal(a.input.value, 'A👩🏽‍💻B'); assert.equal(a.input.selectionStart, 2);
  assert.equal(a.button('追加前に戻す').disabled, true);
});
test('IME composition does not recompute, save or move focus; commit is applied once', () => {
  const a = setup(); a.fill('A'); const cards = a.host.querySelector('.deco-cards'); const before = cards.children[0];
  a.input.focus(); a.input.emit('compositionstart'); a.input.value = 'あい'; a.input.emit('input', {isComposing:true});
  assert.equal(cards.children[0], before); assert.equal(a.document.activeElement, a.input); assert.equal(a.writes.length, 0);
  a.input.emit('compositionend'); const committed = cards.children[0]; a.input.emit('input');
  assert.equal(cards.children[0], committed); assert.equal(a.byId('decoInputCount').textContent.includes('見た目 2文字'), true);
  assert.equal(a.button('筆記体の結果をコピー').disabled, false);
});
test('500 accepted, 501 and UTF16 guard preserved, transformations disabled', () => {
  const a = setup(); a.fill('😀'.repeat(500)); assert.equal(a.button('筆記体の結果をコピー').disabled, false);
  a.fill('😀'.repeat(501)); assert.equal(a.input.value.length,1002); assert.equal(a.button('筆記体の結果をコピー').disabled, true);
  assert.match(a.byId('decoInputError').textContent,/500/);
  a.fill('A'+'\u0301'.repeat(20001)); assert.equal(a.input.value.length,20002); assert.match(a.byId('decoInputError').textContent,/20,000/);
  a.fill('A'+'\u0301'.repeat(19999)); a.tab('names');
  assert.equal(a.button('四つ星で囲むを名前装飾で使う').disabled,true);
  assert.equal(a.input.value.length,20000);
});
test('search AND/category, zero reset, first 60 + more then filter reset', () => {
  const a = setup(); a.fill('KEEP'); a.tab('symbols');
  assert.equal(a.host.querySelectorAll('.deco-card').length,60);
  a.button('もっと表示（残り60件）').click(); assert.equal(a.host.querySelectorAll('.deco-card').length,120);
  const search = a.byId('decoSearch');
  for (const word of ['ほし','STAR','별']) { search.value = word; search.emit('input'); assert.equal(a.host.querySelectorAll('.deco-card').length,12); }
  search.value = 'missing'; search.emit('input'); assert.equal(a.host.querySelectorAll('.deco-card').length,0);
  a.button('条件をリセット').click(); assert.equal(a.host.querySelectorAll('.deco-card').length,60); assert.equal(a.input.value,'KEEP');
});
test('favorites persist only IDs/density, never source, and reload source is empty', () => {
  const a = setup(); a.fill('PRIVATE_SOURCE'); a.button('筆記体のお気に入りを登録または解除').click();
  const raw = a.stored.get(key); assert.doesNotMatch(raw,/PRIVATE_SOURCE/);
  assert.deepEqual(JSON.parse(raw), {version:1,favorites:['style:script'],settings:{density:'comfortable'}});
  assert.equal(a.stored.get('existing.favorite'),'KEEP');
  const b = setup({raw}); b.tab('favorites'); assert.equal(b.host.querySelectorAll('.deco-card').length,1); assert.equal(b.input.value,'');
});
test('invalid/future storage is not overwritten; unavailable storage remains usable', () => {
  for (const config of [{raw:'broken'},{raw:'{"version":2}'},{storageError:true}]) {
    const a = setup(config); a.fill('Tetoria'); a.button('筆記体のお気に入りを登録または解除').click(); a.tab('favorites');
    assert.equal(a.writes.length,0); assert.equal(a.host.querySelectorAll('.deco-card').length,1); assert.ok(a.byId('decoStorageStatus').textContent);
    if (config.raw) assert.equal(a.stored.get(key),config.raw);
  }
});
test('explicit reset removes favorites from memory without touching source; storage reload waits for IME', () => {
  const a = setup({raw:'{"version":1,"favorites":["style:script"],"settings":{"density":"compact"}}'});
  a.fill('KEEP'); a.tab('favorites'); assert.equal(a.host.querySelectorAll('.deco-card').length,1);
  a.input.emit('compositionstart'); a.stored.delete(key); a.emitWindow('storage',{key});
  assert.equal(a.host.querySelectorAll('.deco-card').length,1);
  a.input.emit('compositionend'); assert.equal(a.host.querySelectorAll('.deco-card').length,0); assert.equal(a.input.value,'KEEP');
  a.emitWindow('texttools:decorative-reset'); assert.equal(a.writes.length,0); assert.equal(a.input.value,'KEEP');
});
test('copy resolves exact plain text; rejection selects manual text and returns focus', async () => {
  const a = setup({clipboard: () => Promise.reject(Error('denied'))}); a.fill('Tetoria');
  const button = a.button('太筆記体の結果をコピー'); button.focus(); button.click(); await settle();
  assert.equal(a.notices.includes('コピーしました'),false); assert.equal(a.copied[0],'𝓣𝓮𝓽𝓸𝓻𝓲𝓪');
  const manual = a.byId('decoManualText'); assert.equal(manual.value,'𝓣𝓮𝓽𝓸𝓻𝓲𝓪'); assert.equal(manual.selectionEnd,manual.value.length);
  a.button('閉じる').click(); assert.equal(a.document.activeElement,button); assert.equal(manual.value,'');
});
test('pending copy suppresses repeated click and stale completion', async () => {
  let resolve; const a = setup({clipboard: () => new Promise(r=>{resolve=r;})}); a.fill('A');
  const copy = a.button('筆記体の結果をコピー'); copy.click(); copy.click(); assert.equal(a.copied.length,1);
  a.fill('B'); resolve(); await settle(); assert.equal(a.notices.includes('コピーしました'),false);
});
test('snippet copies only symbol; original copy bypasses decorations', async () => {
  const a = setup(); a.fill('Tetoria'); a.tab('symbols'); a.button('四つ星をコピー').click(); await settle();
  assert.equal(a.copied[0],'✦'); assert.equal(a.notices.at(-1),'コピーしました');
  a.button('原文をコピー').click(); await settle(); assert.equal(a.copied[1],'Tetoria');
});
test('missing Segmenter disables transforms, still permits original copy', async () => {
  const a = setup({segmenter:false}); a.fill('A😀');
  assert.match(a.byId('decoInputError').textContent,/区切り/); assert.equal(a.button('筆記体の結果をコピー').disabled,true);
  a.button('原文をコピー').click(); await settle(); assert.equal(a.copied[0],'A😀');
});
test('HTML stays literal, bidi controls warned and preserved', () => {
  const a = setup(); a.fill('<img src=x onerror=alert(1)>\u202E'); a.tab('names');
  assert.equal(a.byId('decoResult').textContent, a.input.value); assert.match(a.byId('decoControlWarning').textContent,/制御文字/);
  assert.equal(a.host.querySelectorAll('img').length,0);
});
test('500-character/16-style update and 60-card rendering measured (in-memory DOM only)', t => {
  const a = setup(); let start=performance.now(); a.fill('A'.repeat(500)); const styleMs=performance.now()-start;
  start=performance.now(); a.tab('symbols'); const cardMs=performance.now()-start;
  start=performance.now(); a.byId('decoSearch').value='star'; a.byId('decoSearch').emit('input'); const searchMs=performance.now()-start;
  t.diagnostic(JSON.stringify({styleMs,cardMs,searchMs}));
  assert.equal(a.host.querySelectorAll('.deco-card').length,12);
});
