/** Framework-neutral, no DOM, no persistence, no network. */
export const LIMITS = Object.freeze({ inputGraphemes: 500, inputUtf16: 20000, outputGraphemes: 2000 });

function ensureString(value) {
  if (typeof value !== 'string') throw new TypeError('Expected a string');
}

export function splitGraphemes(text) {
  ensureString(text);
  if (typeof Intl?.Segmenter !== 'function') {
    throw new Error('GRAPHEME_SEGMENTER_UNAVAILABLE');
  }
  return Array.from(new Intl.Segmenter('ja', { granularity: 'grapheme' }).segment(text), s => s.segment);
}

export function measureText(text) {
  ensureString(text);
  return {
    graphemes: typeof Intl?.Segmenter === 'function' ? splitGraphemes(text).length : null,
    codePoints: Array.from(text).length,
    utf16: text.length,
  };
}

function assertBound(text, graphemeLimit) {
  ensureString(text);
  if (text.length > LIMITS.inputUtf16) throw new RangeError('UTF16_LIMIT_EXCEEDED');
  if (splitGraphemes(text).length > graphemeLimit) throw new RangeError('GRAPHEME_LIMIT_EXCEEDED');
}

export function inspectText(text) {
  ensureString(text);
  return {
    hasBidiControls: /[\u202A-\u202E\u2066-\u2069]/u.test(text),
    hasInvisibleControls: /[\u200B\u200E\u200F\u2060\uFEFF]/u.test(text),
    hasOtherControls: /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u.test(text),
  };
}

export function convertText(text, style = null) {
  assertBound(text, LIMITS.inputGraphemes);
  if (!style) return text;
  if (!style.map || typeof style.map !== 'object') throw new TypeError('Invalid style');
  return splitGraphemes(text).map(grapheme => {
    // Do not transform the Latin base inside an accented/variation-selector cluster.
    if (!/^[A-Za-z0-9]$/u.test(grapheme)) return grapheme;
    const value = style.map[grapheme];
    if (typeof value !== 'string') throw new TypeError('Incomplete style map');
    return value;
  }).join('');
}

export function decorateText(text, decoration = null) {
  assertBound(text, LIMITS.outputGraphemes);
  if (!decoration) return text;
  let value;
  if (decoration.kind === 'wrap') {
    ensureString(decoration.prefix);
    ensureString(decoration.suffix);
    value = decoration.prefix + text + decoration.suffix;
  } else if (decoration.kind === 'template') {
    ensureString(decoration.template);
    const token = '{{text}}';
    const pieces = decoration.template.split(token);
    if (pieces.length !== 2) throw new Error('Template must contain one text placeholder');
    // Concatenation: user strings such as "$&" or "{{text}}" stay literal.
    value = pieces[0] + text + pieces[1];
  } else {
    throw new TypeError('A snippet is inserted or copied, not used as a wrapper');
  }
  assertBound(value, LIMITS.outputGraphemes);
  return value;
}

export function composeText(sourceText, { style = null, decoration = null } = {}) {
  return decorateText(convertText(sourceText, style), decoration);
}

/** Textarea selection offsets are UTF-16, not grapheme indices. */
export function replaceSelection(text, insertion, start = text.length, end = start) {
  ensureString(text);
  ensureString(insertion);
  if (text.length > LIMITS.inputUtf16 || insertion.length > LIMITS.inputUtf16) {
    throw new RangeError('UTF16_LIMIT_EXCEEDED');
  }
  if (!Number.isInteger(start) || !Number.isInteger(end)) throw new TypeError('Offsets must be integers');
  let a = Math.max(0, Math.min(text.length, Math.min(start, end)));
  let b = Math.max(0, Math.min(text.length, Math.max(start, end)));
  const boundaries = [0];
  for (const g of splitGraphemes(text)) boundaries.push(boundaries.at(-1) + g.length);
  const floor = n => boundaries.findLast(x => x <= n);
  const ceil = n => boundaries.find(x => x >= n);
  if (a === b) a = b = floor(a);
  else { a = floor(a); b = ceil(b); }
  const value = text.slice(0, a) + insertion + text.slice(b);
  assertBound(value, LIMITS.inputGraphemes);
  const cursor = a + insertion.length;
  return { text: value, selectionStart: cursor, selectionEnd: cursor, replacedStart: a, replacedEnd: b };
}

export function normalizeSearch(value) {
  ensureString(value);
  return value.normalize('NFKC').toLowerCase().trim();
}

export function filterDecorations(decorations, { query = '', categoryId = null, kind = null, favoriteIds = null } = {}) {
  ensureString(query);
  if (query.length > 200) throw new RangeError('SEARCH_QUERY_TOO_LONG');
  const tokens = normalizeSearch(query).split(/\s+/u).filter(Boolean);
  const favoriteSet = favoriteIds === null ? null : new Set(favoriteIds);
  return decorations.filter(d => {
    if (categoryId && d.categoryId !== categoryId) return false;
    if (kind && d.kind !== kind) return false;
    if (favoriteSet && !favoriteSet.has(`decoration:${d.id}`)) return false;
    const haystack = normalizeSearch([d.label, ...d.tags, d.text || '', d.prefix || '', d.suffix || '', d.template || ''].join(' '));
    return tokens.every(token => haystack.includes(token));
  });
}

export function createCatalog({ styles, decorations, categories }) {
  const byId = list => {
    if (!Array.isArray(list)) throw new TypeError('Expected catalog array');
    const map = new Map();
    for (const item of list) {
      if (!item || typeof item.id !== 'string' || map.has(item.id)) throw new Error('Invalid or duplicate ID');
      map.set(item.id, item);
    }
    return map;
  };
  const styleMap = byId(styles);
  const decorationMap = byId(decorations);
  const categoryMap = byId(categories);
  for (const d of decorations) if (!categoryMap.has(d.categoryId)) throw new Error('Unknown category');
  return {
    getStyle(id) {
      if (id === null) return null;
      if (!styleMap.has(id)) throw new Error('Unknown style');
      return styleMap.get(id);
    },
    getDecoration(id) {
      if (id === null) return null;
      if (!decorationMap.has(id)) throw new Error('Unknown decoration');
      return decorationMap.get(id);
    },
    compose(source, { styleId = null, decorationId = null } = {}) {
      return composeText(source, { style: this.getStyle(styleId), decoration: this.getDecoration(decorationId) });
    },
  };
}

/** Pure parser only. The host app owns localStorage try/catch and write behavior. */
export function parsePreferences(raw, validFavoriteIds) {
  const defaults = () => ({ version: 1, favorites: [], settings: { density: 'comfortable' } });
  if (raw === null) return { status: 'empty', value: defaults() };
  try {
    if (typeof raw !== 'string' || raw.length > 50000) throw new Error('Bad serialized value');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.version === 'number' && parsed.version > 1) {
      return { status: 'future-version', value: defaults() };
    }
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.favorites)) throw new Error('Bad preferences');
    const valid = new Set(validFavoriteIds);
    const favorites = [...new Set(parsed.favorites.filter(id => typeof id === 'string' && valid.has(id)))].slice(0, 300);
    const density = parsed.settings?.density === 'compact' ? 'compact' : 'comfortable';
    return { status: 'ok', value: { version: 1, favorites, settings: { density } } };
  } catch {
    return { status: 'invalid', value: defaults() };
  }
}

