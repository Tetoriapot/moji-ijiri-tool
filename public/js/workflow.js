(function (root) {
  "use strict";

  const tools = root.TextTools = root.TextTools || {};
  const recipeFormat = "text-tools-glitch-recipe";
  const recipeSchemaVersion = 1;
  const maximumRecipeSize = 4 * 1024 * 1024;
  const maximumInteractiveCharacters = 1000000;
  const maximumOutputCharacters = 3000000;
  const maximumTransformCharacters = 500000;
  const maximumCreativeCharacters = 200000;
  const maximumBatchFiles = 50;
  const maximumBatchFileBytes = 2 * 1024 * 1024;
  const maximumBatchBytes = 20 * 1024 * 1024;
  const maximumBatchOutputBytes = 16 * 1024 * 1024;
  const maximumBatchCsvBytes = 16 * 1024 * 1024;
  const maximumSavedCandidates = 20;
  const maximumPresets = 12;
  const intensityValues = Object.freeze(["light", "medium", "heavy", "full"]);
  const scopeValues = Object.freeze(["all", "selection"]);
  const unsafeStoredText = /[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/u;

  function plainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function validLabel(value, maximumLength) {
    return typeof value === "string" && value.trim().length > 0 && value.length <= maximumLength && !unsafeStoredText.test(value);
  }

  function normalizeSeed(value) {
    if (typeof value !== "string") return "";
    const seed = value.trim();
    if (!seed || seed.length > 80 || unsafeStoredText.test(seed)) return "";
    return seed;
  }

  function utf8ByteLength(value) {
    return new TextEncoder().encode(String(value == null ? "" : value)).byteLength;
  }

  function seedToVariation(value) {
    const seed = normalizeSeed(value);
    if (!seed) return 0;
    let hash = 0x811c9dc5;
    for (let index = 0; index < seed.length; index += 1) {
      hash ^= seed.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0) || 1;
  }

  function fingerprintText(value) {
    const text = String(value == null ? "" : value);
    let first = 0x811c9dc5;
    let second = 0x9e3779b9;
    for (let index = 0; index < text.length; index += 1) {
      const code = text.charCodeAt(index);
      first ^= code;
      first = Math.imul(first, 0x01000193);
      second ^= code + index;
      second = Math.imul(second, 0x85ebca6b);
    }
    return `${text.length}:${(first >>> 0).toString(16).padStart(8, "0")}:${(second >>> 0).toString(16).padStart(8, "0")}`;
  }

  function normalizeSelection(text, start, end) {
    const length = String(text == null ? "" : text).length;
    const normalizedStart = Math.max(0, Math.min(length, Number.isInteger(start) ? start : 0));
    const normalizedEnd = Math.max(normalizedStart, Math.min(length, Number.isInteger(end) ? end : normalizedStart));
    return { start: normalizedStart, end: normalizedEnd };
  }

  function applyToSelection(text, start, end, transformer) {
    const source = String(text == null ? "" : text);
    if (typeof transformer !== "function") throw new TypeError("transformer must be a function");
    const selection = normalizeSelection(source, start, end);
    if (selection.end <= selection.start) {
      const transformed = String(transformer(source));
      return { text: transformed, transformed, selection: null, scope: "all" };
    }
    const selectedText = source.slice(selection.start, selection.end);
    const transformed = String(transformer(selectedText));
    return {
      text: source.slice(0, selection.start) + transformed + source.slice(selection.end),
      transformed,
      selection,
      scope: "selection"
    };
  }

  function pushHistory(state, entry, maximumItems) {
    const current = plainObject(state) && Array.isArray(state.items) ? state : { items: [], index: -1 };
    const limit = Math.max(2, Math.min(100, Number.isInteger(maximumItems) ? maximumItems : 30));
    const kept = current.items.slice(0, Math.max(-1, current.index) + 1);
    const previous = kept[kept.length - 1];
    if (previous && previous.output === entry.output && previous.signature === entry.signature) {
      return { items: kept, index: kept.length - 1 };
    }
    kept.push(entry);
    const items = kept.slice(-limit);
    return { items, index: items.length - 1 };
  }

  function moveHistory(state, delta) {
    if (!plainObject(state) || !Array.isArray(state.items) || !state.items.length) {
      return { state: { items: [], index: -1 }, entry: null };
    }
    const currentIndex = Number.isInteger(state.index) ? state.index : state.items.length - 1;
    const index = Math.max(0, Math.min(state.items.length - 1, currentIndex + (delta < 0 ? -1 : 1)));
    const next = { items: state.items.slice(), index };
    return { state: next, entry: next.items[index] || null };
  }

  function normalizeRecipeSelection(source, scope, selection) {
    if (scope !== "selection") return null;
    if (!plainObject(selection) || !Number.isInteger(selection.start) || !Number.isInteger(selection.end)) {
      throw new Error("INVALID_RECIPE");
    }
    const normalized = normalizeSelection(source, selection.start, selection.end);
    if (normalized.start !== selection.start || normalized.end !== selection.end || normalized.end <= normalized.start) {
      throw new Error("INVALID_RECIPE");
    }
    return normalized;
  }

  function normalizeRecipe(payload) {
    if (!plainObject(payload)) throw new Error("INVALID_RECIPE");
    const source = typeof payload.source === "string" ? payload.source : "";
    const output = typeof payload.output === "string" ? payload.output : "";
    if (!source || !output || source.length > maximumInteractiveCharacters || output.length > maximumOutputCharacters) throw new Error("INVALID_RECIPE");
    const settings = plainObject(payload.settings) ? payload.settings : {};
    const intensity = intensityValues.includes(settings.intensity) ? settings.intensity : "";
    const scope = scopeValues.includes(settings.scope) ? settings.scope : "";
    const seedMode = settings.seedMode === "fixed" || settings.seedMode === "variation" ? settings.seedMode : "";
    const seed = normalizeSeed(settings.seed);
    const variation = Number.isInteger(settings.variation) && settings.variation >= 0 && settings.variation <= 0xffffffff
      ? settings.variation
      : -1;
    if (!intensity || !scope || !seedMode || variation < 0 || (seedMode === "fixed" && !seed)) throw new Error("INVALID_RECIPE");
    const selection = normalizeRecipeSelection(source, scope, payload.selection);
    const presetName = payload.presetName == null || payload.presetName === ""
      ? ""
      : validLabel(payload.presetName, 40) ? payload.presetName.trim() : null;
    if (presetName === null) throw new Error("INVALID_RECIPE");
    return {
      source,
      output,
      selection,
      settings: { intensity, scope, seedMode, seed, variation },
      presetName
    };
  }

  function serializeRecipe(payload, date) {
    const normalized = normalizeRecipe(payload);
    if (utf8ByteLength(normalized.source) + utf8ByteLength(normalized.output) > maximumRecipeSize - 1024) {
      throw new Error("RECIPE_TOO_LARGE");
    }
    const serialized = JSON.stringify({
      format: recipeFormat,
      schemaVersion: recipeSchemaVersion,
      createdAt: (date instanceof Date ? date : new Date()).toISOString(),
      source: normalized.source,
      selection: normalized.selection,
      settings: normalized.settings,
      presetName: normalized.presetName,
      output: normalized.output
    }, null, 2);
    if (utf8ByteLength(serialized) > maximumRecipeSize) throw new Error("RECIPE_TOO_LARGE");
    return serialized;
  }

  function parseRecipe(raw) {
    const text = String(raw == null ? "" : raw);
    if (!text) throw new Error("INVALID_RECIPE");
    if (utf8ByteLength(text) > maximumRecipeSize) throw new Error("RECIPE_TOO_LARGE");
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (_error) {
      throw new Error("INVALID_RECIPE");
    }
    if (!plainObject(parsed) || parsed.format !== recipeFormat || parsed.schemaVersion !== recipeSchemaVersion) {
      throw new Error("INVALID_RECIPE");
    }
    return normalizeRecipe(parsed);
  }

  function normalizeSavedCandidate(item) {
    if (!plainObject(item) || !validLabel(item.id, 100) || typeof item.source !== "string" || !item.source || item.source.length > 200000) return null;
    if (typeof item.output !== "string" || !item.output || item.output.length > 200000) return null;
    if (!intensityValues.includes(item.intensity) || !scopeValues.includes(item.scope) || !Number.isFinite(item.createdAt) || item.createdAt < 0) return null;
    const seedMode = item.seedMode === "fixed" || item.seedMode === "variation" ? item.seedMode : "";
    const variation = Number.isInteger(item.variation) && item.variation >= 0 && item.variation <= 0xffffffff ? item.variation : -1;
    if (!seedMode || variation < 0) return null;
    const seed = normalizeSeed(item.seed);
    if (seedMode === "fixed" && !seed) return null;
    let selection = null;
    if (item.scope === "selection") {
      if (!plainObject(item.selection)) return null;
      selection = normalizeSelection(item.source, item.selection.start, item.selection.end);
      if (selection.end <= selection.start || selection.start !== item.selection.start || selection.end !== item.selection.end) return null;
    }
    const sourcePreview = typeof item.sourcePreview === "string" && item.sourcePreview.length <= 240 && !unsafeStoredText.test(item.sourcePreview)
      ? item.sourcePreview
      : "";
    const label = validLabel(item.label, 60) ? item.label.trim() : "保存した候補";
    return {
      id: item.id,
      label,
      source: item.source,
      output: item.output,
      sourcePreview,
      intensity: item.intensity,
      scope: item.scope,
      selection,
      seedMode,
      seed,
      variation,
      createdAt: item.createdAt
    };
  }

  function normalizePreset(item) {
    if (!plainObject(item) || !validLabel(item.id, 100) || !validLabel(item.name, 40) || !intensityValues.includes(item.intensity)) return null;
    if (!scopeValues.includes(item.scope) || typeof item.seedLocked !== "boolean" || !Number.isFinite(item.createdAt) || item.createdAt < 0) return null;
    const seed = normalizeSeed(item.seed);
    if (item.seedLocked && !seed) return null;
    return { id: item.id, name: item.name.trim(), intensity: item.intensity, scope: item.scope, seedLocked: item.seedLocked, seed, createdAt: item.createdAt };
  }

  function escapeCsvCell(value) {
    let text = String(value == null ? "" : value);
    if (/^[\s]*[=+\-@]/u.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  }

  function batchResultsToCsv(rows) {
    const header = ["ファイル名", "状態", "文字コード", "入力文字数", "出力文字数", "結果", "エラー"];
    const body = (Array.isArray(rows) ? rows : []).map((row) => [
      row.fileName,
      row.status,
      row.encoding,
      row.inputCharacters,
      row.outputCharacters,
      row.output,
      row.error
    ].map(escapeCsvCell).join(","));
    return `\ufeff${[header.map(escapeCsvCell).join(","), ...body].join("\r\n")}`;
  }

  function estimateCsvRowBytes(cells) {
    return cells.reduce((total, cell, index) => total + utf8ByteLength(escapeCsvCell(cell)) + (index ? 1 : 0), 0);
  }

  function estimateBatchCsvBytes(rows) {
    const header = ["ファイル名", "状態", "文字コード", "入力文字数", "出力文字数", "結果", "エラー"];
    const body = Array.isArray(rows) ? rows : [];
    return 3 + estimateCsvRowBytes(header) + body.reduce((total, row) => total + 2 + estimateCsvRowBytes([
      row.fileName,
      row.status,
      row.encoding,
      row.inputCharacters,
      row.outputCharacters,
      row.output,
      row.error
    ]), 0);
  }

  tools.workflow = Object.freeze({
    recipeFormat,
    recipeSchemaVersion,
    maximumRecipeSize,
    maximumInteractiveCharacters,
    maximumOutputCharacters,
    maximumTransformCharacters,
    maximumCreativeCharacters,
    maximumBatchFiles,
    maximumBatchFileBytes,
    maximumBatchBytes,
    maximumBatchOutputBytes,
    maximumBatchCsvBytes,
    maximumSavedCandidates,
    maximumPresets,
    intensityValues,
    scopeValues,
    normalizeSeed,
    utf8ByteLength,
    seedToVariation,
    fingerprintText,
    normalizeSelection,
    applyToSelection,
    pushHistory,
    moveHistory,
    serializeRecipe,
    parseRecipe,
    normalizeSavedCandidate,
    normalizePreset,
    escapeCsvCell,
    batchResultsToCsv,
    estimateBatchCsvBytes
  });
}(typeof window === "undefined" ? globalThis : window));
