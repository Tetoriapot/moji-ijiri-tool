(function (root) {
  "use strict";

  const namespace = root.TextTools = root.TextTools || {};
  const backupFormat = "textTools.kanaSpell.backup";
  const schemaVersion = 1;
  const maximumBackupSize = 768 * 1024;
  const validTastes = Object.freeze(["standard", "english", "fantasy", "classic", "sf"]);

  function validText(value, maximumLength, asciiOnly) {
    return typeof value === "string" && value.length > 0 && value.length <= maximumLength &&
      !/[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/u.test(value) &&
      (!asciiOnly || /^[A-Za-z -]+$/.test(value));
  }

  function validTimestamp(value) {
    return Number.isFinite(value) && value >= 0 && value <= 8640000000000000;
  }

  function normalizeFavorite(item) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    if (!validText(item.kana, 100, false) || !validText(item.spelling, 180, true) || !validTimestamp(item.createdAt)) return null;
    return { kana: item.kana.normalize("NFC"), spelling: item.spelling, createdAt: item.createdAt };
  }

  function normalizeHistory(item) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    if (!validText(item.kana, 100, false) || !validTimestamp(item.createdAt)) return null;
    if (!validTastes.includes(item.taste) || !Number.isInteger(item.fidelity) || item.fidelity < 1 || item.fidelity > 5) return null;
    if (!Array.isArray(item.spellings) || item.spellings.length < 1 || item.spellings.length > 8) return null;
    const spellings = item.spellings.filter((value) => validText(value, 180, true));
    if (spellings.length !== item.spellings.length) return null;
    return {
      kana: item.kana.normalize("NFC"),
      spellings: spellings.slice(),
      taste: item.taste,
      fidelity: item.fidelity,
      createdAt: item.createdAt
    };
  }

  function createBackup(favorites, history, exportedAt) {
    return {
      format: backupFormat,
      schemaVersion,
      exportedAt: (exportedAt instanceof Date ? exportedAt : new Date()).toISOString(),
      favorites: (Array.isArray(favorites) ? favorites : []).map(normalizeFavorite).filter(Boolean).slice(0, 100),
      history: (Array.isArray(history) ? history : []).map(normalizeHistory).filter(Boolean).slice(0, 20)
    };
  }

  function serializeBackup(favorites, history, exportedAt) {
    return JSON.stringify(createBackup(favorites, history, exportedAt), null, 2);
  }

  function parseBackup(raw) {
    if (typeof raw !== "string" || raw.length === 0) throw new Error("INVALID_BACKUP");
    if (raw.length > maximumBackupSize) throw new Error("BACKUP_TOO_LARGE");
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (_error) {
      throw new Error("INVALID_JSON");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || parsed.format !== backupFormat || parsed.schemaVersion !== schemaVersion) {
      throw new Error("INVALID_BACKUP");
    }
    if (!Array.isArray(parsed.favorites) || !Array.isArray(parsed.history) || parsed.favorites.length > 500 || parsed.history.length > 200) {
      throw new Error("INVALID_BACKUP");
    }
    const favorites = parsed.favorites.map(normalizeFavorite).filter(Boolean);
    const history = parsed.history.map(normalizeHistory).filter(Boolean);
    return {
      favorites,
      history,
      rejected: (parsed.favorites.length - favorites.length) + (parsed.history.length - history.length)
    };
  }

  function mergeByKey(existing, imported, keyFor, limit, createId, idPrefix) {
    const records = new Map();
    const add = (item, importedItem) => {
      const key = keyFor(item);
      const current = records.get(key);
      if (current && current.createdAt >= item.createdAt) return;
      records.set(key, Object.assign({}, item, {
        id: !importedItem && typeof item.id === "string" && item.id ? item.id : createId(idPrefix)
      }));
    };
    (Array.isArray(existing) ? existing : []).forEach((item) => add(item, false));
    (Array.isArray(imported) ? imported : []).forEach((item) => add(item, true));
    return Array.from(records.values()).sort((left, right) => right.createdAt - left.createdAt).slice(0, limit);
  }

  function mergeCollections(existingFavorites, existingHistory, backup, createId) {
    if (typeof createId !== "function") throw new Error("ID_FACTORY_REQUIRED");
    const imported = backup && typeof backup === "object" ? backup : { favorites: [], history: [] };
    const favorites = mergeByKey(
      existingFavorites,
      imported.favorites,
      (item) => `${item.kana.normalize("NFC")}\u0000${item.spelling.normalize("NFC").toLowerCase()}`,
      100,
      createId,
      "fav"
    );
    const history = mergeByKey(
      existingHistory,
      imported.history,
      (item) => `${item.kana.normalize("NFC")}\u0000${item.taste}\u0000${item.fidelity}`,
      20,
      createId,
      "history"
    );
    return { favorites, history };
  }

  namespace.localData = Object.freeze({
    backupFormat,
    schemaVersion,
    maximumBackupSize,
    validTastes,
    normalizeFavorite,
    normalizeHistory,
    createBackup,
    serializeBackup,
    parseBackup,
    mergeCollections
  });
}(window));
