import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { convertText, composeText, decorateText, replaceSelection, measureText, inspectText, filterDecorations, parsePreferences, createCatalog } from '../reference/core.mjs';
const load = async n => JSON.parse(await readFile(new URL(`../data/${n}.json`, import.meta.url), 'utf8'));
const [styles, decorations, categories] = await Promise.all(['styles','decorations','categories'].map(load));
const catalog = createCatalog({styles, decorations, categories});
const style = id => catalog.getStyle(id);
const decoration = id => catalog.getDecoration(id);
const ascii = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

for (const s of styles) {
  test(`all characters: ${s.id}`, () => {
    const result = convertText(ascii, s);
    assert.equal(Array.from(result).length, 62);
    if (!s.approximate) assert.equal(result.normalize('NFKC'), ascii);
    assert.equal(convertText('あ한😀!? \n', s), 'あ한😀!? \n');
  });
}
test('script exceptions', () => assert.equal(convertText('BEFHILMR ego', style('script')), 'ℬℰℱℋℐℒℳℛ ℯℊℴ'));
test('fraktur exceptions', () => assert.equal(convertText('CHIRZ', style('fraktur')), 'ℭℌℑℜℨ'));
test('double struck exceptions', () => assert.equal(convertText('CHNPQRZ', style('double-struck')), 'ℂℍℕℙℚℝℤ'));
test('italic h exception', () => assert.equal(convertText('h', style('serif-italic')), 'ℎ'));
test('Tetoria bold script fixture', () => assert.equal(convertText('Tetoria', style('bold-script')), '𝓣𝓮𝓽𝓸𝓻𝓲𝓪'));
test('small caps is explicitly approximate', () => {
  assert.equal(style('small-caps').approximate, true);
  assert.equal(convertText('Qx', style('small-caps')), 'qx');
});
test('digits without a matching style stay ASCII', () => assert.equal(convertText('012', style('script')), '012'));
test('circle includes zero', () => assert.equal(convertText('Az09', style('circled')), 'Ⓐⓩ⓪⑨'));
test('fullwidth changes only ASCII alphanumeric', () => assert.equal(convertText('A! a。', style('fullwidth')), 'Ａ! ａ。'));
test('empty source stays empty', () => assert.equal(convertText('', style('script')), ''));
test('no style keeps exact source', () => assert.equal(convertText('Ａ ℬ é e\u0301'), 'Ａ ℬ é e\u0301'));
test('already stylized text is preserved', () => assert.equal(convertText('𝓣𝓮𝓽𝓸𝓻𝓲𝓪', style('script')), '𝓣𝓮𝓽𝓸𝓻𝓲𝓪'));
test('accented clusters and variation selectors stay intact', () => assert.equal(convertText('ée\u0301A\uFE0FZ', style('serif-bold')), 'ée\u0301A\uFE0F𝐙'));
test('emoji ZWJ and skin tone stay intact', () => assert.equal(convertText('👩🏽‍💻 A', style('script')), '👩🏽‍💻 𝒜'));
test('no arbitrary normalization', () => assert.equal(convertText('Ａ①ﬀ', style('script')), 'Ａ①ﬀ'));
test('500 graphemes succeeds', () => assert.equal(measureText(convertText('😀'.repeat(500), style('script'))).graphemes, 500));
test('501 graphemes throws rather than truncates', () => assert.throws(() => convertText('a'.repeat(501), style('script')), /GRAPHEME/));
test('huge combining cluster has UTF16 defense', () => assert.throws(() => convertText('a'+'\u0301'.repeat(20001)), /UTF16/));
test('counts distinguish graphemes, code points and UTF16', () => assert.deepEqual(measureText('👩🏽‍💻'), {graphemes:1, codePoints:4, utf16:7}));
test('compose style before wrapper', () => assert.equal(catalog.compose('Tetoria', {styleId:'bold-script',decorationId:'wrap-star-001'}), '✦ 𝓣𝓮𝓽𝓸𝓻𝓲𝓪 ✦'));
test('switching wrappers does not accumulate', () => {
  catalog.compose('A', {decorationId:'wrap-star-001'});
  assert.equal(catalog.compose('A', {decorationId:'wrap-heart-001'}), '♡ A ♡');
});
test('template replacement is literal, not regex replacement', () => assert.equal(decorateText('$& {{text}}', {kind:'template',template:'[{{text}}]'}), '[$& {{text}}]'));
test('template must have exactly one placeholder', () => {
  assert.throws(() => decorateText('A', {kind:'template',template:'{{text}}{{text}}'}));
  assert.throws(() => decorateText('A', {kind:'template',template:'none'}));
});
test('output limit is enforced', () => assert.throws(() => decorateText('a'.repeat(1999), {kind:'wrap',prefix:'xx',suffix:'xx'}), /GRAPHEME/));
test('snippet is not a wrapper', () => assert.throws(() => composeText('A', {decoration:decoration('star-001')}), /snippet/));
test('literal HTML remains text', () => {
  const s = '<img src=x onerror=alert(1)>';
  assert.equal(catalog.compose(s, {decorationId:'wrap-geometry-001'}), `[${s}]`);
});
test('append and replace selections', () => {
  assert.equal(replaceSelection('abc','✦').text, 'abc✦');
  assert.equal(replaceSelection('abc','✦',1,2).text, 'a✦c');
});
test('UTF16 cursor after supplementary character', () => {
  const r = replaceSelection('AB','😀',1,1);
  assert.equal(r.text, 'A😀B');
  assert.equal(r.selectionStart, 3);
});
test('collapsed cursor inside emoji snaps before cluster', () => assert.equal(replaceSelection('A👩🏽‍💻B','✦',3,3).text, 'A✦👩🏽‍💻B'));
test('selection intersecting emoji expands to whole cluster', () => assert.equal(replaceSelection('A👩🏽‍💻B','✦',2,4).text, 'A✦B'));
test('selection intersecting combining mark expands', () => assert.equal(replaceSelection('e\u0301x','✦',1,2).text, '✦x'));
test('offset clamps and integer validation', () => {
  assert.equal(replaceSelection('abc','x',-10,100).text, 'x');
  assert.throws(() => replaceSelection('abc','x',1.1,2), /integers/);
});
test('insertion cannot exceed cap', () => assert.throws(() => replaceSelection('a'.repeat(500),'b'), /GRAPHEME/));
test('control detection does not delete content', () => {
  const s = 'A\u202EB\u200B';
  assert.equal(inspectText(s).hasBidiControls, true);
  assert.equal(inspectText(s).hasInvisibleControls, true);
  assert.equal(convertText(s), s);
  assert.equal(inspectText('👩🏽‍💻').hasInvisibleControls, false);
});
test('Japanese, English and Korean tags work', () => {
  for (const q of ['ほし','star','별']) assert.ok(filterDecorations(decorations,{query:q}).length > 0);
});
test('search normalized only on search strings and uses AND', () => {
  assert.equal(filterDecorations(decorations,{query:'ＳＴＡＲ 名前', kind:'wrap'}).length,6);
  assert.equal(filterDecorations(decorations,{query:'missing-impossible'}).length,0);
});
test('favorite filter uses namespaced IDs', () => assert.deepEqual(filterDecorations(decorations,{favoriteIds:['decoration:star-001']}).map(d=>d.id),['star-001']));
test('blank favorites match nothing, null matches all', () => {
  assert.equal(filterDecorations(decorations,{favoriteIds:[]}).length,0);
  assert.equal(filterDecorations(decorations).length,200);
});
test('unknown IDs and duplicate IDs are errors', () => {
  assert.throws(() => catalog.getStyle('missing'));
  assert.throws(() => catalog.getDecoration('missing'));
  assert.throws(() => createCatalog({styles:[styles[0],styles[0]],decorations,categories}));
});
test('preference corruption and future versions are preserved by caller contract', () => {
  assert.equal(parsePreferences('{bad',[]).status,'invalid');
  assert.equal(parsePreferences('{"version":2}',[]).status,'future-version');
  assert.equal(parsePreferences(null,[]).status,'empty');
});
test('preferences retain only IDs and approved settings, no text', () => {
  const raw = JSON.stringify({version:1,favorites:['style:script','style:script','bad'],sourceText:'secret',settings:{density:'compact',text:'secret'}});
  assert.deepEqual(parsePreferences(raw,['style:script']),{status:'ok',value:{version:1,favorites:['style:script'],settings:{density:'compact'}}});
});
test('all 80 wrappers and templates render literal source once', () => {
  for (const d of decorations.filter(d=>d.kind!=='snippet')) {
    const result = decorateText('UNIQUE_SOURCE', d);
    assert.equal(result.split('UNIQUE_SOURCE').length,2,d.id);
    assert.ok(!result.includes('{{text}}'),d.id);
  }
});

