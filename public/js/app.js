(function (root) {
  "use strict";

  const tools = root.TextTools;
  const dependenciesReady = tools && tools.count && tools.unicode && tools.mojibake && tools.mirror &&
    tools.kanaSpell && tools.romanKana && tools.encoding && tools.localData && tools.workflow;
  if (!dependenciesReady) {
    document.documentElement.dataset.textToolsState = "failed";
    const startupStatus = document.getElementById("startupStatus");
    if (startupStatus) startupStatus.hidden = false;
    return;
  }
  const storageKey = "textTools.settings.v1";
  const inputDraftKey = "textTools.inputDraft.v1";
  const kanaFavoritesKey = "textTools.kanaSpell.favorites.v1";
  const kanaHistoryKey = "textTools.kanaSpell.history.v1";
  const kanaCollectionsKey = "textTools.kanaSpell.collections.v2";
  const glitchLibraryKey = "textTools.glitch.library.v1";
  const localDataResetKey = "textTools.localData.reset.v1";
  const kanaStorageLimit = 256 * 1024;
  const kanaCollectionsStorageLimit = 512 * 1024;
  const glitchLibraryStorageLimit = 512 * 1024;
  const inputDraftByteLimit = 512 * 1024;
  const inputDraftLifetime = 30 * 24 * 60 * 60 * 1000;
  const inputDraftDelay = 800;
  const countAnnouncementDelay = 700;
  const romajiAnnouncementDelay = 650;
  const glitchHistoryByteBudget = 12 * 1024 * 1024;
  const encodingSampleSize = 256 * 1024;
  const maximumFileSize = 2 * 1024 * 1024;
  const numberFormatter = new Intl.NumberFormat("ja-JP");
  const kanaTasteLabels = Object.freeze({ standard: "標準", english: "英語圏", fantasy: "ファンタジー", classic: "古典", sf: "SF" });
  const kanaFidelityLabels = Object.freeze(["", "かなり忠実", "軽く自然化", "ほどよく変化", "しっかり創作", "大胆に創作"]);
  const validSettings = Object.freeze({
    mode: ["count", "mojibake", "mirror", "kana", "romaji", "decoration"],
    limit: ["0", "100", "140", "280", "500", "custom"],
    mojibakePurpose: ["repair", "encode", "creative"],
    mojibakeMethod: ["latin1", "base64", "hex"],
    glitchIntensity: ["light", "medium", "heavy", "full"],
    mirrorMethod: ["reverse", "mirror", "combined", "upsideDown"],
    kanaTaste: ["standard", "english", "fantasy", "classic", "sf"],
    romajiDirection: ["toKana", "toRomaji"],
    romajiScript: ["hiragana", "katakana"],
    romajiSystem: ["hepburn", "kunrei", "nihon"],
    romajiLongVowel: ["written", "spoken", "macron"],
    romajiParticles: ["written", "pronunciation"]
  });
  const defaultSettings = Object.freeze({
    mode: "count",
    limit: "0",
    customLimit: 1200,
    mojibakePurpose: "repair",
    mojibakeMethod: "latin1",
    glitchIntensity: "light",
    mirrorMethod: "reverse",
    kanaTaste: "standard",
    kanaFidelity: 3,
    romajiDirection: "toKana",
    romajiScript: "hiragana",
    romajiSystem: "hepburn",
    romajiLongVowel: "written",
    romajiParticles: "written",
    lineByLine: true,
    autoSaveInput: false,
    kanaHistoryEnabled: true
  });

  const elements = {
    tabs: Array.from(document.querySelectorAll('.tabs [role="tab"]')),
    panels: Array.from(document.querySelectorAll('.mode-panel[role="tabpanel"]')),
    mobileModeSelect: document.getElementById("mobileModeSelect"),
    mobileResultJump: document.getElementById("mobileResultJump"),
    mobileResultJumpLabel: document.getElementById("mobileResultJumpLabel"),
    sharedInputRegion: document.getElementById("sharedInputRegion"),
    sharedActionBar: document.getElementById("sharedActionBar"),
    source: document.getElementById("sourceText"),
    sourceLabel: document.getElementById("sourceTextLabel"),
    inputHint: document.getElementById("inputHint"),
    output: document.getElementById("outputText"),
    outputLabel: document.getElementById("outputTextLabel"),
    outputHint: document.getElementById("outputHint"),
    outputRegion: document.getElementById("outputRegion"),
    transformActions: Array.from(document.querySelectorAll(".transform-only")),
    copyButton: document.getElementById("copyButton"),
    copyLabel: document.getElementById("copyButtonLabel"),
    swapButton: document.getElementById("swapButton"),
    saveButton: document.getElementById("saveButton"),
    saveInputButton: document.getElementById("saveInputButton"),
    openTextFileButton: document.getElementById("openTextFileButton"),
    clearButton: document.getElementById("clearButton"),
    toast: document.getElementById("toast"),
    liveCharacterCount: document.getElementById("liveCharacterCount"),
    outputCharacterCount: document.getElementById("outputCharacterCount"),
    characterLimit: document.getElementById("characterLimit"),
    customLimitWrap: document.getElementById("customLimitWrap"),
    customLimit: document.getElementById("customLimit"),
    limitStatus: document.getElementById("limitStatus"),
    selectionStatus: document.getElementById("selectionStatus"),
    selectionCount: document.getElementById("selectionCount"),
    countSummaryStatus: document.getElementById("countSummaryStatus"),
    stats: {
      total: document.getElementById("statTotal"),
      noSpaces: document.getElementById("statNoSpaces"),
      noLines: document.getElementById("statNoLines"),
      noWhitespace: document.getElementById("statNoWhitespace"),
      lines: document.getElementById("statLines"),
      words: document.getElementById("statWords"),
      bytes: document.getElementById("statBytes")
    },
    fileInput: document.getElementById("textFile"),
    dropZone: document.getElementById("dropZone"),
    fileStatus: document.getElementById("fileStatus"),
    selectionTransformBar: document.getElementById("selectionTransformBar"),
    selectionTransformStatus: document.getElementById("selectionTransformStatus"),
    transformSelectionOnly: document.getElementById("transformSelectionOnly"),
    encodingDiagnostics: document.getElementById("encodingDiagnostics"),
    encodingSummary: document.getElementById("encodingSummary"),
    encodingCandidateList: document.getElementById("encodingCandidateList"),
    applyEncodingButton: document.getElementById("applyEncodingButton"),
    cancelEncodingButton: document.getElementById("cancelEncodingButton"),
    batchPanel: document.getElementById("batchPanel"),
    batchModeSummary: document.getElementById("batchModeSummary"),
    batchProgress: document.getElementById("batchProgress"),
    batchProgressText: document.getElementById("batchProgressText"),
    batchStartButton: document.getElementById("batchStartButton"),
    batchCancelButton: document.getElementById("batchCancelButton"),
    batchCsvButton: document.getElementById("batchCsvButton"),
    batchClearButton: document.getElementById("batchClearButton"),
    batchResultList: document.getElementById("batchResultList"),
    batchStatus: document.getElementById("batchStatus"),
    autoSaveInput: document.getElementById("autoSaveInput"),
    deleteDraftButton: document.getElementById("deleteDraftButton"),
    draftStatus: document.getElementById("draftStatus"),
    deviceDataCounts: document.getElementById("deviceDataCounts"),
    deviceDataStatus: document.getElementById("deviceDataStatus"),
    kanaHistoryEnabled: document.getElementById("kanaHistoryEnabled"),
    exportKanaDataButton: document.getElementById("exportKanaDataButton"),
    importKanaDataButton: document.getElementById("importKanaDataButton"),
    kanaDataFileInput: document.getElementById("kanaDataFileInput"),
    deleteAllLocalDataButton: document.getElementById("deleteAllLocalDataButton"),
    repairOptions: document.getElementById("repairOptions"),
    encodeOptions: document.getElementById("encodeOptions"),
    creativeOptions: document.getElementById("creativeOptions"),
    creativeWarning: document.getElementById("creativeWarning"),
    mojibakeMethod: document.getElementById("mojibakeMethod"),
    mojibakeMethodDescription: document.getElementById("mojibakeMethodDescription"),
    encodeMojibake: document.getElementById("encodeMojibake"),
    decodeMojibake: document.getElementById("decodeMojibake"),
    createGlitch: document.getElementById("createGlitch"),
    rerollGlitch: document.getElementById("rerollGlitch"),
    glitchWorkbench: document.getElementById("glitchWorkbench"),
    glitchUndoButton: document.getElementById("glitchUndoButton"),
    glitchRedoButton: document.getElementById("glitchRedoButton"),
    glitchSaveCandidateButton: document.getElementById("glitchSaveCandidateButton"),
    glitchCompareButton: document.getElementById("glitchCompareButton"),
    glitchSeedLocked: document.getElementById("glitchSeedLocked"),
    glitchSeed: document.getElementById("glitchSeed"),
    glitchReplayButton: document.getElementById("glitchReplayButton"),
    glitchPresetName: document.getElementById("glitchPresetName"),
    glitchSavePresetButton: document.getElementById("glitchSavePresetButton"),
    glitchPresetSelect: document.getElementById("glitchPresetSelect"),
    glitchApplyPresetButton: document.getElementById("glitchApplyPresetButton"),
    glitchDeletePresetButton: document.getElementById("glitchDeletePresetButton"),
    glitchExportRecipeButton: document.getElementById("glitchExportRecipeButton"),
    glitchImportRecipeButton: document.getElementById("glitchImportRecipeButton"),
    glitchRecipeFileInput: document.getElementById("glitchRecipeFileInput"),
    glitchHistoryCount: document.getElementById("glitchHistoryCount"),
    glitchHistoryEmpty: document.getElementById("glitchHistoryEmpty"),
    glitchHistoryList: document.getElementById("glitchHistoryList"),
    glitchSavedCount: document.getElementById("glitchSavedCount"),
    glitchSavedEmpty: document.getElementById("glitchSavedEmpty"),
    glitchSavedList: document.getElementById("glitchSavedList"),
    glitchCompareRegion: document.getElementById("glitchCompareRegion"),
    glitchCompareLeft: document.getElementById("glitchCompareLeft"),
    glitchCompareRight: document.getElementById("glitchCompareRight"),
    glitchClearCompareButton: document.getElementById("glitchClearCompareButton"),
    glitchWorkbenchStatus: document.getElementById("glitchWorkbenchStatus"),
    lineByLine: document.getElementById("lineByLine"),
    methodBadge: document.getElementById("methodBadge"),
    conversionMessage: document.getElementById("conversionMessage"),
    kanaInput: document.getElementById("kanaInput"),
    kanaGenerateButton: document.getElementById("kanaGenerateButton"),
    kanaInputError: document.getElementById("kanaInputError"),
    kanaFidelity: document.getElementById("kanaFidelity"),
    kanaFidelityValue: document.getElementById("kanaFidelityValue"),
    kanaEmptyState: document.getElementById("kanaEmptyState"),
    kanaGeneratedResults: document.getElementById("kanaGeneratedResults"),
    kanaRecommendedCard: document.getElementById("kanaRecommendedCard"),
    kanaCandidateList: document.getElementById("kanaCandidateList"),
    kanaRerollButton: document.getElementById("kanaRerollButton"),
    kanaCopyAllButton: document.getElementById("kanaCopyAllButton"),
    kanaResultCount: document.getElementById("kanaResultCount"),
    kanaResultStatus: document.getElementById("kanaResultStatus"),
    kanaFavoritesEmpty: document.getElementById("kanaFavoritesEmpty"),
    kanaFavoritesList: document.getElementById("kanaFavoritesList"),
    kanaHistoryEmpty: document.getElementById("kanaHistoryEmpty"),
    kanaHistoryList: document.getElementById("kanaHistoryList"),
    kanaClearHistoryButton: document.getElementById("kanaClearHistoryButton"),
    romajiScriptOptions: document.getElementById("romajiScriptOptions"),
    romajiOutputOptions: document.getElementById("romajiOutputOptions"),
    romajiLongVowel: document.getElementById("romajiLongVowel"),
    romajiParticles: document.getElementById("romajiParticles"),
    romajiDiagnostics: document.getElementById("romajiDiagnostics"),
    romajiDiagnosticsSummary: document.getElementById("romajiDiagnosticsSummary"),
    romajiIssueList: document.getElementById("romajiIssueList"),
    romajiConversionStatus: document.getElementById("romajiConversionStatus")
  };

  let observedLocalDataResetEpoch = readLocalDataResetEpoch();
  let localDataResetPending = false;
  let settings = loadSettings();
  let currentMode = "count";
  let latestAnalysis = tools.count.analyze("");
  let sourceRevision = 0;
  let scheduledFrame = 0;
  let pendingMirrorRefresh = false;
  let composing = false;
  let toastTimer = 0;
  let fileReadGeneration = 0;
  let pendingEncoding = null;
  let draftTimer = 0;
  let draftDirty = false;
  let draftLastChangedAt = 0;
  let countAnnouncementTimer = 0;
  let lastCountAnnouncement = "";
  let romajiAnnouncementTimer = 0;
  let announcementsReady = false;
  let dragDepth = 0;
  let kanaCandidates = [];
  let kanaGeneration = 0;
  let kanaComposing = false;
  let glitchVariation = 0;
  let glitchSignature = "";
  let glitchManualHistoryTimer = 0;
  let glitchPendingManualEntry = null;
  let activeGlitchPresetName = "";
  let recipeImportGeneration = 0;
  let glitchHistoryState = { items: [], index: -1 };
  let glitchComparison = [];
  let batchRows = [];
  let batchRunning = false;
  let batchCancelRequested = false;
  let batchActiveLabel = "";
  let batchResultsExported = false;
  let transformSelectionSignature = "";
  let suppressSettingsWrite = false;
  const initialKanaCollections = loadKanaCollections();
  let kanaFavorites = initialKanaCollections.favorites;
  let kanaHistory = initialKanaCollections.history;
  const initialGlitchLibrary = loadGlitchLibrary();
  let glitchSavedCandidates = initialGlitchLibrary.candidates;
  let glitchPresets = initialGlitchLibrary.presets;

  const transformStates = {
    mojibake: { text: "", badge: "", message: "", messageType: "", initialized: false, sourceRevision: -1, scopeSignature: "all", manuallyEdited: false },
    mirror: { text: "", badge: "", message: "", messageType: "", initialized: false, sourceRevision: -1, scopeSignature: "all", manuallyEdited: false },
    romaji: { text: "", badge: "", message: "", messageType: "", initialized: false, sourceRevision: -1, scopeSignature: "all", manuallyEdited: false }
  };

  function readLocalDataResetEpoch() {
    try {
      return root.localStorage.getItem(localDataResetKey) || "";
    } catch (_error) {
      return "";
    }
  }

  function localDataWriteAllowed() {
    if (localDataResetPending) return false;
    const latestEpoch = readLocalDataResetEpoch();
    if (latestEpoch === observedLocalDataResetEpoch) return true;
    observedLocalDataResetEpoch = latestEpoch;
    localDataResetPending = true;
    root.setTimeout(() => {
      if (localDataResetPending) applyExternalLocalDataReset();
    }, 0);
    return false;
  }

  function withLocalDataLock(action) {
    const lockManager = root.navigator && root.navigator.locks;
    if (lockManager && typeof lockManager.request === "function") {
      return lockManager.request("text-tools-local-data-v1", { mode: "exclusive" }, action);
    }
    try {
      return Promise.resolve(action());
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function validStoredText(value, maximumLength, asciiOnly) {
    return typeof value === "string" && value.length > 0 && value.length <= maximumLength &&
      !/[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/u.test(value) &&
      (!asciiOnly || /^[A-Za-z -]+$/.test(value));
  }

  function storageGenerationMatches(payload) {
    const storedGeneration = payload && typeof payload.storageGeneration === "string" ? payload.storageGeneration : "";
    return storedGeneration === readLocalDataResetEpoch();
  }

  function normalizeStoredItem(item, type) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    if (!validStoredText(item.id, 100, false) || !validStoredText(item.kana, 100, false)) return null;
    if (!Number.isFinite(item.createdAt) || item.createdAt < 0) return null;
    if (type === "favorite") {
      if (!validStoredText(item.spelling, 180, true)) return null;
      return { id: item.id, kana: item.kana, spelling: item.spelling, createdAt: item.createdAt };
    }
    if (!Array.isArray(item.spellings) || item.spellings.length < 1 || item.spellings.length > 8) return null;
    const spellings = item.spellings.filter((value) => validStoredText(value, 180, true));
    const tastes = validSettings.kanaTaste;
    if (!spellings.length || !tastes.includes(item.taste) || !Number.isInteger(item.fidelity) || item.fidelity < 1 || item.fidelity > 5) return null;
    return { id: item.id, kana: item.kana, spellings, taste: item.taste, fidelity: item.fidelity, createdAt: item.createdAt };
  }

  function loadKanaCollection(key, type, maximumItems) {
    try {
      const raw = root.localStorage.getItem(key);
      if (!raw || raw.length > kanaStorageLimit) return [];
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.schemaVersion !== 1 || !Array.isArray(parsed.items) || !storageGenerationMatches(parsed)) {
        root.localStorage.removeItem(key);
        return [];
      }
      return parsed.items.slice(0, maximumItems).map((item) => normalizeStoredItem(item, type)).filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  function loadKanaCollections() {
    try {
      const raw = root.localStorage.getItem(kanaCollectionsKey);
      if (raw && raw.length > kanaCollectionsStorageLimit) {
        root.localStorage.removeItem(kanaCollectionsKey);
      } else if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.schemaVersion === 2 && storageGenerationMatches(parsed) && Array.isArray(parsed.favorites) && Array.isArray(parsed.history)) {
          return {
            favorites: parsed.favorites.slice(0, 100).map((item) => normalizeStoredItem(item, "favorite")).filter(Boolean),
            history: parsed.history.slice(0, 20).map((item) => normalizeStoredItem(item, "history")).filter(Boolean)
          };
        }
        root.localStorage.removeItem(kanaCollectionsKey);
      }
    } catch (_error) {
      try { root.localStorage.removeItem(kanaCollectionsKey); } catch (_removeError) { /* Ignore unavailable storage. */ }
    }

    const favorites = loadKanaCollection(kanaFavoritesKey, "favorite", 100);
    const history = loadKanaCollection(kanaHistoryKey, "history", 20);
    if ((favorites.length || history.length) && saveKanaCollections(favorites, history)) {
      try {
        root.localStorage.removeItem(kanaFavoritesKey);
        root.localStorage.removeItem(kanaHistoryKey);
      } catch (_error) {
        // The v2 copy is complete even if legacy cleanup is unavailable.
      }
    }
    return { favorites, history };
  }

  function saveKanaCollections(favorites, history) {
    if (!localDataWriteAllowed()) return false;
    const sourceFavorites = Array.isArray(favorites) ? favorites.slice(0, 100) : [];
    const sourceHistory = Array.isArray(history) ? history.slice(0, 20) : [];
    const normalizedFavorites = sourceFavorites.map((item) => normalizeStoredItem(item, "favorite")).filter(Boolean);
    const normalizedHistory = sourceHistory.map((item) => normalizeStoredItem(item, "history")).filter(Boolean);
    if (normalizedFavorites.length !== sourceFavorites.length || normalizedHistory.length !== sourceHistory.length) return false;
    try {
      const serialized = JSON.stringify({
        schemaVersion: 2,
        storageGeneration: observedLocalDataResetEpoch,
        favorites: normalizedFavorites,
        history: normalizedHistory
      });
      if (serialized.length > kanaCollectionsStorageLimit) return false;
      root.localStorage.setItem(kanaCollectionsKey, serialized);
      try {
        root.localStorage.removeItem(kanaFavoritesKey);
        root.localStorage.removeItem(kanaHistoryKey);
      } catch (_cleanupError) {
        // The complete v2 value is already stored atomically.
      }
      return true;
    } catch (_error) {
      return false;
    }
  }

  function refreshKanaCollectionsFromStorage() {
    const collections = loadKanaCollections();
    kanaFavorites = collections.favorites;
    kanaHistory = collections.history;
  }

  function loadGlitchLibrary() {
    try {
      const raw = root.localStorage.getItem(glitchLibraryKey);
      if (!raw) return { candidates: [], presets: [] };
      if (raw.length > glitchLibraryStorageLimit) {
        root.localStorage.removeItem(glitchLibraryKey);
        return { candidates: [], presets: [] };
      }
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.schemaVersion !== 1 || !storageGenerationMatches(parsed) || !Array.isArray(parsed.candidates) || !Array.isArray(parsed.presets)) {
        root.localStorage.removeItem(glitchLibraryKey);
        return { candidates: [], presets: [] };
      }
      return {
        candidates: parsed.candidates.slice(0, tools.workflow.maximumSavedCandidates).map(tools.workflow.normalizeSavedCandidate).filter(Boolean),
        presets: parsed.presets.slice(0, tools.workflow.maximumPresets).map(tools.workflow.normalizePreset).filter(Boolean)
      };
    } catch (_error) {
      try { root.localStorage.removeItem(glitchLibraryKey); } catch (_removeError) { /* Storage can be unavailable. */ }
      return { candidates: [], presets: [] };
    }
  }

  function saveGlitchLibrary(candidates, presets) {
    if (!localDataWriteAllowed()) return false;
    const sourceCandidates = Array.isArray(candidates) ? candidates.slice(0, tools.workflow.maximumSavedCandidates) : [];
    const sourcePresets = Array.isArray(presets) ? presets.slice(0, tools.workflow.maximumPresets) : [];
    const normalizedCandidates = sourceCandidates.map(tools.workflow.normalizeSavedCandidate).filter(Boolean);
    const normalizedPresets = sourcePresets.map(tools.workflow.normalizePreset).filter(Boolean);
    if (normalizedCandidates.length !== sourceCandidates.length || normalizedPresets.length !== sourcePresets.length) return false;
    try {
      const serialized = JSON.stringify({
        schemaVersion: 1,
        storageGeneration: observedLocalDataResetEpoch,
        candidates: normalizedCandidates,
        presets: normalizedPresets
      });
      if (serialized.length > glitchLibraryStorageLimit) return false;
      root.localStorage.setItem(glitchLibraryKey, serialized);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function refreshGlitchLibraryFromStorage() {
    const library = loadGlitchLibrary();
    glitchSavedCandidates = library.candidates;
    glitchPresets = library.presets;
  }

  function createStorageId(prefix) {
    if (root.crypto && typeof root.crypto.randomUUID === "function") {
      return `${prefix}-${root.crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function loadSettings() {
    let saved = {};
    try {
      const raw = root.localStorage.getItem(storageKey);
      saved = JSON.parse(raw || "{}") || {};
      if (raw && !storageGenerationMatches(saved)) {
        root.localStorage.removeItem(storageKey);
        saved = {};
      }
    } catch (error) {
      saved = {};
    }

    const next = Object.assign({}, defaultSettings);
    Object.keys(validSettings).forEach((key) => {
      if (validSettings[key].includes(saved[key])) {
        next[key] = saved[key];
      }
    });
    if (!validSettings.mojibakePurpose.includes(saved.mojibakePurpose) && (saved.mojibakeKind === "reversible" || saved.mojibakeKind === "creative")) {
      next.mojibakePurpose = saved.mojibakeKind === "creative" ? "creative" : "repair";
    }
    if (Number.isFinite(Number(saved.customLimit)) && Number(saved.customLimit) >= 1) {
      next.customLimit = Math.min(10000000, Math.floor(Number(saved.customLimit)));
    }
    if (typeof saved.lineByLine === "boolean") {
      next.lineByLine = saved.lineByLine;
    }
    if (Number.isFinite(Number(saved.kanaFidelity))) {
      next.kanaFidelity = Math.max(1, Math.min(5, Math.round(Number(saved.kanaFidelity))));
    }
    if (typeof saved.autoSaveInput === "boolean") {
      next.autoSaveInput = saved.autoSaveInput;
    }
    if (typeof saved.kanaHistoryEnabled === "boolean") {
      next.kanaHistoryEnabled = saved.kanaHistoryEnabled;
    }
    return next;
  }

  function readStoredPrivacySetting(key) {
    try {
      const raw = root.localStorage.getItem(storageKey);
      if (!raw) return defaultSettings[key];
      const parsed = JSON.parse(raw);
      if (!storageGenerationMatches(parsed) || typeof parsed[key] !== "boolean") return defaultSettings[key];
      return parsed[key];
    } catch (_error) {
      return defaultSettings[key];
    }
  }

  function saveSettings(overriddenPrivacyKey) {
    if (suppressSettingsWrite) return Promise.resolve(true);
    return withLocalDataLock(() => saveSettingsUnlocked(overriddenPrivacyKey));
  }

  function saveSettingsUnlocked(overriddenPrivacyKey) {
    if (!localDataWriteAllowed()) return false;
    try {
      const payload = Object.assign({}, settings);
      ["autoSaveInput", "kanaHistoryEnabled"].forEach((key) => {
        if (key === overriddenPrivacyKey) return;
        payload[key] = readStoredPrivacySetting(key);
        settings[key] = payload[key];
      });
      elements.autoSaveInput.checked = settings.autoSaveInput;
      elements.kanaHistoryEnabled.checked = settings.kanaHistoryEnabled;
      payload.storageGeneration = observedLocalDataResetEpoch;
      root.localStorage.setItem(storageKey, JSON.stringify(payload));
      return true;
    } catch (error) {
      // Storage can be unavailable in private mode; all features still work.
      return false;
    }
  }

  function setDraftStatus(message, isError) {
    elements.draftStatus.textContent = message || "";
    elements.draftStatus.classList.toggle("is-error", Boolean(isError));
  }

  function removeStoredDraft() {
    try {
      root.localStorage.removeItem(inputDraftKey);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function storedDraftExists() {
    try {
      const raw = root.localStorage.getItem(inputDraftKey);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!storageGenerationMatches(parsed)) {
        root.localStorage.removeItem(inputDraftKey);
        return false;
      }
      return true;
    } catch (_error) {
      return false;
    }
  }

  function storedDraftTimestamp() {
    try {
      const parsed = JSON.parse(root.localStorage.getItem(inputDraftKey) || "null");
      return parsed && storageGenerationMatches(parsed) && Number.isFinite(parsed.updatedAt) ? parsed.updatedAt : 0;
    } catch (_error) {
      return 0;
    }
  }

  function stopDraftSavingAfterFailure(message, draftRemoved) {
    settings.autoSaveInput = false;
    elements.autoSaveInput.checked = false;
    elements.deleteDraftButton.disabled = Boolean(draftRemoved);
    draftDirty = false;
    saveSettingsUnlocked("autoSaveInput");
    setDraftStatus(message, true);
    renderDeviceDataSummary();
  }

  function validInputDraft(parsed) {
    if (!parsed || parsed.schemaVersion !== 1 || !storageGenerationMatches(parsed) || typeof parsed.text !== "string" || !Number.isFinite(parsed.updatedAt)) return false;
    const now = Date.now();
    if (parsed.updatedAt > now + 5 * 60 * 1000 || now - parsed.updatedAt > inputDraftLifetime) return false;
    return new TextEncoder().encode(parsed.text).byteLength <= inputDraftByteLimit;
  }

  function loadInputDraft() {
    try {
      const raw = root.localStorage.getItem(inputDraftKey);
      if (!raw || raw.length > inputDraftByteLimit * 6 + 1024) return null;
      const parsed = JSON.parse(raw);
      if (!validInputDraft(parsed)) {
        removeStoredDraft();
        return null;
      }
      return parsed;
    } catch (_error) {
      removeStoredDraft();
      return null;
    }
  }

  function saveInputDraft(showStatus, immediate) {
    if (draftTimer) {
      root.clearTimeout(draftTimer);
      draftTimer = 0;
    }
    const save = () => saveInputDraftUnlocked(showStatus);
    return immediate ? save() : withLocalDataLock(save);
  }

  function saveInputDraftUnlocked(showStatus) {
    if (!localDataWriteAllowed()) return false;
    if (!settings.autoSaveInput) return false;
    if (!readStoredPrivacySetting("autoSaveInput")) {
      settings.autoSaveInput = false;
      elements.autoSaveInput.checked = false;
      return false;
    }
    if (!draftDirty && !showStatus) return true;
    const text = elements.source.value;
    if (!text) {
      const removed = removeStoredDraft();
      if (!removed) {
        stopDraftSavingAfterFailure("自動保存を停止しましたが、以前の下書きを削除できませんでした。もう一度「保存を停止して削除」を押してください。", false);
        return false;
      }
      draftDirty = false;
      if (showStatus || elements.draftStatus.classList.contains("is-error")) {
        setDraftStatus("自動保存はオンです。入力するとこの端末に下書きを保存します。", false);
      }
      renderDeviceDataSummary();
      return true;
    }
    if (new TextEncoder().encode(text).byteLength > inputDraftByteLimit) {
      const removed = removeStoredDraft();
      draftDirty = false;
      if (!removed) {
        stopDraftSavingAfterFailure("下書きが512KBを超え、自動保存を停止しました。以前の保存データも削除できないため、削除を再試行してください。", false);
        return false;
      }
      setDraftStatus("下書きは512KBを超えたため保存していません。入力TXT保存をご利用ください。", true);
      renderDeviceDataSummary();
      return false;
    }
    const storedTimestamp = storedDraftTimestamp();
    if (!showStatus && storedTimestamp > draftLastChangedAt) {
      draftDirty = false;
      setDraftStatus("別のタブで保存された新しい下書きを保持しました。", false);
      return true;
    }
    try {
      const updatedAt = draftLastChangedAt || Date.now();
      root.localStorage.setItem(inputDraftKey, JSON.stringify({
        schemaVersion: 1,
        storageGeneration: observedLocalDataResetEpoch,
        text,
        updatedAt
      }));
      draftDirty = false;
      if (showStatus) {
        setDraftStatus("下書きの自動保存をオンにしました。この端末だけに保存します。", false);
      } else if (elements.draftStatus.classList.contains("is-error")) {
        setDraftStatus("下書きの自動保存を再開しました。この端末だけに保存しています。", false);
      }
      renderDeviceDataSummary();
      return true;
    } catch (_error) {
      const removed = removeStoredDraft();
      stopDraftSavingAfterFailure(
        removed
          ? "下書きを保存できなかったため自動保存を停止し、古い保存データを削除しました。入力TXT保存をご利用ください。"
          : "下書きを保存できず、以前の保存データも削除できませんでした。削除を再試行し、入力TXT保存をご利用ください。",
        removed
      );
      return false;
    }
  }

  function scheduleInputDraftSave() {
    if (!settings.autoSaveInput) return;
    draftDirty = true;
    draftLastChangedAt = Date.now();
    if (draftTimer) root.clearTimeout(draftTimer);
    draftTimer = root.setTimeout(() => saveInputDraft(false), inputDraftDelay);
  }

  function restoreInputDraft() {
    if (!settings.autoSaveInput || elements.source.value) return;
    const draft = loadInputDraft();
    if (!draft) {
      setDraftStatus("下書きの自動保存はオンです。入力するとこの端末だけに保存します。", false);
      renderDeviceDataSummary();
      return;
    }
    elements.source.value = draft.text;
    sourceRevision += 1;
    draftLastChangedAt = draft.updatedAt;
    draftDirty = false;
    setDraftStatus("この端末に保存されていた下書きを復元しました。", false);
    renderDeviceDataSummary();
  }

  async function setAutoSaveInput(enabled) {
    const target = Boolean(enabled);
    settings.autoSaveInput = target;
    elements.autoSaveInput.checked = target;
    if (!target) {
      if (draftTimer) root.clearTimeout(draftTimer);
      draftTimer = 0;
      draftDirty = false;
      draftLastChangedAt = 0;
    }
    let result;
    try {
      result = await withLocalDataLock(() => {
        settings.autoSaveInput = target;
        if (!saveSettingsUnlocked("autoSaveInput")) return { saved: false, removed: false };
        if (target) {
          draftDirty = true;
          draftLastChangedAt = Date.now();
          saveInputDraftUnlocked(true);
          return { saved: true, removed: false };
        }
        return { saved: true, removed: removeStoredDraft() };
      });
    } catch (_error) {
      result = { saved: false, removed: false };
    }
    if (!result.saved) {
      settings = loadSettings();
      elements.autoSaveInput.checked = settings.autoSaveInput;
      elements.deleteDraftButton.disabled = !settings.autoSaveInput && !storedDraftExists();
      setDraftStatus("下書きの保存設定を変更できませんでした。ブラウザの保存設定をご確認ください。", true);
      renderDeviceDataSummary();
      return;
    }
    elements.autoSaveInput.checked = settings.autoSaveInput;
    elements.deleteDraftButton.disabled = settings.autoSaveInput ? false : !storedDraftExists();
    if (!target) {
      setDraftStatus(
        result.removed
          ? "下書きの自動保存を停止し、端末内の保存データを削除しました。"
          : "自動保存は停止しましたが、端末内の保存データを削除できませんでした。もう一度このボタンを押してください。",
        !result.removed
      );
    }
    renderDeviceDataSummary();
  }

  function formatNumber(value) {
    return numberFormatter.format(value);
  }

  function selectedCharacterLimit() {
    if (elements.characterLimit.value === "custom") {
      const custom = Math.floor(Number(elements.customLimit.value));
      return Number.isFinite(custom) && custom >= 1 ? custom : 0;
    }
    return Number(elements.characterLimit.value) || 0;
  }

  function buildCountAnnouncement() {
    const parts = [`総文字数 ${formatNumber(latestAnalysis.total)}文字。`];
    const limit = selectedCharacterLimit();
    if (limit) {
      const remaining = limit - latestAnalysis.total;
      parts.push(remaining >= 0
        ? `残り ${formatNumber(remaining)}文字。`
        : `上限を ${formatNumber(Math.abs(remaining))}文字超えています。`);
    }
    if (!elements.selectionStatus.hidden) {
      parts.push(`選択範囲 ${elements.selectionCount.textContent}文字。`);
    }
    return parts.join("");
  }

  function scheduleCountAnnouncement() {
    if (!announcementsReady || composing || currentMode !== "count") return;
    if (countAnnouncementTimer) root.clearTimeout(countAnnouncementTimer);
    countAnnouncementTimer = root.setTimeout(() => {
      countAnnouncementTimer = 0;
      const message = buildCountAnnouncement();
      if (message === lastCountAnnouncement) return;
      lastCountAnnouncement = message;
      elements.countSummaryStatus.textContent = message;
    }, countAnnouncementDelay);
  }

  function selectedValue(name) {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    return selected ? selected.value : "";
  }

  function selectRadio(name, value) {
    const target = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (target) {
      target.checked = true;
    }
  }

  function captureTransformState(mode) {
    if (!transformStates[mode]) {
      return;
    }
    transformStates[mode].text = elements.output.value;
    transformStates[mode].badge = elements.methodBadge.hidden ? "" : elements.methodBadge.textContent;
    transformStates[mode].message = elements.conversionMessage.textContent;
    transformStates[mode].messageType = elements.conversionMessage.classList.contains("is-info")
      ? "info"
      : elements.conversionMessage.textContent ? "error" : "";
  }

  function renderTransformState(mode) {
    const state = transformStates[mode];
    elements.output.value = state.text;
    elements.methodBadge.textContent = state.badge;
    elements.methodBadge.hidden = !state.badge;
    elements.conversionMessage.textContent = state.message;
    elements.conversionMessage.classList.toggle("is-info", state.messageType === "info");
    updateOutputCount();
  }

  function setTransformOutput(text, badge, message, messageType) {
    const state = transformStates[currentMode];
    if (!state) {
      return;
    }
    state.text = String(text || "");
    state.badge = badge || "";
    state.message = message || "";
    state.messageType = messageType || "";
    state.initialized = true;
    state.manuallyEdited = false;
    state.scopeSignature = currentTransformScopeSignature();
    elements.output.value = state.text;
    elements.methodBadge.textContent = state.badge;
    elements.methodBadge.hidden = !state.badge;
    elements.conversionMessage.textContent = state.message;
    elements.conversionMessage.classList.toggle("is-info", state.messageType === "info");
    updateOutputCount();
    updateActionState();
  }

  function setTransformMessage(message, type) {
    const state = transformStates[currentMode];
    if (state) {
      state.message = message || "";
      state.messageType = type || "error";
    }
    elements.conversionMessage.textContent = message || "";
    elements.conversionMessage.classList.toggle("is-info", type === "info");
  }

  function invalidateMojibakeOutput(message, type) {
    const state = transformStates.mojibake;
    Object.assign(state, {
      text: "",
      badge: "",
      message: message || "",
      messageType: type || "",
      initialized: false,
      sourceRevision: -1,
      scopeSignature: "all",
      manuallyEdited: false
    });
    glitchVariation = 0;
    glitchSignature = "";
    if (currentMode === "mojibake") {
      renderTransformState("mojibake");
    }
    updateActionState();
  }

  function markMojibakeOutputEdited() {
    const state = transformStates.mojibake;
    const hasOutput = elements.output.value.length > 0;
    state.initialized = hasOutput;
    state.sourceRevision = hasOutput ? sourceRevision : -1;
    if (hasOutput && state.manuallyEdited) return;
    if (!hasOutput) {
      Object.assign(state, { badge: "", message: "", messageType: "", manuallyEdited: false });
    } else if (!state.manuallyEdited) {
      const wasVerified = state.message.includes("復元チェック済み");
      state.badge = "手動編集済み";
      state.message = wasVerified
        ? "出力を手動編集したため、復元チェックは解除されました。元に戻せることは保証されません。"
        : settings.mojibakePurpose === "creative"
          ? "出力を手動編集しました。この演出用加工は元の文章に復元できません。"
          : "出力を手動編集しました。変換直後の結果ではありません。";
      state.messageType = "info";
      state.manuallyEdited = true;
    }
    elements.methodBadge.textContent = state.badge;
    elements.methodBadge.hidden = !state.badge;
    elements.conversionMessage.textContent = state.message;
    elements.conversionMessage.classList.toggle("is-info", state.messageType === "info");
  }

  function mojibakeErrorMessage(error) {
    const code = error && error.message;
    if (code === "OUTPUT_TOO_LARGE") {
      return "結果が300万文字を超えるため表示を中止しました。入力または選択範囲を短くしてください。";
    }
    if (code === "LOSSY_REPLACEMENT") {
      return "「�」が含まれており、すでに情報が失われています。完全復元には変換前の文章や元ファイルが必要です。";
    }
    if (code === "INVALID_BASE64" || code === "NON_CANONICAL_BASE64") {
      return "MB64形式が途中で欠けているか、Base64として正しくありません。";
    }
    if (code === "INVALID_HEX" || code === "MISSING_HEX_PREFIX") {
      return "MBHEX形式が途中で欠けているか、16進バイト列として正しくありません。";
    }
    if (code === "INVALID_UTF8") {
      return "バイト列をUTF-8の文章として読み戻せませんでした。別の文字コードで壊れた可能性があります。";
    }
    if (code === "UNPAIRED_SURROGATE") {
      return "この文章には単独では扱えないUnicode文字が含まれています。該当箇所を削除してお試しください。";
    }
    if (code === "ROUNDTRIP_FAILED") {
      return "復元確認に失敗したため、結果を表示しませんでした。";
    }
    return "復元方式を判定できませんでした。Ã…系、MB64、MBHEX形式の文字列か確認してください。";
  }

  function updateSharedLabels(mode) {
    if (mode === "mojibake") {
      const labels = {
        repair: {
          source: "文字化けした文章",
          output: "修復結果",
          hint: "Ã…系、MB64、MBHEXなどを貼り付けてください",
          sourcePlaceholder: "直したい文字化けを貼り付けてください",
          outputPlaceholder: "修復できた文章がここに表示されます"
        },
        encode: {
          source: "変換したい文章",
          output: "戻せる変換結果",
          hint: "あとで同じ文章へ戻せる形に変換します",
          sourcePlaceholder: "戻せる形にしたい文章を入力してください",
          outputPlaceholder: "復元チェック済みの結果がここに表示されます"
        },
        creative: {
          source: "崩したい文章",
          output: "演出結果",
          hint: "創作向けの復元できない加工です",
          sourcePlaceholder: "演出用に崩したい文章を入力してください",
          outputPlaceholder: "演出用の結果がここに表示されます"
        }
      };
      const configuration = labels[settings.mojibakePurpose] || labels.repair;
      elements.sourceLabel.textContent = configuration.source;
      elements.outputLabel.textContent = configuration.output;
      elements.inputHint.textContent = `${configuration.hint}。TXTのドロップにも対応しています`;
      elements.outputHint.textContent = "出力は直接編集できます";
      elements.source.placeholder = configuration.sourcePlaceholder;
      elements.output.placeholder = configuration.outputPlaceholder;
      elements.source.spellcheck = true;
      elements.source.removeAttribute("autocapitalize");
      elements.source.removeAttribute("lang");
      elements.output.removeAttribute("lang");
      return;
    }

    if (mode !== "romaji") {
      elements.sourceLabel.textContent = "入力";
      elements.outputLabel.textContent = "出力";
      elements.inputHint.textContent = ".txtをここへドロップしても読み込めます";
      elements.outputHint.textContent = "出力は直接編集できます";
      elements.source.placeholder = "ここに文章を入力してください";
      elements.output.placeholder = "変換結果がここに表示されます";
      elements.source.spellcheck = true;
      elements.source.removeAttribute("autocapitalize");
      elements.source.removeAttribute("lang");
      elements.output.removeAttribute("lang");
      return;
    }

    const toKana = settings.romajiDirection === "toKana";
    const targetLabel = settings.romajiScript === "katakana" ? "カタカナ" : "ひらがな";
    elements.sourceLabel.textContent = toKana ? "入力（ローマ字）" : "入力（かな）";
    elements.outputLabel.textContent = toKana ? `出力（${targetLabel}）` : "出力（ローマ字）";
    elements.inputHint.textContent = toKana ? "例：toukyou / gakkou / matcha" : "ひらがな・カタカナの混在にも対応";
    elements.outputHint.textContent = "入力に合わせて自動変換します。出力は直接編集できます";
    elements.source.placeholder = toKana ? "ローマ字を入力してください" : "ひらがな・カタカナを入力してください";
    elements.output.placeholder = toKana ? `${targetLabel}の変換結果` : "ローマ字の変換結果";
    elements.source.spellcheck = false;
    elements.source.setAttribute("autocapitalize", "none");
    elements.source.lang = toKana ? "en" : "ja";
    elements.output.lang = toKana ? "ja" : "en";
  }

  function updateRomajiControls() {
    const toKana = settings.romajiDirection === "toKana";
    elements.romajiScriptOptions.hidden = !toKana;
    elements.romajiOutputOptions.hidden = toKana;
    if (currentMode === "romaji") updateSharedLabels("romaji");
  }

  function renderRomajiDiagnostics(result) {
    const unconverted = Array.isArray(result.unconverted) ? result.unconverted : [];
    const ambiguities = Array.isArray(result.ambiguities) ? result.ambiguities : [];
    const total = unconverted.length + ambiguities.length;
    elements.romajiIssueList.replaceChildren();
    elements.romajiDiagnostics.hidden = total === 0;

    if (!total) {
      elements.romajiDiagnosticsSummary.textContent = "";
    } else {
      elements.romajiDiagnosticsSummary.textContent = `未変換 ${formatNumber(unconverted.length)}件・要確認 ${formatNumber(ambiguities.length)}件`;
      const groups = [
        { title: "未変換のまま残した部分", label: "未変換", items: unconverted },
        { title: "複数の読み方がある表記", label: "要確認", items: ambiguities }
      ];
      groups.forEach((group) => {
        if (!group.items.length) return;
        const section = document.createElement("section");
        section.className = "roman-issue-group";
        const heading = document.createElement("h5");
        heading.textContent = group.title;
        const list = document.createElement("ul");
        group.items.forEach((issue) => {
          const item = document.createElement("li");
          const badge = document.createElement("span");
          badge.className = "roman-issue-badge";
          badge.textContent = group.label;
          const copy = document.createElement("span");
          const source = document.createElement("strong");
          source.textContent = issue.source;
          const message = document.createElement("span");
          message.textContent = issue.message;
          copy.append(source, message);
          if (Array.isArray(issue.choices) && issue.choices.length) {
            const choices = document.createElement("small");
            choices.textContent = `候補：${issue.choices.join(" ／ ")}`;
            copy.appendChild(choices);
          }
          item.append(badge, copy);
          list.appendChild(item);
        });
        section.append(heading, list);
        elements.romajiIssueList.appendChild(section);
      });
    }

    if (romajiAnnouncementTimer) root.clearTimeout(romajiAnnouncementTimer);
    romajiAnnouncementTimer = root.setTimeout(() => {
      elements.romajiConversionStatus.textContent = total
        ? `未変換が${unconverted.length}件、読み方の確認候補が${ambiguities.length}件あります。`
        : "入力された範囲を変換しました。";
    }, romajiAnnouncementDelay);
  }

  function updateMobileNavigation(mode) {
    const configurations = {
      count: { target: "countResults", label: "集計結果へ" },
      mojibake: { target: "outputRegion", label: "出力へ" },
      mirror: { target: "outputRegion", label: "出力へ" },
      kana: { target: "kanaResultsRegion", label: "候補へ" },
      romaji: { target: "outputRegion", label: "出力へ" },
      decoration: { target: "panel-decoration", label: "飾り文字へ" }
    };
    const configuration = configurations[mode] || configurations.count;
    elements.mobileModeSelect.value = mode;
    elements.mobileResultJumpLabel.textContent = configuration.label;
    elements.mobileResultJump.setAttribute("aria-controls", configuration.target);
    elements.mobileResultJump.setAttribute("aria-label", `${configuration.label}移動`);
  }

  function jumpToMobileResult() {
    const target = document.getElementById(elements.mobileResultJump.getAttribute("aria-controls"));
    if (!target) return;
    try {
      target.focus({ preventScroll: true });
    } catch (_error) {
      target.focus();
    }
    const reducedMotion = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ block: "start", behavior: reducedMotion ? "auto" : "smooth" });
  }

  function selectMode(mode, options) {
    const nextMode = validSettings.mode.includes(mode) ? mode : "count";
    const previousMode = currentMode;
    const shouldFocus = Boolean(options && options.focusTab);

    if (nextMode !== "count" && countAnnouncementTimer) {
      root.clearTimeout(countAnnouncementTimer);
      countAnnouncementTimer = 0;
    }

    if (previousMode !== nextMode) {
      captureTransformState(previousMode);
    }
    currentMode = nextMode;

    elements.tabs.forEach((tab) => {
      const selected = tab.dataset.mode === nextMode;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && shouldFocus) {
        tab.focus();
      }
    });
    elements.panels.forEach((panel) => {
      panel.hidden = panel.id !== `panel-${nextMode}`;
    });
    updateMobileNavigation(nextMode);

    const isKana = nextMode === "kana";
    const isTransform = nextMode === "mojibake" || nextMode === "mirror" || nextMode === "romaji";
    elements.sharedInputRegion.hidden = isKana || nextMode === "decoration";
    elements.sharedActionBar.hidden = isKana || nextMode === "decoration";
    elements.outputRegion.hidden = !isTransform;
    elements.swapButton.hidden = !isTransform;
    elements.saveButton.hidden = !isTransform || nextMode === "romaji";
    elements.copyLabel.textContent = nextMode === "romaji" ? "結果をコピー" : isTransform ? "出力をコピー" : "統計をコピー";
    updateSharedLabels(nextMode);
    updateSelectionTransformUi(currentTransformSelection(), false);
    updateBatchModeSummary();

    if (isTransform) {
      const scopeSignature = currentTransformScopeSignature();
      if (nextMode === "mojibake" && (transformStates.mojibake.sourceRevision !== sourceRevision || transformStates.mojibake.scopeSignature !== scopeSignature)) {
        invalidateMojibakeOutput();
      } else if (nextMode === "mirror" && (transformStates.mirror.sourceRevision !== sourceRevision || transformStates.mirror.scopeSignature !== scopeSignature)) {
        updateMirrorOutput();
      } else if (nextMode === "romaji" && (transformStates.romaji.sourceRevision !== sourceRevision || transformStates.romaji.scopeSignature !== scopeSignature)) {
        updateRomajiOutput();
      } else {
        renderTransformState(nextMode);
      }
    }

    settings.mode = nextMode;
    saveSettings();
    updateActionState();
    if (nextMode === "decoration" && tools.openDecoration) {
      tools.openDecoration({
        source: options && options.decorationSource,
        onToast: showToast,
        onBack: () => selectMode("count", { focusTab: true })
      });
    }
    if (announcementsReady && previousMode !== nextMode && nextMode === "count") {
      scheduleCountAnnouncement();
    }
  }

  function updateLimit() {
    const selected = elements.characterLimit.value;
    elements.customLimitWrap.hidden = selected !== "custom";
    elements.limitStatus.classList.remove("is-over");

    let limit = 0;
    if (selected === "custom") {
      limit = Math.floor(Number(elements.customLimit.value));
      if (!Number.isFinite(limit) || limit < 1) {
        elements.limitStatus.textContent = "上限を入力";
        return;
      }
    } else {
      limit = Number(selected);
    }

    if (!limit) {
      elements.limitStatus.textContent = "";
      return;
    }

    const remaining = limit - latestAnalysis.total;
    if (remaining >= 0) {
      elements.limitStatus.textContent = `残り ${formatNumber(remaining)}文字`;
    } else {
      elements.limitStatus.textContent = `${formatNumber(Math.abs(remaining))}文字オーバー`;
      elements.limitStatus.classList.add("is-over");
    }
  }

  function updateStatistics() {
    latestAnalysis = tools.count.analyze(elements.source.value);
    Object.keys(elements.stats).forEach((key) => {
      elements.stats[key].textContent = formatNumber(latestAnalysis[key]);
    });
    elements.liveCharacterCount.textContent = `${formatNumber(latestAnalysis.total)}文字`;
    updateLimit();
    updateSelection(false);
  }

  function updateSelection(shouldAnnounce) {
    const start = elements.source.selectionStart;
    const end = elements.source.selectionEnd;
    if (typeof start !== "number" || typeof end !== "number" || end <= start) {
      elements.selectionStatus.hidden = true;
      updateSelectionTransformUi(null, shouldAnnounce);
      if (shouldAnnounce) scheduleCountAnnouncement();
      return;
    }
    const count = tools.unicode.graphemeCount(elements.source.value.slice(start, end));
    elements.selectionCount.textContent = formatNumber(count);
    elements.selectionStatus.hidden = count === 0;
    updateSelectionTransformUi({ start, end, count }, shouldAnnounce);
    if (shouldAnnounce) scheduleCountAnnouncement();
  }

  function currentTransformSelection() {
    const start = elements.source.selectionStart;
    const end = elements.source.selectionEnd;
    if (typeof start !== "number" || typeof end !== "number" || end <= start) return null;
    return { start, end };
  }

  function currentTransformCharacterLength() {
    const selection = elements.transformSelectionOnly.checked ? currentTransformSelection() : null;
    return selection ? selection.end - selection.start : elements.source.value.length;
  }

  function ensureTransformWithinLimit(maximumCharacters, label) {
    const length = currentTransformCharacterLength();
    if (length <= maximumCharacters) return true;
    const message = `${label}は、加工する範囲を${formatNumber(maximumCharacters)}文字以下にしてください。範囲選択して「選択部分だけ加工」も利用できます。`;
    if (transformStates[currentMode]) transformStates[currentMode].sourceRevision = -1;
    setTransformOutput("", "", message, "error");
    return false;
  }

  function checkedTransformResult(text) {
    const result = String(text == null ? "" : text);
    if (result.length > tools.workflow.maximumOutputCharacters) throw new Error("OUTPUT_TOO_LARGE");
    return result;
  }

  function currentTransformScopeSignature() {
    const selection = elements.transformSelectionOnly.checked ? currentTransformSelection() : null;
    return selection ? `selection:${selection.start}:${selection.end}` : "all";
  }

  function updateSelectionTransformUi(selection, shouldRefresh) {
    const supportsSelection = currentMode === "mojibake" || currentMode === "mirror" || currentMode === "romaji";
    elements.selectionTransformBar.hidden = !supportsSelection;
    if (!supportsSelection) return;
    const activeSelection = selection || currentTransformSelection();
    const signature = activeSelection ? `${activeSelection.start}:${activeSelection.end}` : "";
    const changed = signature !== transformSelectionSignature;
    transformSelectionSignature = signature;
    const count = activeSelection
      ? Number.isFinite(activeSelection.count) ? activeSelection.count : tools.unicode.graphemeCount(elements.source.value.slice(activeSelection.start, activeSelection.end))
      : 0;
    const selectionScopeWasActive = elements.transformSelectionOnly.checked;
    elements.transformSelectionOnly.disabled = !activeSelection;
    if (!activeSelection && elements.transformSelectionOnly.checked) elements.transformSelectionOnly.checked = false;
    elements.selectionTransformStatus.textContent = activeSelection
      ? `${formatNumber(count)}文字を選択中です。オンにすると選択部分だけを加工し、それ以外はそのまま出力します。`
      : "入力欄で範囲を選ぶと利用できます。";
    if (!shouldRefresh || !changed || !selectionScopeWasActive) return;
    if (currentMode === "mojibake") {
      invalidateMojibakeOutput();
    } else if (currentMode === "mirror") {
      updateMirrorOutput();
    } else if (currentMode === "romaji") {
      updateRomajiOutput();
    }
  }

  function applyCurrentTransformScope(transformer) {
    const selection = elements.transformSelectionOnly.checked ? currentTransformSelection() : null;
    if (!selection) {
      const transformed = String(transformer(elements.source.value));
      return { text: transformed, transformed, selection: null, scope: "all" };
    }
    return tools.workflow.applyToSelection(elements.source.value, selection.start, selection.end, transformer);
  }

  function scopeBadgeSuffix(result) {
    return result && result.scope === "selection" ? "・選択範囲のみ" : "";
  }

  function updateOutputCount() {
    const count = tools.unicode.graphemeCount(elements.output.value);
    elements.outputCharacterCount.textContent = `${formatNumber(count)}文字`;
  }

  function updateActionState() {
    const hasSource = elements.source.value.length > 0;
    const hasOutput = elements.output.value.length > 0;
    const mojibakeFresh = currentMode !== "mojibake" || (
      transformStates.mojibake.initialized && transformStates.mojibake.sourceRevision === sourceRevision &&
      transformStates.mojibake.scopeSignature === currentTransformScopeSignature()
    );
    elements.copyButton.disabled = currentMode === "count" ? !hasSource : !hasOutput || !mojibakeFresh;
    elements.swapButton.disabled = (!hasSource && !hasOutput) || !mojibakeFresh;
    elements.saveButton.disabled = !hasOutput || !mojibakeFresh;
    elements.saveInputButton.disabled = !hasSource;
    elements.clearButton.disabled = !hasSource && !hasOutput;
    elements.encodeMojibake.disabled = !hasSource;
    elements.decodeMojibake.disabled = !hasSource;
    elements.createGlitch.disabled = !hasSource;
    elements.rerollGlitch.disabled = !hasSource;
    updateGlitchActionState();
  }

  function refreshSource(shouldRefreshTransform) {
    updateStatistics();
    if (shouldRefreshTransform) {
      if (currentMode === "mirror") updateMirrorOutput();
      if (currentMode === "romaji") updateRomajiOutput();
    }
    updateActionState();
  }

  function scheduleSourceRefresh(shouldRefreshTransform) {
    pendingMirrorRefresh = pendingMirrorRefresh || shouldRefreshTransform;
    if (scheduledFrame) {
      return;
    }
    scheduledFrame = root.requestAnimationFrame(() => {
      scheduledFrame = 0;
      const refreshMirror = pendingMirrorRefresh;
      pendingMirrorRefresh = false;
      refreshSource(refreshMirror);
    });
  }

  function updateMirrorOutput() {
    if (!ensureTransformWithinLimit(tools.workflow.maximumTransformCharacters, "通常の変換")) return;
    const method = selectedValue("mirrorMethod") || "reverse";
    const lineByLine = elements.lineByLine.checked;
    const result = applyCurrentTransformScope((text) => checkedTransformResult(tools.mirror.transform(text, method, lineByLine)));
    transformStates.mirror.sourceRevision = sourceRevision;
    setTransformOutput(
      result.text,
      `変換方式：${tools.mirror.labels[method]}${scopeBadgeSuffix(result)}`,
      "",
      ""
    );
  }

  function updateRomajiOutput() {
    if (!ensureTransformWithinLimit(tools.workflow.maximumTransformCharacters, "通常の変換")) return;
    const direction = settings.romajiDirection;
    const script = settings.romajiScript;
    const options = {
      scheme: settings.romajiSystem,
      longVowels: settings.romajiLongVowel,
      particles: settings.romajiParticles
    };
    let analysis;
    const result = applyCurrentTransformScope((text) => {
      analysis = tools.romanKana.analyze(text, direction, script, options);
      return checkedTransformResult(analysis.text);
    });
    const badge = direction === "toRomaji"
      ? `かな → ローマ字：${tools.romanKana.schemeLabels[settings.romajiSystem]}・${tools.romanKana.longVowelLabels[settings.romajiLongVowel]}・${tools.romanKana.particleLabels[settings.romajiParticles]}`
      : `ローマ字 → ${script === "katakana" ? "カタカナ" : "ひらがな"}`;
    transformStates.romaji.sourceRevision = sourceRevision;
    setTransformOutput(result.text, `${badge}${scopeBadgeSuffix(result)}`, "", "");
    renderRomajiDiagnostics(analysis);
  }

  function updateMojibakeMethodDescription() {
    const method = elements.mojibakeMethod.value;
    elements.mojibakeMethodDescription.textContent = tools.mojibake.methodDescriptions[method] || "";
    updateBatchModeSummary();
  }

  function updateMojibakePurpose(shouldInvalidate) {
    const purpose = selectedValue("mojibakePurpose") || "repair";
    elements.repairOptions.hidden = purpose !== "repair";
    elements.encodeOptions.hidden = purpose !== "encode";
    elements.creativeOptions.hidden = purpose !== "creative";
    elements.creativeWarning.hidden = purpose !== "creative";
    elements.glitchWorkbench.hidden = purpose !== "creative";
    settings.mojibakePurpose = purpose;
    saveSettings();
    updateBatchModeSummary();
    if (currentMode === "mojibake") updateSharedLabels("mojibake");
    if (shouldInvalidate) {
      activeGlitchPresetName = "";
      invalidateMojibakeOutput();
    }
  }

  function encodeMojibake() {
    if (!ensureTransformWithinLimit(tools.workflow.maximumTransformCharacters, "通常の変換")) return;
    const method = elements.mojibakeMethod.value;
    try {
      const result = applyCurrentTransformScope((source) => {
        const encoded = tools.mojibake.encode(source, method);
        if (tools.mojibake.decode(encoded, method) !== source) throw new Error("ROUNDTRIP_FAILED");
        return checkedTransformResult(encoded);
      });
      transformStates.mojibake.sourceRevision = sourceRevision;
      setTransformOutput(
        result.text,
        `戻せる形に変換済み：${tools.mojibake.methodLabels[method]}${scopeBadgeSuffix(result)}`,
        "復元チェック済みです。「文字化けを直す」から元に戻せます。",
        "info"
      );
    } catch (error) {
      invalidateMojibakeOutput(mojibakeErrorMessage(error), "error");
    }
  }

  function decodeMojibake() {
    if (!ensureTransformWithinLimit(tools.workflow.maximumTransformCharacters, "通常の変換")) return;
    try {
      let decoded;
      const result = applyCurrentTransformScope((source) => {
        decoded = tools.mojibake.decodeAuto(source);
        return checkedTransformResult(decoded.text);
      });
      transformStates.mojibake.sourceRevision = sourceRevision;
      setTransformOutput(
        result.text,
        `文字化けを修復：${tools.mojibake.methodLabels[decoded.method]}${scopeBadgeSuffix(result)}`,
        decoded.inferred ? "推定復元しました。意図した文章になっているか確認してください。" : "復元できました。",
        "info"
      );
    } catch (error) {
      invalidateMojibakeOutput(mojibakeErrorMessage(error), "error");
    }
  }

  function glitchBaseSignature(source, intensity, scope, selection) {
    return `${intensity}\u0000${scope}\u0000${selection ? `${selection.start}:${selection.end}` : "all"}\u0000${tools.workflow.fingerprintText(source)}`;
  }

  function createCreativeGlitch(nextVariant, options) {
    flushManualGlitchHistory();
    if (!elements.source.value) return null;
    if (!ensureTransformWithinLimit(tools.workflow.maximumCreativeCharacters, "演出用加工")) return null;
    const configuration = options || {};
    const intensity = configuration.intensity || selectedValue("glitchIntensity") || "light";
    const selection = elements.transformSelectionOnly.checked ? currentTransformSelection() : null;
    const scope = selection ? "selection" : "all";
    const locked = configuration.seedMode ? configuration.seedMode === "fixed" : elements.glitchSeedLocked.checked;
    let seed = tools.workflow.normalizeSeed(configuration.seed != null ? configuration.seed : elements.glitchSeed.value);
    if (locked && !seed) {
      seed = `scene-${Date.now().toString(36)}`;
      elements.glitchSeed.value = seed;
    }
    const baseSignature = glitchBaseSignature(elements.source.value, intensity, scope, selection);
    if (Number.isInteger(configuration.variation)) {
      glitchVariation = configuration.variation;
    } else if (!locked) {
      if (!nextVariant || baseSignature !== glitchSignature) glitchVariation = 0;
      else glitchVariation += 1;
    }
    const appliedVariation = locked ? tools.workflow.seedToVariation(seed) : glitchVariation;
    glitchSignature = baseSignature;
    const result = applyCurrentTransformScope((text) => checkedTransformResult(tools.mojibake.creative(text, intensity, appliedVariation)));
    const patternLabel = locked ? `シード ${seed}` : `パターン ${glitchVariation + 1}`;
    const badge = `演出用に崩す：${tools.mojibake.intensityLabels[intensity]}・${patternLabel}${scopeBadgeSuffix(result)}`;
    transformStates.mojibake.sourceRevision = sourceRevision;
    setTransformOutput(
      result.text,
      badge,
      "この出力は見た目を優先した加工のため、元の文章には復元できません。",
      "info"
    );
    const entry = {
      id: createStorageId("glitch"),
      source: elements.source.value,
      output: result.text,
      badge,
      message: "この出力は見た目を優先した加工のため、元の文章には復元できません。",
      intensity,
      variation: glitchVariation,
      seedMode: locked ? "fixed" : "variation",
      seed: locked ? seed : "",
      scope,
      selection: result.selection,
      presetName: activeGlitchPresetName,
      baseSignature,
      signature: `${baseSignature}\u0000${locked ? seed : glitchVariation}`,
      createdAt: Date.now()
    };
    recordGlitchHistory(entry);
    return entry;
  }

  function setGlitchWorkbenchStatus(message, isError) {
    elements.glitchWorkbenchStatus.textContent = message || "";
    elements.glitchWorkbenchStatus.classList.toggle("is-error", Boolean(isError));
  }

  function glitchEntryLabel(entry) {
    const intensity = tools.mojibake.intensityLabels[entry.intensity] || entry.intensity;
    const pattern = entry.seedMode === "fixed" ? `シード ${entry.seed}` : `パターン ${entry.variation + 1}`;
    return `${intensity}・${pattern}${entry.scope === "selection" ? "・選択範囲" : ""}`;
  }

  function currentGlitchEntry() {
    const entry = glitchHistoryState.items[glitchHistoryState.index];
    return entry && entry.output === elements.output.value && entry.source === elements.source.value &&
      transformStates.mojibake.sourceRevision === sourceRevision &&
      transformStates.mojibake.scopeSignature === currentTransformScopeSignature() ? entry : null;
  }

  function createCurrentGlitchEntry() {
    const selection = elements.transformSelectionOnly.checked ? currentTransformSelection() : null;
    const locked = elements.glitchSeedLocked.checked;
    const seed = tools.workflow.normalizeSeed(elements.glitchSeed.value);
    const intensity = selectedValue("glitchIntensity") || "light";
    return {
      id: createStorageId("glitch"),
      source: elements.source.value,
      output: elements.output.value,
      badge: transformStates.mojibake.badge || `演出用に崩す：${tools.mojibake.intensityLabels[intensity]}`,
      message: transformStates.mojibake.message || "この出力は見た目を優先した加工のため、元の文章には復元できません。",
      intensity,
      variation: glitchVariation,
      seedMode: locked ? "fixed" : "variation",
      seed: locked ? seed : "",
      scope: selection ? "selection" : "all",
      selection,
      presetName: activeGlitchPresetName,
      baseSignature: glitchBaseSignature(elements.source.value, intensity, selection ? "selection" : "all", selection),
      signature: `manual\u0000${tools.workflow.fingerprintText(elements.source.value)}\u0000${tools.workflow.fingerprintText(elements.output.value)}`,
      createdAt: Date.now()
    };
  }

  function updateGlitchActionState() {
    const creativeActive = currentMode === "mojibake" && settings.mojibakePurpose === "creative";
    const hasFreshOutput = creativeActive && elements.output.value.length > 0 && transformStates.mojibake.sourceRevision === sourceRevision;
    const historyMatchesScreen = Boolean(currentGlitchEntry());
    elements.glitchUndoButton.disabled = !glitchHistoryState.items.length || (historyMatchesScreen && glitchHistoryState.index <= 0);
    elements.glitchRedoButton.disabled = !historyMatchesScreen || glitchHistoryState.index < 0 || glitchHistoryState.index >= glitchHistoryState.items.length - 1;
    elements.glitchSaveCandidateButton.disabled = !hasFreshOutput;
    elements.glitchCompareButton.disabled = !hasFreshOutput;
    elements.glitchExportRecipeButton.disabled = !hasFreshOutput || (elements.glitchSeedLocked.checked && !tools.workflow.normalizeSeed(elements.glitchSeed.value));
    elements.glitchSeed.disabled = !elements.glitchSeedLocked.checked;
    elements.glitchReplayButton.disabled = !creativeActive || !elements.source.value || !elements.glitchSeedLocked.checked || !tools.workflow.normalizeSeed(elements.glitchSeed.value);
    elements.rerollGlitch.disabled = !elements.source.value || (creativeActive && elements.glitchSeedLocked.checked);
    const hasPreset = Boolean(elements.glitchPresetSelect.value);
    elements.glitchApplyPresetButton.disabled = !hasPreset;
    elements.glitchDeletePresetButton.disabled = !hasPreset;
  }

  function recordGlitchHistory(entry) {
    if (!entry || !entry.output) return;
    entry.byteSize = Number.isFinite(entry.byteSize)
      ? entry.byteSize
      : tools.workflow.utf8ByteLength(entry.source) + tools.workflow.utf8ByteLength(entry.output);
    if (entry.byteSize > glitchHistoryByteBudget) {
      renderGlitchHistory();
      updateGlitchActionState();
      setGlitchWorkbenchStatus("長い結果のため、メモリ保護として履歴には保持しませんでした。結果は出力欄から保存できます。", false);
      return;
    }
    glitchHistoryState = tools.workflow.pushHistory(glitchHistoryState, entry, 30);
    let totalBytes = glitchHistoryState.items.reduce((total, item) => {
      item.byteSize = Number.isFinite(item.byteSize)
        ? item.byteSize
        : tools.workflow.utf8ByteLength(item.source || "") + tools.workflow.utf8ByteLength(item.output || "");
      return total + item.byteSize;
    }, 0);
    while (glitchHistoryState.items.length > 1 && totalBytes > glitchHistoryByteBudget) {
      const removed = glitchHistoryState.items.shift();
      totalBytes -= removed.byteSize || 0;
      glitchHistoryState.index = Math.max(0, glitchHistoryState.index - 1);
    }
    renderGlitchHistory();
    updateGlitchActionState();
  }

  function restoreGlitchEntry(entry, historyIndex) {
    if (!entry) return;
    flushManualGlitchHistory();
    const refreshedHistoryIndex = Number.isInteger(historyIndex)
      ? glitchHistoryState.items.findIndex((item) => item === entry || (item.id && item.id === entry.id))
      : -1;
    if (currentMode !== "mojibake") selectMode("mojibake");
    settings.mojibakePurpose = "creative";
    settings.glitchIntensity = entry.intensity;
    selectRadio("mojibakePurpose", "creative");
    selectRadio("glitchIntensity", entry.intensity);
    updateMojibakePurpose(false);
    elements.source.value = entry.source;
    elements.transformSelectionOnly.checked = entry.scope === "selection" && Boolean(entry.selection);
    if (entry.selection) elements.source.setSelectionRange(entry.selection.start, entry.selection.end);
    elements.glitchSeedLocked.checked = entry.seedMode === "fixed";
    elements.glitchSeed.value = entry.seed || "";
    setActiveGlitchPreset(entry.presetName || "", true, entry);
    glitchVariation = entry.variation;
    glitchSignature = entry.baseSignature || glitchBaseSignature(entry.source, entry.intensity, entry.scope, entry.selection);
    sourceRevision += 1;
    refreshSource(false);
    transformStates.mojibake.sourceRevision = sourceRevision;
    setTransformOutput(entry.output, entry.badge || `演出用に崩す：${glitchEntryLabel(entry)}`, entry.message, "info");
    if (refreshedHistoryIndex >= 0) {
      glitchHistoryState.index = refreshedHistoryIndex;
    } else if (Number.isInteger(historyIndex)) {
      recordGlitchHistory({ ...entry, id: createStorageId("glitch"), byteSize: undefined, createdAt: Date.now() });
    }
    renderGlitchHistory();
    updateGlitchActionState();
    scheduleInputDraftSave();
    setGlitchWorkbenchStatus(`${glitchEntryLabel(entry)}を表示しました。`, false);
  }

  function moveGlitchHistory(delta) {
    flushManualGlitchHistory();
    if (!currentGlitchEntry()) {
      const indexed = glitchHistoryState.items[glitchHistoryState.index];
      if (indexed) restoreGlitchEntry(indexed, glitchHistoryState.index);
      return;
    }
    const moved = tools.workflow.moveHistory(glitchHistoryState, delta);
    glitchHistoryState = moved.state;
    if (moved.entry) restoreGlitchEntry(moved.entry, glitchHistoryState.index);
  }

  function flushManualGlitchHistory() {
    if (glitchManualHistoryTimer) root.clearTimeout(glitchManualHistoryTimer);
    glitchManualHistoryTimer = 0;
    const entry = glitchPendingManualEntry;
    glitchPendingManualEntry = null;
    if (!entry || !entry.output) return false;
    recordGlitchHistory(entry);
    return true;
  }

  function scheduleManualGlitchHistory() {
    if (glitchManualHistoryTimer) root.clearTimeout(glitchManualHistoryTimer);
    const entry = createCurrentGlitchEntry();
    entry.badge = "手動編集済み";
    entry.message = "手動編集した演出結果です。Undoで編集前の候補へ戻れます。";
    glitchPendingManualEntry = entry;
    glitchManualHistoryTimer = root.setTimeout(flushManualGlitchHistory, 650);
  }

  function appendGlitchItemButton(container, label, action, deleteStyle, ariaLabel) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `glitch-mini-button${deleteStyle ? " is-delete" : ""}`;
    button.textContent = label;
    if (ariaLabel) button.setAttribute("aria-label", ariaLabel);
    button.addEventListener("click", action);
    container.appendChild(button);
  }

  function renderGlitchHistory() {
    elements.glitchHistoryList.replaceChildren();
    elements.glitchHistoryCount.textContent = `${formatNumber(glitchHistoryState.items.length)}件`;
    elements.glitchHistoryEmpty.hidden = glitchHistoryState.items.length > 0;
    glitchHistoryState.items.slice().reverse().forEach((entry, reverseIndex) => {
      const index = glitchHistoryState.items.length - 1 - reverseIndex;
      const item = document.createElement("li");
      item.className = `glitch-history-item${index === glitchHistoryState.index ? " is-current" : ""}`;
      if (index === glitchHistoryState.index) item.setAttribute("aria-current", "true");
      const copy = document.createElement("span");
      copy.className = "glitch-item-copy";
      const title = document.createElement("strong");
      title.textContent = glitchEntryLabel(entry);
      const preview = document.createElement("small");
      preview.textContent = entry.output.slice(0, 256).replace(/\s+/gu, " ").slice(0, 70) || "（空の結果）";
      copy.append(title, preview);
      const actions = document.createElement("span");
      actions.className = "glitch-item-actions";
      appendGlitchItemButton(actions, "表示", () => restoreGlitchEntry(entry, index), false, `${glitchEntryLabel(entry)}を表示`);
      appendGlitchItemButton(actions, "比較", () => addGlitchComparison(entry.output, glitchEntryLabel(entry)), false, `${glitchEntryLabel(entry)}を比較へ追加`);
      item.append(copy, actions);
      elements.glitchHistoryList.appendChild(item);
    });
    updateGlitchActionState();
  }

  function addGlitchComparison(output, label) {
    if (!output) return;
    const candidate = { output, label: label || "演出候補" };
    if (glitchComparison.length < 2) glitchComparison.push(candidate);
    else glitchComparison = [glitchComparison[1], candidate];
    renderGlitchComparison();
    setGlitchWorkbenchStatus(glitchComparison.length === 1 ? "案Aへ追加しました。もう1案を追加すると左右比較できます。" : "2案を左右に表示しました。", false);
  }

  function renderGlitchComparison() {
    elements.glitchCompareRegion.hidden = glitchComparison.length === 0;
    elements.glitchCompareLeft.value = glitchComparison[0] ? glitchComparison[0].output : "";
    elements.glitchCompareRight.value = glitchComparison[1] ? glitchComparison[1].output : "";
    elements.glitchCompareLeft.setAttribute("aria-label", glitchComparison[0] ? `案A：${glitchComparison[0].label}` : "案A");
    elements.glitchCompareRight.setAttribute("aria-label", glitchComparison[1] ? `案B：${glitchComparison[1].label}` : "案B");
  }

  function renderGlitchSavedCandidates() {
    elements.glitchSavedList.replaceChildren();
    elements.glitchSavedCount.textContent = `${formatNumber(glitchSavedCandidates.length)}件`;
    elements.glitchSavedEmpty.hidden = glitchSavedCandidates.length > 0;
    glitchSavedCandidates.forEach((candidate) => {
      const item = document.createElement("li");
      item.className = "glitch-saved-item";
      const copy = document.createElement("span");
      copy.className = "glitch-item-copy";
      const title = document.createElement("strong");
      title.textContent = candidate.label;
      const preview = document.createElement("small");
      preview.textContent = candidate.output.slice(0, 256).replace(/\s+/gu, " ").slice(0, 70);
      copy.append(title, preview);
      const actions = document.createElement("span");
      actions.className = "glitch-item-actions";
      appendGlitchItemButton(actions, "表示", () => restoreGlitchEntry({
        ...candidate,
        badge: `保存候補：${candidate.label}`,
        message: "この端末に保存していた演出候補を表示しています。",
        signature: `saved\u0000${candidate.id}`
      }), false, `${candidate.label}を表示`);
      appendGlitchItemButton(actions, "比較", () => addGlitchComparison(candidate.output, candidate.label), false, `${candidate.label}を比較へ追加`);
      appendGlitchItemButton(actions, "削除", () => deleteGlitchCandidate(candidate.id), true, `${candidate.label}を削除`);
      item.append(copy, actions);
      elements.glitchSavedList.appendChild(item);
    });
  }

  async function saveCurrentGlitchCandidate() {
    const entry = currentGlitchEntry() || createCurrentGlitchEntry();
    if (!entry.source || !entry.output) return;
    if (entry.source.length > 200000 || entry.output.length > 200000) {
      setGlitchWorkbenchStatus("候補保存は入力・出力とも20万文字までです。レシピJSONまたはTXT保存をご利用ください。", true);
      return;
    }
    const candidate = tools.workflow.normalizeSavedCandidate({
      id: createStorageId("saved"),
      label: glitchEntryLabel(entry),
      source: entry.source,
      output: entry.output,
      sourcePreview: entry.source.replace(/[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu, " ").replace(/\s+/gu, " ").slice(0, 240),
      intensity: entry.intensity,
      scope: entry.scope,
      selection: entry.selection,
      seedMode: entry.seedMode,
      seed: entry.seed,
      variation: entry.variation,
      createdAt: Date.now()
    });
    if (!candidate) {
      setGlitchWorkbenchStatus("この候補は端末内へ安全に保存できませんでした。", true);
      return;
    }
    try {
      const saved = await withLocalDataLock(() => {
        refreshGlitchLibraryFromStorage();
        const duplicate = glitchSavedCandidates.some((item) => item.output === candidate.output && item.source === candidate.source);
        if (!duplicate && glitchSavedCandidates.length >= tools.workflow.maximumSavedCandidates) return "FULL";
        const next = [candidate, ...glitchSavedCandidates.filter((item) => item.output !== candidate.output || item.source !== candidate.source)]
          .slice(0, tools.workflow.maximumSavedCandidates);
        if (!saveGlitchLibrary(next, glitchPresets)) return "FAILED";
        glitchSavedCandidates = next;
        return "SAVED";
      });
      if (saved === "FULL") {
        setGlitchWorkbenchStatus("保存候補は20件までです。不要な候補を削除してから保存してください。", true);
        return;
      }
      if (saved !== "SAVED") throw new Error("SAVE_FAILED");
      renderGlitchSavedCandidates();
      renderDeviceDataSummary();
      setGlitchWorkbenchStatus("候補をこの端末に保存しました。", false);
      showToast("演出候補を保存しました");
    } catch (_error) {
      refreshGlitchLibraryFromStorage();
      renderGlitchSavedCandidates();
      setGlitchWorkbenchStatus("候補を保存できませんでした。端末の保存容量をご確認ください。", true);
    }
  }

  async function deleteGlitchCandidate(id) {
    const target = glitchSavedCandidates.find((item) => item.id === id);
    if (target && !root.confirm(`保存候補「${target.label}」を削除しますか？`)) return;
    try {
      const removed = await withLocalDataLock(() => {
        refreshGlitchLibraryFromStorage();
        const next = glitchSavedCandidates.filter((item) => item.id !== id);
        if (next.length === glitchSavedCandidates.length || !saveGlitchLibrary(next, glitchPresets)) return false;
        glitchSavedCandidates = next;
        return true;
      });
      if (!removed) throw new Error("DELETE_FAILED");
      renderGlitchSavedCandidates();
      renderDeviceDataSummary();
      setGlitchWorkbenchStatus("保存候補を削除しました。", false);
    } catch (_error) {
      refreshGlitchLibraryFromStorage();
      renderGlitchSavedCandidates();
      setGlitchWorkbenchStatus("保存候補を削除できませんでした。", true);
    }
  }

  function renderGlitchPresets() {
    const selectedId = elements.glitchPresetSelect.value;
    elements.glitchPresetSelect.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = glitchPresets.length ? "プリセットを選択" : "保存済みプリセットなし";
    elements.glitchPresetSelect.appendChild(placeholder);
    glitchPresets.forEach((preset) => {
      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = preset.name;
      elements.glitchPresetSelect.appendChild(option);
    });
    if (glitchPresets.some((preset) => preset.id === selectedId)) elements.glitchPresetSelect.value = selectedId;
    updateGlitchActionState();
  }

  function setActiveGlitchPreset(name, syncSelection, configuration) {
    activeGlitchPresetName = typeof name === "string" ? name.trim() : "";
    if (!syncSelection) return;
    const matching = glitchPresets.find((preset) => {
      if (preset.name !== activeGlitchPresetName) return false;
      if (!configuration) return true;
      const seedLocked = configuration.seedMode
        ? configuration.seedMode === "fixed"
        : Boolean(configuration.seedLocked);
      return preset.intensity === configuration.intensity && preset.scope === configuration.scope &&
        preset.seedLocked === seedLocked && (!seedLocked || preset.seed === configuration.seed);
    });
    elements.glitchPresetSelect.value = matching ? matching.id : "";
  }

  async function saveGlitchPreset() {
    const name = elements.glitchPresetName.value.trim();
    const seedLocked = elements.glitchSeedLocked.checked;
    const seed = tools.workflow.normalizeSeed(elements.glitchSeed.value);
    if (!name) {
      setGlitchWorkbenchStatus("プリセット名を入力してください。", true);
      elements.glitchPresetName.focus();
      return;
    }
    if (seedLocked && !seed) {
      setGlitchWorkbenchStatus("固定するシードを入力してください。", true);
      elements.glitchSeed.focus();
      return;
    }
    const existing = glitchPresets.find((preset) => preset.name.toLocaleLowerCase("ja") === name.toLocaleLowerCase("ja"));
    const preset = tools.workflow.normalizePreset({
      id: existing ? existing.id : createStorageId("preset"),
      name,
      intensity: selectedValue("glitchIntensity") || "light",
      scope: elements.transformSelectionOnly.checked ? "selection" : "all",
      seedLocked,
      seed,
      createdAt: existing ? existing.createdAt : Date.now()
    });
    if (!preset) {
      setGlitchWorkbenchStatus("プリセット名または設定を保存できる形に整えてください。", true);
      return;
    }
    try {
      const saved = await withLocalDataLock(() => {
        refreshGlitchLibraryFromStorage();
        const sameName = glitchPresets.some((item) => item.id === preset.id || item.name.toLocaleLowerCase("ja") === preset.name.toLocaleLowerCase("ja"));
        if (!sameName && glitchPresets.length >= tools.workflow.maximumPresets) return "FULL";
        const withoutSame = glitchPresets.filter((item) => item.id !== preset.id && item.name.toLocaleLowerCase("ja") !== preset.name.toLocaleLowerCase("ja"));
        const next = [preset, ...withoutSame].slice(0, tools.workflow.maximumPresets);
        if (!saveGlitchLibrary(glitchSavedCandidates, next)) return "FAILED";
        glitchPresets = next;
        return "SAVED";
      });
      if (saved === "FULL") {
        setGlitchWorkbenchStatus("プリセットは12件までです。不要なプリセットを削除してから保存してください。", true);
        return;
      }
      if (saved !== "SAVED") throw new Error("SAVE_FAILED");
      renderGlitchPresets();
      elements.glitchPresetSelect.value = preset.id;
      setActiveGlitchPreset(preset.name, false);
      elements.glitchPresetName.value = "";
      updateGlitchActionState();
      renderDeviceDataSummary();
      setGlitchWorkbenchStatus(existing ? "同名プリセットを更新しました。" : "名前付きプリセットを保存しました。", false);
    } catch (_error) {
      refreshGlitchLibraryFromStorage();
      renderGlitchPresets();
      setGlitchWorkbenchStatus("プリセットを保存できませんでした。端末の保存容量をご確認ください。", true);
    }
  }

  function applySelectedGlitchPreset() {
    const preset = glitchPresets.find((item) => item.id === elements.glitchPresetSelect.value);
    if (!preset) return;
    settings.glitchIntensity = preset.intensity;
    selectRadio("glitchIntensity", preset.intensity);
    elements.glitchSeedLocked.checked = preset.seedLocked;
    elements.glitchSeed.value = preset.seed;
    const canUseSelection = preset.scope === "selection" && Boolean(currentTransformSelection());
    elements.transformSelectionOnly.checked = canUseSelection;
    setActiveGlitchPreset(preset.scope === "selection" && !canUseSelection ? "" : preset.name, false);
    saveSettings();
    invalidateMojibakeOutput();
    updateSelectionTransformUi(currentTransformSelection(), false);
    updateGlitchActionState();
    updateBatchModeSummary();
    setGlitchWorkbenchStatus(
      preset.scope === "selection" && !canUseSelection
        ? `「${preset.name}」を適用しました。選択範囲設定は、入力欄で範囲を選んでからオンにしてください。`
        : `「${preset.name}」を適用しました。`,
      false
    );
  }

  async function deleteSelectedGlitchPreset() {
    const id = elements.glitchPresetSelect.value;
    if (!id) return;
    const target = glitchPresets.find((item) => item.id === id);
    if (target && !root.confirm(`プリセット「${target.name}」を削除しますか？`)) return;
    try {
      const removed = await withLocalDataLock(() => {
        refreshGlitchLibraryFromStorage();
        const next = glitchPresets.filter((item) => item.id !== id);
        if (next.length === glitchPresets.length || !saveGlitchLibrary(glitchSavedCandidates, next)) return false;
        glitchPresets = next;
        return true;
      });
      if (!removed) throw new Error("DELETE_FAILED");
      if (target && activeGlitchPresetName === target.name) setActiveGlitchPreset("", false);
      renderGlitchPresets();
      renderDeviceDataSummary();
      setGlitchWorkbenchStatus("プリセットを削除しました。", false);
    } catch (_error) {
      refreshGlitchLibraryFromStorage();
      renderGlitchPresets();
      setGlitchWorkbenchStatus("プリセットを削除できませんでした。", true);
    }
  }

  function currentGlitchRecipePayload() {
    const entry = currentGlitchEntry() || createCurrentGlitchEntry();
    return {
      source: entry.source,
      output: entry.output,
      selection: entry.scope === "selection" ? entry.selection : null,
      settings: {
        intensity: entry.intensity,
        scope: entry.scope,
        seedMode: entry.seedMode,
        seed: entry.seed,
        variation: entry.variation
      },
      presetName: activeGlitchPresetName
    };
  }

  function exportGlitchRecipe() {
    try {
      const serialized = tools.workflow.serializeRecipe(currentGlitchRecipePayload(), new Date());
      if (tools.workflow.utf8ByteLength(serialized) > tools.workflow.maximumRecipeSize) throw new Error("RECIPE_TOO_LARGE");
      downloadText(serialized, "文字いじり-演出レシピ.json", "application/json;charset=utf-8");
      setGlitchWorkbenchStatus("入力・出力・設定を含むレシピJSONを保存しました。", false);
      showToast("演出レシピを保存しました");
    } catch (_error) {
      setGlitchWorkbenchStatus("レシピを書き出せませんでした。長い文章はTXT保存をご利用ください。", true);
    }
  }

  async function importGlitchRecipe(file) {
    if (!file) return;
    const importGeneration = ++recipeImportGeneration;
    const startingSourceRevision = sourceRevision;
    try {
      if (!/\.json$/i.test(String(file.name || "")) && file.type !== "application/json") throw new Error("INVALID_RECIPE");
      if (file.size > tools.workflow.maximumRecipeSize) throw new Error("RECIPE_TOO_LARGE");
      const recipe = tools.workflow.parseRecipe(await readTextFile(file));
      if (importGeneration !== recipeImportGeneration) throw new Error("RECIPE_SUPERSEDED");
      if (sourceRevision !== startingSourceRevision) throw new Error("RECIPE_INPUT_CHANGED");
      flushManualGlitchHistory();
      selectMode("mojibake");
      settings.mojibakePurpose = "creative";
      settings.glitchIntensity = recipe.settings.intensity;
      selectRadio("mojibakePurpose", "creative");
      selectRadio("glitchIntensity", recipe.settings.intensity);
      updateMojibakePurpose(false);
      elements.source.value = recipe.source;
      elements.glitchSeedLocked.checked = recipe.settings.seedMode === "fixed";
      elements.glitchSeed.value = recipe.settings.seed;
      elements.transformSelectionOnly.checked = recipe.settings.scope === "selection";
      setActiveGlitchPreset(recipe.presetName, true, recipe.settings);
      elements.glitchPresetName.value = recipe.presetName;
      if (recipe.selection) elements.source.setSelectionRange(recipe.selection.start, recipe.selection.end);
      sourceRevision += 1;
      refreshSource(false);
      updateSelection(false);
      glitchVariation = recipe.settings.variation;
      const generated = createCreativeGlitch(false, recipe.settings);
      if (generated && recipe.output && generated.output !== recipe.output) {
        const restored = {
          ...generated,
          id: createStorageId("recipe"),
          output: recipe.output,
          byteSize: undefined,
          badge: `${generated.badge}・レシピ保存出力`,
          message: "レシピに保存されていた出力をそのまま復元しました。",
          signature: `${generated.signature}\u0000stored-output`
        };
        transformStates.mojibake.sourceRevision = sourceRevision;
        setTransformOutput(restored.output, restored.badge, restored.message, "info");
        recordGlitchHistory(restored);
      }
      saveSettings();
      scheduleInputDraftSave();
      updateGlitchActionState();
      setGlitchWorkbenchStatus("レシピを読み込み、入力・選択範囲・設定・出力を再現しました。", false);
      showToast("演出レシピを再現しました");
    } catch (error) {
      setGlitchWorkbenchStatus(
        error && error.message === "RECIPE_TOO_LARGE"
          ? "レシピJSONは4MB以下にしてください。"
          : error && error.message === "RECIPE_SUPERSEDED"
            ? "新しいレシピの読み込みを優先し、この読み込みは中止しました。"
            : error && error.message === "RECIPE_INPUT_CHANGED"
              ? "読み込み中に入力が変更されたため、レシピの適用を中止しました。"
          : "このJSONは文字いじりツールの演出レシピとして読み込めません。",
        true
      );
    } finally {
      elements.glitchRecipeFileInput.value = "";
    }
  }

  function buildStatisticsText() {
    return [
      "文字数集計",
      `総文字数：${formatNumber(latestAnalysis.total)}`,
      `空白なし：${formatNumber(latestAnalysis.noSpaces)}`,
      `改行なし：${formatNumber(latestAnalysis.noLines)}`,
      `空白・改行なし：${formatNumber(latestAnalysis.noWhitespace)}`,
      `行数：${formatNumber(latestAnalysis.lines)}`,
      `単語数：${formatNumber(latestAnalysis.words)}`,
      `UTF-8：${formatNumber(latestAnalysis.bytes)} bytes`
    ].join("\n");
  }

  function fallbackCopy(text) {
    const active = document.activeElement;
    const selection = active && typeof active.selectionStart === "number" ? {
      start: active.selectionStart,
      end: active.selectionEnd,
      direction: active.selectionDirection
    } : null;
    const scrollX = root.scrollX;
    const scrollY = root.scrollY;
    const temporary = document.createElement("textarea");
    temporary.value = text;
    temporary.setAttribute("readonly", "");
    temporary.style.position = "fixed";
    temporary.style.left = "-9999px";
    temporary.style.top = "0";
    document.body.appendChild(temporary);
    temporary.select();

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch (error) {
      copied = false;
    }
    temporary.remove();

    if (active && typeof active.focus === "function") {
      try {
        active.focus({ preventScroll: true });
      } catch (error) {
        active.focus();
      }
      if (selection && typeof active.setSelectionRange === "function") {
        active.setSelectionRange(selection.start, selection.end, selection.direction || "none");
      }
    }
    root.scrollTo(scrollX, scrollY);

    if (!copied) {
      throw new Error("COPY_FAILED");
    }
  }

  async function copyText(text) {
    if (root.navigator.clipboard && typeof root.navigator.clipboard.writeText === "function") {
      try {
        await root.navigator.clipboard.writeText(text);
        return;
      } catch (error) {
        // Local files and denied permissions fall back to the selection method.
      }
    }
    fallbackCopy(text);
  }

  function showToast(message) {
    root.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastTimer = root.setTimeout(() => {
      elements.toast.classList.remove("is-visible");
    }, 2200);
  }

  function favoriteKey(kana, spelling) {
    return `${kana.normalize("NFC")}\u0000${spelling.normalize("NFC").toLowerCase()}`;
  }

  function isKanaFavorite(kana, spelling) {
    const target = favoriteKey(kana, spelling);
    return kanaFavorites.some((item) => favoriteKey(item.kana, item.spelling) === target);
  }

  async function copyKanaText(text, successMessage) {
    try {
      await copyText(text);
      showToast(successMessage || "コピーしました");
    } catch (error) {
      showToast("コピーできませんでした。手動で選択してコピーしてください");
    }
  }

  function makeKanaButton(label, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
  }

  function syncFavoriteButtons() {
    document.querySelectorAll(".kana-favorite-button").forEach((button) => {
      const favorite = isKanaFavorite(button.dataset.kana || "", button.dataset.spelling || "");
      button.setAttribute("aria-pressed", String(favorite));
      button.textContent = favorite ? "★ お気に入り済み" : "☆ お気に入り";
    });
  }

  async function toggleKanaFavorite(kana, spelling) {
    let result;
    try {
      result = await withLocalDataLock(() => {
        refreshKanaCollectionsFromStorage();
        const target = favoriteKey(kana, spelling);
        const existingIndex = kanaFavorites.findIndex((item) => favoriteKey(item.kana, item.spelling) === target);
        let next;
        let added;
        if (existingIndex >= 0) {
          next = kanaFavorites.filter((item, index) => index !== existingIndex);
          added = false;
        } else {
          if (kanaFavorites.length >= 100) return { error: "limit" };
          next = [{ id: createStorageId("fav"), kana, spelling, createdAt: Date.now() }].concat(kanaFavorites);
          added = true;
        }
        if (!saveKanaCollections(next, kanaHistory)) return { error: "save" };
        kanaFavorites = next;
        return { added };
      });
    } catch (_error) {
      result = { error: "save" };
    }
    if (result && result.error) {
      showToast(result.error === "limit" ? "お気に入りは100件まで保存できます" : "お気に入りを保存できませんでした");
      return;
    }
    renderKanaFavorites();
    syncFavoriteButtons();
    renderDeviceDataSummary();
    showToast(result.added ? `${spelling}をお気に入りに保存しました` : `${spelling}をお気に入りから削除しました`);
  }

  function createKanaCandidateCard(candidate, kana, recommended) {
    const card = document.createElement("article");
    card.className = `kana-candidate-card${recommended ? " is-recommended" : ""}`;

    const copy = document.createElement("div");
    const spelling = document.createElement("div");
    spelling.className = "kana-spelling";
    spelling.lang = "en";
    spelling.textContent = candidate.spelling;
    const pronunciation = document.createElement("p");
    pronunciation.className = "kana-pronunciation";
    pronunciation.textContent = `元の読み（入力）：${candidate.originalKana || kana}`;
    const reason = document.createElement("p");
    reason.className = "kana-candidate-reason";
    reason.textContent = `提案理由：${candidate.reason || "入力の読みをもとに機械的に生成"}`;
    const change = document.createElement("p");
    change.className = "kana-change-summary";
    if (candidate.change && candidate.change.changed) {
      change.textContent = `忠実表記との差：${candidate.change.before || "（なし）"} → ${candidate.change.after || "（削除）"} ／ 変化 ${candidate.changeLevel || candidate.drift}`;
    } else {
      change.textContent = `忠実表記：${candidate.baseSpelling || candidate.spelling}（変更なし）`;
    }
    copy.append(spelling, pronunciation, reason, change);

    const actions = document.createElement("div");
    actions.className = "kana-card-actions";
    const copyButton = makeKanaButton("コピー", "button button--quiet", () => {
      copyKanaText(candidate.spelling, `${candidate.spelling}をコピーしました`);
    });
    copyButton.setAttribute("aria-label", `${candidate.spelling}をコピー`);
    const favoriteButton = makeKanaButton("", "button button--quiet kana-favorite-button", () => {
      toggleKanaFavorite(kana, candidate.spelling);
    });
    favoriteButton.dataset.kana = kana;
    favoriteButton.dataset.spelling = candidate.spelling;
    favoriteButton.setAttribute("aria-label", `${candidate.spelling}をお気に入りに登録または解除`);
    const decorateButton = makeKanaButton("飾る", "button button--quiet", () => {
      selectMode("decoration", { focusTab: true, decorationSource: candidate.spelling });
    });
    decorateButton.setAttribute("aria-label", `${candidate.spelling}を飾り文字で使う`);
    actions.append(copyButton, decorateButton, favoriteButton);
    card.append(copy, actions);
    return card;
  }

  function renderKanaResults(kana, candidates) {
    elements.kanaRecommendedCard.replaceChildren();
    elements.kanaCandidateList.replaceChildren();
    elements.kanaEmptyState.hidden = true;
    elements.kanaGeneratedResults.hidden = false;
    elements.kanaResultCount.hidden = false;
    elements.kanaResultCount.textContent = `${formatNumber(candidates.length)}候補`;

    elements.kanaRecommendedCard.appendChild(createKanaCandidateCard(candidates[0], kana, true));
    candidates.slice(1).forEach((candidate) => {
      const item = document.createElement("li");
      item.appendChild(createKanaCandidateCard(candidate, kana, false));
      elements.kanaCandidateList.appendChild(item);
    });
    syncFavoriteButtons();
    elements.kanaResultStatus.textContent = `${kana}の表記候補を${candidates.length}件生成しました。`;
  }

  function updateKanaFidelityLabel() {
    const value = Math.max(1, Math.min(5, Number(elements.kanaFidelity.value) || 3));
    const label = `レベル${value}・${kanaFidelityLabels[value]}`;
    elements.kanaFidelityValue.textContent = label;
    elements.kanaFidelity.setAttribute("aria-valuetext", label);
  }

  async function addKanaHistory(kana, candidates) {
    if (!settings.kanaHistoryEnabled) return;
    const taste = settings.kanaTaste;
    const fidelity = settings.kanaFidelity;
    try {
      const saved = await withLocalDataLock(() => {
        if (!settings.kanaHistoryEnabled || !readStoredPrivacySetting("kanaHistoryEnabled")) {
          settings.kanaHistoryEnabled = false;
          return false;
        }
        refreshKanaCollectionsFromStorage();
        const key = `${kana.normalize("NFC")}\u0000${taste}\u0000${fidelity}`;
        const rest = kanaHistory.filter((item) => `${item.kana.normalize("NFC")}\u0000${item.taste}\u0000${item.fidelity}` !== key);
        const next = [{
          id: createStorageId("history"),
          kana,
          spellings: candidates.map((candidate) => candidate.spelling),
          taste,
          fidelity,
          createdAt: Date.now()
        }].concat(rest).slice(0, 20);
        if (!saveKanaCollections(kanaFavorites, next)) return false;
        kanaHistory = next;
        return true;
      });
      if (!saved) return;
      renderKanaHistory();
      renderDeviceDataSummary();
    } catch (_error) {
      // Candidate generation remains usable when browser storage is unavailable.
    }
  }

  function generateKanaCandidates(options) {
    const reroll = Boolean(options && options.reroll);
    const keepHistory = !(options && options.skipHistory);
    const normalized = tools.kanaSpell.normalizeKana(elements.kanaInput.value);
    elements.kanaInputError.textContent = "";
    elements.kanaInput.removeAttribute("aria-invalid");

    if (!normalized) {
      elements.kanaInputError.textContent = "カタカナの名前を入力してください。";
      elements.kanaInput.setAttribute("aria-invalid", "true");
      return;
    }
    if (!tools.kanaSpell.isSupportedKana(normalized)) {
      elements.kanaInputError.textContent = "カタカナまたはひらがなで入力してください。長音・中黒・ハイフンも使えます。";
      elements.kanaInput.setAttribute("aria-invalid", "true");
      return;
    }

    elements.kanaInput.value = normalized;
    kanaGeneration = reroll ? kanaGeneration + 1 : 0;
    const candidates = tools.kanaSpell.generateVariants(normalized, {
      taste: settings.kanaTaste,
      fidelity: settings.kanaFidelity,
      seed: kanaGeneration,
      limit: 8
    });
    if (!candidates.length) {
      elements.kanaInputError.textContent = "候補を作れませんでした。別の名前でお試しください。";
      elements.kanaInput.setAttribute("aria-invalid", "true");
      return;
    }
    kanaCandidates = candidates;
    renderKanaResults(normalized, candidates);
    if (keepHistory) addKanaHistory(normalized, candidates);
  }

  function createKanaSavedItem(primary, secondary, actions) {
    const item = document.createElement("li");
    item.className = "kana-saved-item";
    const copy = document.createElement("div");
    copy.className = "kana-saved-copy";
    const strong = document.createElement("strong");
    strong.textContent = primary;
    const small = document.createElement("small");
    small.textContent = secondary;
    copy.append(strong, small);
    const actionWrap = document.createElement("div");
    actionWrap.className = "kana-saved-actions";
    actions.forEach((button) => actionWrap.appendChild(button));
    item.append(copy, actionWrap);
    return item;
  }

  function renderKanaFavorites() {
    elements.kanaFavoritesList.replaceChildren();
    elements.kanaFavoritesEmpty.hidden = kanaFavorites.length > 0;
    kanaFavorites.forEach((item) => {
      const copyButton = makeKanaButton("コピー", "kana-mini-button", () => copyKanaText(item.spelling, `${item.spelling}をコピーしました`));
      copyButton.setAttribute("aria-label", `${item.spelling}をコピー`);
      const deleteButton = makeKanaButton("削除", "kana-mini-button is-delete", () => toggleKanaFavorite(item.kana, item.spelling));
      deleteButton.setAttribute("aria-label", `${item.spelling}をお気に入りから削除`);
      elements.kanaFavoritesList.appendChild(createKanaSavedItem(item.spelling, item.kana, [copyButton, deleteButton]));
    });
  }

  function restoreKanaHistory(item) {
    elements.kanaInput.value = item.kana;
    settings.kanaTaste = item.taste;
    settings.kanaFidelity = item.fidelity;
    selectRadio("kanaTaste", item.taste);
    elements.kanaFidelity.value = String(item.fidelity);
    updateKanaFidelityLabel();
    saveSettings();
    kanaGeneration = 0;
    generateKanaCandidates({ skipHistory: false });
    elements.kanaInput.focus();
    showToast("履歴から設定を復元しました");
  }

  async function deleteKanaHistory(id) {
    let saved = false;
    try {
      saved = await withLocalDataLock(() => {
        refreshKanaCollectionsFromStorage();
        const next = kanaHistory.filter((item) => item.id !== id);
        if (!saveKanaCollections(kanaFavorites, next)) return false;
        kanaHistory = next;
        return true;
      });
    } catch (_error) {
      saved = false;
    }
    if (!saved) {
      showToast("履歴を削除できませんでした");
      return;
    }
    renderKanaHistory();
    renderDeviceDataSummary();
    showToast("履歴を削除しました");
  }

  function renderKanaHistory() {
    elements.kanaHistoryList.replaceChildren();
    elements.kanaHistoryEmpty.hidden = kanaHistory.length > 0;
    elements.kanaHistoryEmpty.textContent = settings.kanaHistoryEnabled
      ? "生成した名前を直近20件まで保存します。"
      : "履歴を残さないモードです。新しい生成履歴は保存しません。";
    elements.kanaClearHistoryButton.hidden = kanaHistory.length === 0;
    kanaHistory.forEach((item) => {
      const restoreButton = makeKanaButton("呼出", "kana-mini-button", () => restoreKanaHistory(item));
      restoreButton.setAttribute("aria-label", `${item.kana}と生成設定を呼び出す`);
      const copyButton = makeKanaButton("コピー", "kana-mini-button", () => copyKanaText(item.spellings[0], `${item.spellings[0]}をコピーしました`));
      copyButton.setAttribute("aria-label", `${item.spellings[0]}をコピー`);
      const deleteButton = makeKanaButton("削除", "kana-mini-button is-delete", () => deleteKanaHistory(item.id));
      deleteButton.setAttribute("aria-label", `${item.kana}の履歴を削除`);
      const detail = `${item.kana} ／ ${kanaTasteLabels[item.taste]}・レベル${item.fidelity}`;
      elements.kanaHistoryList.appendChild(createKanaSavedItem(item.spellings[0], detail, [restoreButton, copyButton, deleteButton]));
    });
  }

  async function clearKanaHistory() {
    if (!kanaHistory.length || !root.confirm("カナスペルの履歴をすべて削除します。よろしいですか？")) return;
    let saved = false;
    try {
      saved = await withLocalDataLock(() => {
        refreshKanaCollectionsFromStorage();
        if (!saveKanaCollections(kanaFavorites, [])) return false;
        kanaHistory = [];
        return true;
      });
    } catch (_error) {
      saved = false;
    }
    if (!saved) {
      showToast("履歴を削除できませんでした");
      return;
    }
    renderKanaHistory();
    renderDeviceDataSummary();
    showToast("履歴をすべて削除しました");
  }

  function setDeviceDataStatus(message, isError) {
    elements.deviceDataStatus.textContent = message || "";
    elements.deviceDataStatus.classList.toggle("is-error", Boolean(isError));
  }

  function renderDeviceDataSummary() {
    const parts = [
      `お気に入り ${formatNumber(kanaFavorites.length)}件`,
      `履歴 ${formatNumber(kanaHistory.length)}件`,
      `演出候補 ${formatNumber(glitchSavedCandidates.length)}件`,
      `プリセット ${formatNumber(glitchPresets.length)}件`,
      storedDraftExists() ? "下書きあり" : "下書きなし",
      settings.kanaHistoryEnabled ? "履歴保存オン" : "履歴保存オフ"
    ];
    elements.deviceDataCounts.textContent = parts.join("・");
    elements.kanaHistoryEnabled.checked = settings.kanaHistoryEnabled;
  }

  async function setKanaHistoryEnabled(enabled) {
    const target = Boolean(enabled);
    settings.kanaHistoryEnabled = target;
    elements.kanaHistoryEnabled.checked = target;
    let saved = false;
    try {
      saved = await withLocalDataLock(() => {
        settings.kanaHistoryEnabled = target;
        return saveSettingsUnlocked("kanaHistoryEnabled");
      });
    } catch (_error) {
      saved = false;
    }
    if (!saved) {
      settings = loadSettings();
      elements.kanaHistoryEnabled.checked = settings.kanaHistoryEnabled;
      setDeviceDataStatus("履歴の保存設定を変更できませんでした。ブラウザの保存設定をご確認ください。", true);
      renderKanaHistory();
      renderDeviceDataSummary();
      return;
    }
    renderKanaHistory();
    renderDeviceDataSummary();
    setDeviceDataStatus(
      target
        ? "新しいカナスペル履歴をこの端末に保存します。"
        : "履歴を残さないモードにしました。既存の履歴は削除するまで残ります。",
      false
    );
  }

  function exportKanaData() {
    try {
      const serialized = tools.localData.serializeBackup(kanaFavorites, kanaHistory, new Date());
      downloadText(serialized, "文字いじり-お気に入り履歴.json", "application/json;charset=utf-8");
      setDeviceDataStatus("お気に入りと履歴をJSONへ書き出しました。名前データを含むため、保管場所にご注意ください。", false);
      showToast("端末内データを書き出しました");
    } catch (_error) {
      setDeviceDataStatus("お気に入りと履歴を書き出せませんでした。", true);
      showToast("書き出しに失敗しました");
    }
  }

  function readTextFile(file) {
    if (file && typeof file.text === "function") return file.text();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error("READ_FAILED"));
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsText(file, "utf-8");
    });
  }

  async function importKanaData(file) {
    if (!file) return;
    const importEpoch = readLocalDataResetEpoch();
    if (!/\.json$/i.test(String(file.name || "")) && file.type !== "application/json") {
      setDeviceDataStatus("文字いじりツールから書き出したJSONファイルを選んでください。", true);
      elements.kanaDataFileInput.value = "";
      return;
    }
    if (file.size > tools.localData.maximumBackupSize) {
      setDeviceDataStatus("読み込めるJSONは768KBまでです。", true);
      elements.kanaDataFileInput.value = "";
      return;
    }

    try {
      const raw = await readTextFile(file);
      const backup = tools.localData.parseBackup(raw);
      const imported = await withLocalDataLock(() => {
        if (readLocalDataResetEpoch() !== importEpoch) throw new Error("IMPORT_CANCELLED_BY_RESET");
        refreshKanaCollectionsFromStorage();
        const merged = tools.localData.mergeCollections(kanaFavorites, kanaHistory, backup, createStorageId);
        if (!saveKanaCollections(merged.favorites, merged.history)) throw new Error("SAVE_FAILED");
        kanaFavorites = merged.favorites;
        kanaHistory = merged.history;
        return merged;
      });
      kanaFavorites = imported.favorites;
      kanaHistory = imported.history;
      renderKanaFavorites();
      renderKanaHistory();
      syncFavoriteButtons();
      renderDeviceDataSummary();
      const ignored = backup.rejected ? ` 不正な${backup.rejected}件は読み飛ばしました。` : "";
      setDeviceDataStatus(`JSONを読み込み、既存データへ安全に統合しました。${ignored}`, false);
      showToast("お気に入りと履歴を読み込みました");
    } catch (error) {
      const tooLarge = error && error.message === "BACKUP_TOO_LARGE";
      const saveFailed = error && error.message === "SAVE_FAILED";
      const resetCancelled = error && error.message === "IMPORT_CANCELLED_BY_RESET";
      setDeviceDataStatus(
        tooLarge
          ? "JSONが大きすぎます。768KB以下にしてください。"
          : resetCancelled
            ? "読み込み中に端末内データが削除されたため、JSONの取り込みを中止しました。もう一度選択してください。"
          : saveFailed
            ? "JSONは読み取れましたが、端末へ保存できませんでした。既存のお気に入りと履歴は変更していません。"
            : "このJSONは文字いじりツールのバックアップとして読み込めません。",
        true
      );
      showToast("JSONを読み込めませんでした");
    } finally {
      elements.kanaDataFileInput.value = "";
    }
  }

  async function deleteAllLocalData() {
    if (!root.confirm("設定、入力下書き、カナスペルのお気に入り・履歴、演出候補・プリセット、飾り文字のお気に入り・表示密度をこの端末から削除します。画面上の入力文章は残します。よろしいですか？")) return;
    const keys = [storageKey, inputDraftKey, kanaCollectionsKey, kanaFavoritesKey, kanaHistoryKey, glitchLibraryKey, "text-tool:decorative-text:v1"];
    if (draftTimer) root.clearTimeout(draftTimer);
    draftTimer = 0;
    if (glitchManualHistoryTimer) root.clearTimeout(glitchManualHistoryTimer);
    glitchManualHistoryTimer = 0;
    glitchPendingManualEntry = null;
    activeGlitchPresetName = "";
    draftDirty = false;
    draftLastChangedAt = 0;
    elements.deleteAllLocalDataButton.disabled = true;
    let removed = false;
    try {
      removed = await withLocalDataLock(() => {
        let completed = true;
        try {
          const resetEpoch = createStorageId("reset");
          root.localStorage.setItem(localDataResetKey, resetEpoch);
          observedLocalDataResetEpoch = resetEpoch;
        } catch (_error) {
          completed = false;
        }
        keys.forEach((key) => {
          try {
            root.localStorage.removeItem(key);
            if (root.localStorage.getItem(key) !== null) completed = false;
          } catch (_error) {
            completed = false;
          }
        });
        return completed;
      });
    } catch (_error) {
      removed = false;
    }
    elements.deleteAllLocalDataButton.disabled = false;
    root.dispatchEvent(new Event("texttools:decorative-reset"));

    if (!removed) {
      settings = loadSettings();
      refreshKanaCollectionsFromStorage();
      refreshGlitchLibraryFromStorage();
      renderKanaFavorites();
      renderKanaHistory();
      renderGlitchSavedCandidates();
      renderGlitchPresets();
      renderDeviceDataSummary();
      setDeviceDataStatus("一部の端末内データを削除できませんでした。ブラウザの保存設定を確認して、もう一度お試しください。", true);
      return;
    }

    settings = Object.assign({}, defaultSettings);
    kanaFavorites = [];
    kanaHistory = [];
    glitchSavedCandidates = [];
    glitchPresets = [];
    suppressSettingsWrite = true;
    applySavedSettings();
    renderKanaFavorites();
    renderKanaHistory();
    renderGlitchSavedCandidates();
    renderGlitchPresets();
    syncFavoriteButtons();
    selectMode("count");
    suppressSettingsWrite = false;
    elements.deleteDraftButton.disabled = true;
    setDraftStatus("端末内の下書きを削除しました。画面上の入力文章は残っています。", false);
    renderDeviceDataSummary();
    setDeviceDataStatus("端末内データをすべて削除し、設定を初期状態へ戻しました。画面上の入力文章は残っています。", false);
    showToast("端末内データを削除しました");
  }

  function applyExternalLocalDataReset() {
    localDataResetPending = true;
    if (draftTimer) root.clearTimeout(draftTimer);
    draftTimer = 0;
    draftDirty = false;
    draftLastChangedAt = 0;
    let removed = true;
    [storageKey, inputDraftKey, kanaCollectionsKey, kanaFavoritesKey, kanaHistoryKey, glitchLibraryKey].forEach((key) => {
      try {
        const raw = root.localStorage.getItem(key);
        if (!raw) return;
        let storedGeneration = "";
        try {
          const parsed = JSON.parse(raw);
          storedGeneration = parsed && typeof parsed.storageGeneration === "string" ? parsed.storageGeneration : "";
        } catch (_parseError) {
          storedGeneration = "";
        }
        if (storedGeneration === observedLocalDataResetEpoch) return;
        root.localStorage.removeItem(key);
        if (root.localStorage.getItem(key) !== null) removed = false;
      } catch (_error) {
        removed = false;
      }
    });
    const activeMode = currentMode;
    settings = loadSettings();
    settings.mode = activeMode;
    refreshKanaCollectionsFromStorage();
    refreshGlitchLibraryFromStorage();
    suppressSettingsWrite = true;
    applySavedSettings();
    activeGlitchPresetName = "";
    invalidateMojibakeOutput();
    transformStates.mirror.sourceRevision = -1;
    transformStates.romaji.sourceRevision = -1;
    renderKanaFavorites();
    renderKanaHistory();
    renderGlitchSavedCandidates();
    renderGlitchPresets();
    syncFavoriteButtons();
    selectMode(activeMode);
    suppressSettingsWrite = false;
    localDataResetPending = false;
    const hasCurrentDraft = storedDraftExists();
    elements.deleteDraftButton.disabled = !settings.autoSaveInput && !hasCurrentDraft;
    setDraftStatus(
      hasCurrentDraft
        ? "削除後に別のタブで保存された新しい下書きがあります。画面上の入力文章は変更していません。"
        : "別のタブで端末内の下書きが削除されました。画面上の入力文章は残っています。",
      false
    );
    renderDeviceDataSummary();
    setDeviceDataStatus(
      removed
        ? "別のタブからの削除通知を反映しました。削除後に新しく保存されたデータだけを保持し、画面上の入力文章は残しています。"
        : "別のタブから削除通知を受け、画面を初期状態へ戻しましたが、一部の保存データを削除できませんでした。ブラウザの保存設定をご確認ください。",
      !removed
    );
  }

  function handleStorageChange(event) {
    if (event.storageArea && event.storageArea !== root.localStorage) return;
    if (event.key === localDataResetKey) {
      const nextEpoch = typeof event.newValue === "string" ? event.newValue : "";
      if (nextEpoch !== observedLocalDataResetEpoch) {
        observedLocalDataResetEpoch = nextEpoch;
        localDataResetPending = true;
        applyExternalLocalDataReset();
      }
      return;
    }
    if (event.key === kanaCollectionsKey) {
      refreshKanaCollectionsFromStorage();
      renderKanaFavorites();
      renderKanaHistory();
      syncFavoriteButtons();
    } else if (event.key === glitchLibraryKey) {
      refreshGlitchLibraryFromStorage();
      renderGlitchSavedCandidates();
      renderGlitchPresets();
    } else if (event.key === kanaFavoritesKey || event.key === kanaHistoryKey) {
      refreshKanaCollectionsFromStorage();
      renderKanaFavorites();
      renderKanaHistory();
      syncFavoriteButtons();
    } else if (event.key === storageKey) {
      const previousSettings = settings;
      const activeMode = currentMode;
      settings = loadSettings();
      settings.mode = activeMode;
      suppressSettingsWrite = true;
      applySavedSettings();
      if (["mojibakePurpose", "mojibakeMethod", "glitchIntensity"].some((key) => previousSettings[key] !== settings[key])) {
        activeGlitchPresetName = "";
        invalidateMojibakeOutput();
      }
      if (["mirrorMethod", "lineByLine"].some((key) => previousSettings[key] !== settings[key])) {
        transformStates.mirror.sourceRevision = -1;
      }
      if (["romajiDirection", "romajiScript", "romajiSystem", "romajiLongVowel", "romajiParticles"].some((key) => previousSettings[key] !== settings[key])) {
        transformStates.romaji.sourceRevision = -1;
      }
      selectMode(activeMode);
      suppressSettingsWrite = false;
    } else if (event.key === inputDraftKey) {
      const storedDraft = loadInputDraft();
      if (settings.autoSaveInput && draftLastChangedAt && (!storedDraft || storedDraft.updatedAt < draftLastChangedAt)) {
        draftDirty = true;
        saveInputDraft(false);
      } else if (storedDraft && storedDraft.updatedAt > draftLastChangedAt) {
        setDraftStatus("別のタブで、より新しい下書きが保存されています。画面上の入力文章は変更していません。", false);
      }
      elements.deleteDraftButton.disabled = !settings.autoSaveInput && !storedDraftExists();
    }
    renderDeviceDataSummary();
  }

  async function handleCopy() {
    const text = currentMode === "count" ? buildStatisticsText() : elements.output.value;
    try {
      await copyText(text);
      showToast("コピーしました");
    } catch (error) {
      showToast("コピーできませんでした。手動で選択してコピーしてください");
    }
  }

  function handleSwap() {
    const previousSource = elements.source.value;
    const previousOutput = elements.output.value;
    if (previousOutput.length > tools.workflow.maximumInteractiveCharacters) {
      setTransformMessage("出力が100万文字を超えるため、入力欄との交換を中止しました。TXTとして保存するか、必要な範囲だけコピーしてください。", "error");
      showToast("長い出力のため交換できません");
      return;
    }
    fileReadGeneration += 1;
    if (pendingEncoding) {
      hideEncodingDiagnostics();
      setFileStatus("入力と出力を交換したため、文字コード候補を閉じました。", false);
    }
    elements.source.value = previousOutput;
    sourceRevision += 1;
    if (currentMode === "romaji") {
      settings.romajiDirection = settings.romajiDirection === "toKana" ? "toRomaji" : "toKana";
      selectRadio("romajiDirection", settings.romajiDirection);
      updateRomajiControls();
      saveSettings();
      transformStates.romaji.sourceRevision = sourceRevision;
      setTransformOutput(
        previousSource,
        settings.romajiDirection === "toRomaji"
          ? "かな → ローマ字"
          : `ローマ字 → ${settings.romajiScript === "katakana" ? "カタカナ" : "ひらがな"}`,
        "",
        ""
      );
      refreshSource(false);
      scheduleInputDraftSave();
      scheduleCountAnnouncement();
      elements.romajiConversionStatus.textContent = "入力と結果を交換し、変換方向も切り替えました。";
      showToast("入力と結果、変換方向を切り替えました");
      return;
    }
    setTransformOutput(previousSource, "", "入力と出力を交換しました。", "info");
    transformStates[currentMode].sourceRevision = sourceRevision;
    refreshSource(false);
    scheduleInputDraftSave();
    scheduleCountAnnouncement();
    showToast("入力と出力を交換しました");
  }

  function downloadText(text, fileName, mimeType) {
    const blob = new Blob([text], { type: mimeType || "text/plain;charset=utf-8" });
    const url = root.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    root.setTimeout(() => root.URL.revokeObjectURL(url), 1500);
  }

  function handleSave() {
    if (!elements.output.value) return;
    try {
      const modeNames = { mojibake: "文字化け", mirror: "鏡文字", romaji: "ローマ字かな" };
      downloadText(elements.output.value, `文字いじり-${modeNames[currentMode] || "出力"}.txt`);
      showToast("出力をTXTファイルに保存しました");
    } catch (_error) {
      showToast("保存できませんでした。出力欄から手動でコピーしてください");
    }
  }

  function handleSourceSave() {
    if (!elements.source.value) return;
    try {
      downloadText(elements.source.value, "文字いじり-入力.txt");
      showToast("入力をTXTファイルに保存しました");
    } catch (_error) {
      showToast("保存できませんでした。入力欄から手動でコピーしてください");
    }
  }

  async function handleClear() {
    const length = elements.source.value.length + elements.output.value.length;
    if (length > 50000 && !root.confirm("長い文章をすべて消します。よろしいですか？")) {
      return;
    }

    fileReadGeneration += 1;
    hideEncodingDiagnostics();
    elements.source.value = "";
    elements.output.value = "";
    elements.fileInput.value = "";
    elements.fileStatus.textContent = "";
    elements.fileStatus.classList.remove("is-error");
    if (draftTimer) root.clearTimeout(draftTimer);
    draftTimer = 0;
    if (glitchManualHistoryTimer) root.clearTimeout(glitchManualHistoryTimer);
    glitchManualHistoryTimer = 0;
    glitchPendingManualEntry = null;
    activeGlitchPresetName = "";
    draftDirty = false;
    draftLastChangedAt = 0;
    sourceRevision += 1;
    glitchVariation = 0;
    glitchSignature = "";
    Object.keys(transformStates).forEach((mode) => {
      Object.assign(transformStates[mode], { text: "", badge: "", message: "", messageType: "", initialized: false, sourceRevision: -1, scopeSignature: "all", manuallyEdited: false });
    });
    if (transformStates[currentMode]) {
      renderTransformState(currentMode);
    }
    refreshSource(false);
    scheduleCountAnnouncement();
    elements.source.focus();
    showToast("クリアしました");
    let draftRemoved = false;
    try {
      draftRemoved = await withLocalDataLock(() => {
        const removed = removeStoredDraft();
        if (!removed) {
          settings.autoSaveInput = false;
          saveSettingsUnlocked("autoSaveInput");
        }
        return removed;
      });
    } catch (_error) {
      draftRemoved = false;
      settings.autoSaveInput = false;
    }
    elements.autoSaveInput.checked = settings.autoSaveInput;
    elements.deleteDraftButton.disabled = draftRemoved ? !settings.autoSaveInput : false;
    setDraftStatus(
      draftRemoved
        ? settings.autoSaveInput ? "入力と端末内の下書きを削除しました。自動保存はオンのままです。" : ""
        : "入力は消去しましたが、端末内の下書きを削除できませんでした。自動保存を停止したので、削除を再試行してください。",
      !draftRemoved
    );
    renderDeviceDataSummary();
  }

  function setFileStatus(message, isError) {
    elements.fileStatus.textContent = message;
    elements.fileStatus.classList.toggle("is-error", Boolean(isError));
  }

  function readWithFileReader(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error("READ_FAILED"));
      reader.onload = () => resolve(reader.result);
      reader.readAsArrayBuffer(file);
    });
  }

  async function readFileBuffer(file) {
    if (typeof file.arrayBuffer !== "function") {
      return readWithFileReader(file);
    }
    return file.arrayBuffer();
  }

  function hideEncodingDiagnostics() {
    pendingEncoding = null;
    elements.encodingDiagnostics.hidden = true;
    elements.encodingCandidateList.replaceChildren();
  }

  function applyLoadedText(text, fileName, fileSize, encodingLabel) {
    if (text.length > tools.workflow.maximumInteractiveCharacters) {
      setFileStatus("読み取った文章が100万文字を超えるため、入力欄への反映を中止しました。ファイルを分割してください。", true);
      return false;
    }
    elements.source.value = text;
    sourceRevision += 1;
    invalidateMojibakeOutput();
    refreshSource(currentMode === "mirror" || currentMode === "romaji");
    scheduleInputDraftSave();
    scheduleCountAnnouncement();
    setFileStatus(`${fileName} を${encodingLabel}で読み込みました（${formatNumber(fileSize)} bytes）`, false);
    return true;
  }

  function encodingConfidenceLabel(confidence) {
    if (confidence === "high") return "有力";
    if (confidence === "medium") return "候補";
    return "参考";
  }

  function showEncodingDiagnostics(analysis, buffer, fileName, fileSize) {
    pendingEncoding = { analysis, buffer, fileName, fileSize };
    elements.encodingCandidateList.replaceChildren();
    const rawBytes = Array.from(new Uint8Array(buffer, 0, Math.min(16, buffer.byteLength)))
      .map((value) => value.toString(16).padStart(2, "0").toUpperCase())
      .join(" ");
    const sampleNote = analysis.sampled ? "先頭256KBから判定。" : "";
    elements.encodingSummary.textContent = `${formatNumber(fileSize)} bytes。${sampleNote}先頭バイト：${rawBytes || "（空）"}。内容が正しく見える候補を選んでください。`;

    analysis.candidates.forEach((candidate, index) => {
      const label = document.createElement("label");
      label.className = "encoding-candidate";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "encodingCandidate";
      input.value = candidate.encoding;
      input.checked = index === 0;
      const body = document.createElement("span");
      body.className = "encoding-candidate-body";
      const heading = document.createElement("span");
      heading.className = "encoding-candidate-heading";
      const name = document.createElement("strong");
      name.textContent = candidate.label;
      const confidence = document.createElement("span");
      confidence.className = "encoding-confidence";
      confidence.textContent = encodingConfidenceLabel(candidate.confidence);
      const preview = document.createElement("span");
      preview.className = `encoding-preview${candidate.preview ? "" : " is-empty"}`;
      preview.textContent = candidate.preview || "（空の文章）";
      heading.append(name, confidence);
      body.append(heading, preview);
      label.append(input, body);
      elements.encodingCandidateList.appendChild(label);
    });

    elements.encodingDiagnostics.hidden = false;
    elements.applyEncodingButton.disabled = analysis.candidates.length === 0;
    setFileStatus(`${fileName} の文字コードを確認してください。ファイル内容はまだ入力欄へ反映していません。`, false);
    const firstCandidate = elements.encodingCandidateList.querySelector("input");
    if (firstCandidate) firstCandidate.focus();
  }

  function applySelectedEncoding() {
    if (!pendingEncoding) return;
    const selected = elements.encodingCandidateList.querySelector('input[name="encodingCandidate"]:checked');
    if (!selected) {
      setFileStatus("読み込む文字コードを選んでください。", true);
      return;
    }
    const candidate = pendingEncoding.analysis.candidates.find((item) => item.encoding === selected.value);
    try {
      const text = tools.encoding.decode(pendingEncoding.buffer, selected.value);
      const { fileName, fileSize } = pendingEncoding;
      hideEncodingDiagnostics();
      applyLoadedText(text, fileName, fileSize, candidate ? candidate.label : selected.value);
      elements.source.focus();
    } catch (_error) {
      setFileStatus("選んだ文字コードではファイル全体を安全に読み込めませんでした。別の候補をお試しください。", true);
    }
  }

  function cancelEncodingSelection() {
    hideEncodingDiagnostics();
    setFileStatus("TXTファイルの読み込みをキャンセルしました。", false);
    elements.source.focus();
  }

  function batchConfigurationLabel() {
    if (currentMode === "mojibake") {
      if (settings.mojibakePurpose === "repair") return "文字化けを自動判定して修復";
      if (settings.mojibakePurpose === "encode") return `戻せる形に変換（${tools.mojibake.methodLabels[settings.mojibakeMethod]}）`;
      const seed = elements.glitchSeedLocked.checked && tools.workflow.normalizeSeed(elements.glitchSeed.value)
        ? `・固定シード ${tools.workflow.normalizeSeed(elements.glitchSeed.value)}`
        : "・ファイルごとに別パターン";
      return `演出用に崩す（${tools.mojibake.intensityLabels[settings.glitchIntensity]}${seed}）`;
    }
    if (currentMode === "mirror") return `鏡文字（${tools.mirror.labels[settings.mirrorMethod]}${settings.lineByLine ? "・行ごと" : "・文章全体"}）`;
    if (currentMode === "romaji") {
      return settings.romajiDirection === "toRomaji"
        ? `かな→ローマ字（${tools.romanKana.schemeLabels[settings.romajiSystem]}）`
        : `ローマ字→${settings.romajiScript === "katakana" ? "カタカナ" : "ひらがな"}`;
    }
    return "";
  }

  function updateBatchModeSummary() {
    const label = batchConfigurationLabel();
    elements.batchModeSummary.textContent = batchRunning && batchActiveLabel
      ? `処理中の設定：「${batchActiveLabel}」。途中で画面の設定を変えても、今回の一括処理には影響しません。`
      : label
      ? `現在の「${label}」を各ファイルの全文へ適用します。`
      : "文字化け・鏡文字・ローマ字↔かなのいずれかを選ぶと開始できます。";
    const hasQueued = batchRows.some((row) => row.status === "queued");
    elements.batchStartButton.disabled = batchRunning || !label || !hasQueued;
    elements.batchCancelButton.disabled = !batchRunning;
    elements.batchCsvButton.disabled = batchRunning || !batchRows.some((row) => row.status === "done" || row.status === "error" || row.status === "cancelled");
    elements.batchClearButton.disabled = batchRunning;
  }

  function setBatchStatus(message, isError) {
    elements.batchStatus.textContent = message || "";
    elements.batchStatus.classList.toggle("is-error", Boolean(isError));
  }

  function batchStatusLabel(row) {
    if (row.status === "queued") return "待機中";
    if (row.status === "running") return "処理中…";
    if (row.status === "done") return `${row.encoding}・${formatNumber(row.inputCharacters)}文字 → ${formatNumber(row.outputCharacters)}文字`;
    if (row.status === "cancelled") return "キャンセル";
    return row.error || "処理できませんでした";
  }

  function processedTextFileName(fileName) {
    const safe = String(fileName || "result.txt").replace(/[<>:"/\\|?*\u0000-\u001f]/gu, "_").replace(/\.txt$/i, "").slice(0, 120) || "result";
    return `${safe}-処理済み.txt`;
  }

  function renderBatchRows() {
    elements.batchResultList.replaceChildren();
    batchRows.forEach((row) => {
      const item = document.createElement("li");
      item.className = `batch-result-item${row.status === "running" ? " is-running" : row.status === "done" ? " is-done" : row.status === "error" ? " is-error" : ""}`;
      const copy = document.createElement("span");
      copy.className = "batch-result-copy";
      const name = document.createElement("strong");
      name.textContent = row.fileName;
      const meta = document.createElement("span");
      meta.textContent = batchStatusLabel(row);
      copy.append(name, meta);
      item.appendChild(copy);
      if (row.status === "done") {
        const save = document.createElement("button");
        save.type = "button";
        save.className = "button button--quiet batch-result-action";
        save.textContent = "結果TXT";
        save.setAttribute("aria-label", `${row.fileName} の処理結果をTXT保存`);
        save.addEventListener("click", () => downloadText(row.output, processedTextFileName(row.fileName)));
        item.appendChild(save);
      }
      elements.batchResultList.appendChild(item);
    });
    const completed = batchRows.filter((row) => row.status === "done" || row.status === "error" || row.status === "cancelled").length;
    elements.batchProgress.max = Math.max(1, batchRows.length);
    elements.batchProgress.value = completed;
    elements.batchProgressText.textContent = batchRows.length ? `${formatNumber(completed)} / ${formatNumber(batchRows.length)}件` : "待機中";
    updateBatchModeSummary();
  }

  function queueBatchFiles(fileList) {
    const files = Array.from(fileList || []);
    if (files.length > tools.workflow.maximumBatchFiles) {
      setFileStatus(`一括処理は${tools.workflow.maximumBatchFiles}件までです。ファイル数を分けてください。`, true);
      return;
    }
    const totalBytes = files.reduce((total, file) => total + (Number(file.size) || 0), 0);
    if (totalBytes > tools.workflow.maximumBatchBytes) {
      setFileStatus("一括処理できる合計サイズは20MBまでです。ファイルを分けてください。", true);
      return;
    }
    if (batchRows.some((row) => row.status === "done") && !batchResultsExported && !root.confirm("まだ一括保存していない処理結果があります。破棄して新しい一覧へ進みますか？")) {
      setFileStatus("現在の一括処理結果を保持しました。", false);
      return;
    }
    batchRows = files.map((file, index) => {
      const fileName = String(file.name || `file-${index + 1}.txt`);
      const validType = /\.txt$/i.test(fileName) || file.type === "text/plain" || !file.type;
      const validSize = file.size <= tools.workflow.maximumBatchFileBytes;
      return {
        id: createStorageId("batch"),
        file: validType && validSize ? file : null,
        fileName,
        status: validType && validSize ? "queued" : "error",
        encoding: "",
        inputCharacters: 0,
        outputCharacters: 0,
        output: "",
        error: !validType ? ".txt形式ではありません" : !validSize ? "一括処理の1件上限2MBを超えています" : ""
      };
    });
    batchCancelRequested = false;
    batchResultsExported = false;
    elements.batchPanel.hidden = false;
    renderBatchRows();
    const validCount = batchRows.filter((row) => row.status === "queued").length;
    setFileStatus(`${formatNumber(files.length)}件のTXTを一括処理一覧へ追加しました。`, false);
    setBatchStatus(validCount ? `${formatNumber(validCount)}件を現在の変換設定で処理できます。` : "処理できるTXTファイルがありません。", !validCount);
  }

  function captureBatchConfiguration() {
    const label = batchConfigurationLabel();
    if (!label) return null;
    return {
      label,
      mode: currentMode,
      mojibakePurpose: settings.mojibakePurpose,
      mojibakeMethod: settings.mojibakeMethod,
      glitchIntensity: settings.glitchIntensity,
      glitchVariation,
      seedLocked: elements.glitchSeedLocked.checked,
      seed: tools.workflow.normalizeSeed(elements.glitchSeed.value),
      mirrorMethod: settings.mirrorMethod,
      lineByLine: settings.lineByLine,
      romajiDirection: settings.romajiDirection,
      romajiScript: settings.romajiScript,
      romajiSystem: settings.romajiSystem,
      romajiLongVowel: settings.romajiLongVowel,
      romajiParticles: settings.romajiParticles
    };
  }

  function transformBatchText(text, configuration, index) {
    const creative = configuration.mode === "mojibake" && configuration.mojibakePurpose === "creative";
    const maximumCharacters = creative ? tools.workflow.maximumCreativeCharacters : tools.workflow.maximumTransformCharacters;
    if (text.length > maximumCharacters) throw new Error(creative ? "CREATIVE_TOO_LARGE" : "TRANSFORM_TOO_LARGE");
    let output;
    if (configuration.mode === "mojibake") {
      if (configuration.mojibakePurpose === "repair") output = tools.mojibake.decodeAuto(text).text;
      if (configuration.mojibakePurpose === "encode") {
        const encoded = tools.mojibake.encode(text, configuration.mojibakeMethod);
        if (tools.mojibake.decode(encoded, configuration.mojibakeMethod) !== text) throw new Error("ROUNDTRIP_FAILED");
        output = encoded;
      }
      if (configuration.mojibakePurpose === "creative") {
        const variation = configuration.seedLocked && configuration.seed
          ? tools.workflow.seedToVariation(configuration.seed)
          : configuration.glitchVariation + index;
        output = tools.mojibake.creative(text, configuration.glitchIntensity, variation);
      }
    }
    if (configuration.mode === "mirror") output = tools.mirror.transform(text, configuration.mirrorMethod, configuration.lineByLine);
    if (configuration.mode === "romaji") {
      output = tools.romanKana.analyze(text, configuration.romajiDirection, configuration.romajiScript, {
        scheme: configuration.romajiSystem,
        longVowels: configuration.romajiLongVowel,
        particles: configuration.romajiParticles
      }).text;
    }
    if (typeof output !== "string") throw new Error("UNSUPPORTED_BATCH_MODE");
    if (output.length > tools.workflow.maximumOutputCharacters) throw new Error("OUTPUT_TOO_LARGE");
    return output;
  }

  async function readBatchText(file) {
    const buffer = await readFileBuffer(file);
    const sample = buffer.byteLength > encodingSampleSize ? buffer.slice(0, encodingSampleSize) : buffer;
    const analysis = tools.encoding.analyze(sample, { truncatedSample: sample.byteLength < buffer.byteLength });
    const candidate = analysis.recommended || analysis.candidates[0];
    if (!candidate) throw new Error("UNREADABLE_ENCODING");
    const needsReview = candidate.confidence === "low" || (candidate.confidence === "medium" && analysis.candidates.length > 1);
    return {
      text: tools.encoding.decode(buffer, candidate.encoding),
      encoding: `${candidate.label || candidate.encoding}${needsReview ? "（要確認）" : ""}`,
      needsReview
    };
  }

  function batchErrorMessage(error, configuration) {
    const code = error && error.message;
    if (code === "UNREADABLE_ENCODING") return "対応文字コードで安全に読めません";
    if (code === "ROUNDTRIP_FAILED") return "復元チェックに失敗しました";
    if (code === "LOSSY_REPLACEMENT") return "「�」を含むため完全に復元できません";
    if (code === "CANCELLED") return "キャンセル";
    if (code === "BATCH_OUTPUT_TOO_LARGE") return "一括結果の安全な保持上限を超えました";
    if (code === "CREATIVE_TOO_LARGE") return "演出用加工は1件20万文字までです";
    if (code === "TRANSFORM_TOO_LARGE") return "通常の変換は1件50万文字までです";
    if (code === "OUTPUT_TOO_LARGE") return "結果が300万文字を超えるため中止しました";
    if (configuration && configuration.mode === "mojibake") return mojibakeErrorMessage(error);
    return "処理中にエラーが発生しました";
  }

  async function startBatchProcessing() {
    if (batchRunning) return;
    const configuration = captureBatchConfiguration();
    if (!configuration) {
      setBatchStatus("文字化け・鏡文字・ローマ字↔かなのいずれかを選んでください。", true);
      return;
    }
    const queued = batchRows.filter((row) => row.status === "queued");
    if (!queued.length) return;
    batchRunning = true;
    batchCancelRequested = false;
    batchActiveLabel = configuration.label;
    batchResultsExported = false;
    updateBatchModeSummary();
    setBatchStatus(`「${configuration.label}」で一括処理を開始しました。`, false);
    let storedOutputBytes = batchRows.filter((row) => row.status === "done").reduce((total, row) => total + new TextEncoder().encode(row.output).byteLength, 0);
    for (let index = 0; index < queued.length; index += 1) {
      const row = queued[index];
      if (batchCancelRequested) break;
      row.status = "running";
      renderBatchRows();
      await new Promise((resolve) => root.setTimeout(resolve, 0));
      if (batchCancelRequested) {
        row.status = "queued";
        break;
      }
      try {
        const loaded = await readBatchText(row.file);
        if (batchCancelRequested) throw new Error("CANCELLED");
        row.encoding = loaded.encoding;
        row.needsReview = loaded.needsReview;
        const output = transformBatchText(loaded.text, configuration, index);
        const outputBytes = new TextEncoder().encode(output).byteLength;
        if (storedOutputBytes + outputBytes > tools.workflow.maximumBatchOutputBytes) throw new Error("BATCH_OUTPUT_TOO_LARGE");
        row.output = output;
        storedOutputBytes += outputBytes;
        row.inputCharacters = tools.unicode.graphemeCount(loaded.text);
        row.outputCharacters = tools.unicode.graphemeCount(row.output);
        row.status = "done";
      } catch (error) {
        row.output = "";
        row.error = batchErrorMessage(error, configuration);
        row.status = error && error.message === "CANCELLED" ? "cancelled" : "error";
      } finally {
        row.file = null;
      }
      renderBatchRows();
    }
    if (batchCancelRequested) {
      batchRows.forEach((row) => {
        if (row.status === "queued") row.status = "cancelled";
        row.file = null;
      });
    }
    batchRunning = false;
    batchActiveLabel = "";
    renderBatchRows();
    const completed = batchRows.filter((row) => row.status === "done").length;
    const failed = batchRows.filter((row) => row.status === "error").length;
    const needsReview = batchRows.filter((row) => row.status === "done" && row.needsReview).length;
    setBatchStatus(
      batchCancelRequested
        ? `一括処理を中止しました。完了 ${formatNumber(completed)}件、未完了 ${formatNumber(batchRows.length - completed)}件。`
        : `一括処理が完了しました。成功 ${formatNumber(completed)}件、要確認 ${formatNumber(needsReview)}件、エラー ${formatNumber(failed)}件。`,
      failed > 0
    );
    setFileStatus(`複数TXTの処理結果を確認できます（成功 ${formatNumber(completed)}件）。`, false);
  }

  function cancelBatchProcessing() {
    if (!batchRunning) return;
    batchCancelRequested = true;
    elements.batchCancelButton.disabled = true;
    setBatchStatus("現在のファイル処理が終わり次第キャンセルします…", false);
  }

  function exportBatchCsv() {
    const completed = batchRows.filter((row) => row.status === "done" || row.status === "error" || row.status === "cancelled");
    if (!completed.length) return;
    const labels = { done: "完了", error: "エラー", cancelled: "キャンセル" };
    const exportRows = completed.map((row) => ({
      ...row,
      status: labels[row.status] || row.status
    }));
    if (tools.workflow.estimateBatchCsvBytes(exportRows) > tools.workflow.maximumBatchCsvBytes) {
      setBatchStatus("CSVが16MBを超えるため一括保存できません。各行の「結果TXT」から保存してください。", true);
      return;
    }
    const csv = tools.workflow.batchResultsToCsv(exportRows);
    downloadText(csv, "文字いじり-一括処理結果.csv", "text/csv;charset=utf-8");
    batchResultsExported = true;
    setBatchStatus("一括処理の結果をCSVへ保存しました。", false);
    showToast("一括処理結果をCSV保存しました");
  }

  function clearBatchPanel() {
    if (batchRunning) {
      cancelBatchProcessing();
      return;
    }
    if (batchRows.some((row) => row.status === "done") && !batchResultsExported && !root.confirm("まだ一括保存していない処理結果があります。一覧を閉じて破棄しますか？")) return false;
    batchRows = [];
    batchCancelRequested = false;
    batchActiveLabel = "";
    batchResultsExported = false;
    elements.batchPanel.hidden = true;
    elements.batchResultList.replaceChildren();
    elements.batchProgress.value = 0;
    elements.batchProgressText.textContent = "待機中";
    setBatchStatus("", false);
    setFileStatus("", false);
    updateBatchModeSummary();
    return true;
  }

  async function loadTextFile(file) {
    if (!file) {
      return;
    }
    const fileName = String(file.name || "");
    const isTextFile = /\.txt$/i.test(fileName) || file.type === "text/plain" || !file.type;
    if (!isTextFile) {
      setFileStatus(".txt形式のファイルを選んでください。", true);
      return;
    }
    if (file.size > maximumFileSize) {
      setFileStatus("2MB以下のTXTファイルを選んでください。", true);
      return;
    }

    const generation = ++fileReadGeneration;
    hideEncodingDiagnostics();
    setFileStatus(`${fileName} を読み込んでいます…`, false);
    try {
      const buffer = await readFileBuffer(file);
      if (generation !== fileReadGeneration) {
        return;
      }
      const sample = buffer.byteLength > encodingSampleSize ? buffer.slice(0, encodingSampleSize) : buffer;
      let analysis = tools.encoding.analyze(sample, { truncatedSample: sample.byteLength < buffer.byteLength });
      const utf8Candidate = analysis.candidates.find((candidate) => candidate.encoding === "utf-8");
      const bomCandidate = analysis.bom && analysis.candidates.find((candidate) => candidate.encoding === analysis.bom);

      if (analysis.bom && !bomCandidate) {
        setFileStatus("文字コードの目印（BOM）はありますが、ファイルが途中で壊れているため安全に読み込めません。", true);
        return;
      }

      const shouldUseUtf8 = utf8Candidate && (analysis.bom === "utf-8" || (!analysis.bom && analysis.recommended && analysis.recommended.encoding === "utf-8"));
      if (shouldUseUtf8) {
        try {
          const text = tools.encoding.decode(buffer, "utf-8");
          applyLoadedText(text, fileName, file.size, "UTF-8");
          return;
        } catch (_error) {
          if (analysis.bom === "utf-8") {
            setFileStatus("UTF-8の目印（BOM）はありますが、ファイルが途中で壊れているため読み込めません。", true);
            return;
          }
          analysis = tools.encoding.analyze(sample, { truncatedSample: sample.byteLength < buffer.byteLength });
        }
      }

      if (!analysis.candidates.length) {
        setFileStatus("対応している文字コードで安全に読み込めませんでした。TXTファイルの内容を確認してください。", true);
        return;
      }
      showEncodingDiagnostics(analysis, buffer, fileName, file.size);
    } catch (_error) {
      if (generation === fileReadGeneration) {
        setFileStatus("TXTファイルを読み込めませんでした。ファイルが破損していないか確認してください。", true);
      }
    } finally {
      elements.fileInput.value = "";
    }
  }

  function handleFileList(fileList) {
    fileReadGeneration += 1;
    hideEncodingDiagnostics();
    if (!fileList || fileList.length < 1) return;
    if (batchRunning) {
      setFileStatus("一括処理中です。完了またはキャンセル後に別のファイルを選んでください。", true);
      elements.fileInput.value = "";
      return;
    }
    if (fileList.length === 1) {
      if (clearBatchPanel() === false) {
        elements.fileInput.value = "";
        return;
      }
      loadTextFile(fileList[0]);
      return;
    }
    queueBatchFiles(fileList);
    elements.fileInput.value = "";
  }

  function applySavedSettings() {
    elements.characterLimit.value = settings.limit;
    elements.customLimit.value = String(settings.customLimit);
    elements.mojibakeMethod.value = settings.mojibakeMethod;
    elements.lineByLine.checked = settings.lineByLine;
    elements.autoSaveInput.checked = settings.autoSaveInput;
    elements.deleteDraftButton.disabled = !settings.autoSaveInput && !storedDraftExists();
    elements.kanaHistoryEnabled.checked = settings.kanaHistoryEnabled;
    elements.romajiLongVowel.value = settings.romajiLongVowel;
    elements.romajiParticles.value = settings.romajiParticles;
    selectRadio("mojibakePurpose", settings.mojibakePurpose);
    selectRadio("glitchIntensity", settings.glitchIntensity);
    selectRadio("mirrorMethod", settings.mirrorMethod);
    selectRadio("kanaTaste", settings.kanaTaste);
    selectRadio("romajiDirection", settings.romajiDirection);
    selectRadio("romajiScript", settings.romajiScript);
    selectRadio("romajiSystem", settings.romajiSystem);
    elements.kanaFidelity.value = String(settings.kanaFidelity);
    updateKanaFidelityLabel();
    updateMojibakeMethodDescription();
    updateMojibakePurpose(false);
    updateRomajiControls();
    renderDeviceDataSummary();
  }

  function bindEvents() {
    elements.mobileModeSelect.addEventListener("change", () => selectMode(elements.mobileModeSelect.value));
    elements.mobileResultJump.addEventListener("click", jumpToMobileResult);

    elements.tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => selectMode(tab.dataset.mode));
      tab.addEventListener("keydown", (event) => {
        let targetIndex = index;
        if (event.key === "ArrowRight") targetIndex = (index + 1) % elements.tabs.length;
        else if (event.key === "ArrowLeft") targetIndex = (index - 1 + elements.tabs.length) % elements.tabs.length;
        else if (event.key === "Home") targetIndex = 0;
        else if (event.key === "End") targetIndex = elements.tabs.length - 1;
        else return;
        event.preventDefault();
        selectMode(elements.tabs[targetIndex].dataset.mode, { focusTab: true });
      });
    });

    elements.source.addEventListener("compositionstart", () => {
      composing = true;
      fileReadGeneration += 1;
    });
    elements.source.addEventListener("compositionend", () => {
      composing = false;
      sourceRevision += 1;
      invalidateMojibakeOutput();
      scheduleSourceRefresh(true);
      scheduleInputDraftSave();
      scheduleCountAnnouncement();
    });
    elements.source.addEventListener("input", () => {
      fileReadGeneration += 1;
      if (pendingEncoding) {
        hideEncodingDiagnostics();
        setFileStatus("入力を編集したため、文字コード候補を閉じました。", false);
      }
      sourceRevision += 1;
      invalidateMojibakeOutput();
      scheduleSourceRefresh(!composing);
      scheduleInputDraftSave();
      if (!composing) scheduleCountAnnouncement();
    });
    ["select", "keyup", "mouseup", "touchend"].forEach((eventName) => {
      elements.source.addEventListener(eventName, () => updateSelection(true));
    });
    document.addEventListener("selectionchange", () => {
      if (document.activeElement === elements.source) {
        updateSelection(true);
      }
    });
    elements.transformSelectionOnly.addEventListener("change", () => {
      if (currentMode === "mojibake") {
        activeGlitchPresetName = "";
        invalidateMojibakeOutput();
      }
      else if (currentMode === "mirror") updateMirrorOutput();
      else if (currentMode === "romaji") updateRomajiOutput();
      updateSelectionTransformUi(currentTransformSelection(), false);
    });

    elements.output.addEventListener("input", () => {
      if (transformStates[currentMode]) {
        transformStates[currentMode].text = elements.output.value;
        if (currentMode === "mojibake") {
          markMojibakeOutputEdited();
          if (settings.mojibakePurpose === "creative") scheduleManualGlitchHistory();
        }
      }
      updateOutputCount();
      updateActionState();
    });

    elements.characterLimit.addEventListener("change", () => {
      settings.limit = elements.characterLimit.value;
      saveSettings();
      updateLimit();
      scheduleCountAnnouncement();
      if (settings.limit === "custom") {
        elements.customLimit.focus();
      }
    });
    elements.customLimit.addEventListener("input", () => {
      const value = Math.floor(Number(elements.customLimit.value));
      if (Number.isFinite(value) && value >= 1) {
        settings.customLimit = Math.min(10000000, value);
        saveSettings();
      }
      updateLimit();
      scheduleCountAnnouncement();
    });

    document.querySelectorAll('input[name="mojibakePurpose"]').forEach((input) => {
      input.addEventListener("change", () => updateMojibakePurpose(true));
    });
    elements.mojibakeMethod.addEventListener("change", () => {
      settings.mojibakeMethod = elements.mojibakeMethod.value;
      updateMojibakeMethodDescription();
      saveSettings();
      invalidateMojibakeOutput();
    });
    document.querySelectorAll('input[name="glitchIntensity"]').forEach((input) => {
      input.addEventListener("change", () => {
        activeGlitchPresetName = "";
        settings.glitchIntensity = selectedValue("glitchIntensity");
        saveSettings();
        invalidateMojibakeOutput();
        updateBatchModeSummary();
      });
    });
    elements.encodeMojibake.addEventListener("click", encodeMojibake);
    elements.decodeMojibake.addEventListener("click", decodeMojibake);
    elements.createGlitch.addEventListener("click", () => createCreativeGlitch(false));
    elements.rerollGlitch.addEventListener("click", () => createCreativeGlitch(true));
    elements.glitchUndoButton.addEventListener("click", () => moveGlitchHistory(-1));
    elements.glitchRedoButton.addEventListener("click", () => moveGlitchHistory(1));
    elements.glitchSaveCandidateButton.addEventListener("click", saveCurrentGlitchCandidate);
    elements.glitchCompareButton.addEventListener("click", () => {
      const entry = currentGlitchEntry() || createCurrentGlitchEntry();
      addGlitchComparison(entry.output, glitchEntryLabel(entry));
    });
    elements.glitchClearCompareButton.addEventListener("click", () => {
      glitchComparison = [];
      renderGlitchComparison();
      setGlitchWorkbenchStatus("比較をクリアしました。", false);
    });
    elements.glitchSeedLocked.addEventListener("change", () => {
      activeGlitchPresetName = "";
      if (elements.glitchSeedLocked.checked && !tools.workflow.normalizeSeed(elements.glitchSeed.value)) {
        elements.glitchSeed.value = `scene-${Date.now().toString(36)}`;
      }
      invalidateMojibakeOutput();
      updateGlitchActionState();
      updateBatchModeSummary();
    });
    elements.glitchSeed.addEventListener("input", () => {
      activeGlitchPresetName = "";
      invalidateMojibakeOutput();
      updateGlitchActionState();
      updateBatchModeSummary();
    });
    elements.glitchReplayButton.addEventListener("click", () => createCreativeGlitch(false));
    elements.glitchSavePresetButton.addEventListener("click", saveGlitchPreset);
    elements.glitchPresetSelect.addEventListener("change", updateGlitchActionState);
    elements.glitchApplyPresetButton.addEventListener("click", applySelectedGlitchPreset);
    elements.glitchDeletePresetButton.addEventListener("click", deleteSelectedGlitchPreset);
    elements.glitchExportRecipeButton.addEventListener("click", exportGlitchRecipe);
    elements.glitchImportRecipeButton.addEventListener("click", () => elements.glitchRecipeFileInput.click());
    elements.glitchRecipeFileInput.addEventListener("change", () => importGlitchRecipe(elements.glitchRecipeFileInput.files && elements.glitchRecipeFileInput.files[0]));

    document.querySelectorAll('input[name="mirrorMethod"]').forEach((input) => {
      input.addEventListener("change", () => {
        settings.mirrorMethod = selectedValue("mirrorMethod");
        saveSettings();
        updateMirrorOutput();
        updateBatchModeSummary();
      });
    });
    elements.lineByLine.addEventListener("change", () => {
      settings.lineByLine = elements.lineByLine.checked;
      saveSettings();
      updateMirrorOutput();
      updateBatchModeSummary();
    });

    document.querySelectorAll('input[name="romajiDirection"]').forEach((input) => {
      input.addEventListener("change", () => {
        settings.romajiDirection = selectedValue("romajiDirection") || "toKana";
        saveSettings();
        updateRomajiControls();
        updateRomajiOutput();
        updateBatchModeSummary();
      });
    });
    document.querySelectorAll('input[name="romajiScript"]').forEach((input) => {
      input.addEventListener("change", () => {
        settings.romajiScript = selectedValue("romajiScript") || "hiragana";
        saveSettings();
        updateRomajiControls();
        updateRomajiOutput();
        updateBatchModeSummary();
      });
    });
    document.querySelectorAll('input[name="romajiSystem"]').forEach((input) => {
      input.addEventListener("change", () => {
        settings.romajiSystem = selectedValue("romajiSystem") || "hepburn";
        saveSettings();
        updateRomajiOutput();
        updateBatchModeSummary();
      });
    });
    elements.romajiLongVowel.addEventListener("change", () => {
      settings.romajiLongVowel = elements.romajiLongVowel.value;
      saveSettings();
      updateRomajiOutput();
      updateBatchModeSummary();
    });
    elements.romajiParticles.addEventListener("change", () => {
      settings.romajiParticles = elements.romajiParticles.value;
      saveSettings();
      updateRomajiOutput();
      updateBatchModeSummary();
    });

    elements.kanaInput.addEventListener("compositionstart", () => { kanaComposing = true; });
    elements.kanaInput.addEventListener("compositionend", () => { kanaComposing = false; });
    elements.kanaInput.addEventListener("input", () => {
      elements.kanaInputError.textContent = "";
      elements.kanaInput.removeAttribute("aria-invalid");
    });
    elements.kanaInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.isComposing && !kanaComposing) {
        event.preventDefault();
        generateKanaCandidates();
      }
    });
    document.querySelectorAll('input[name="kanaTaste"]').forEach((input) => {
      input.addEventListener("change", () => {
        settings.kanaTaste = selectedValue("kanaTaste") || "standard";
        kanaGeneration = 0;
        saveSettings();
        if (kanaCandidates.length) generateKanaCandidates();
      });
    });
    elements.kanaFidelity.addEventListener("input", () => {
      settings.kanaFidelity = Math.max(1, Math.min(5, Number(elements.kanaFidelity.value) || 3));
      updateKanaFidelityLabel();
      saveSettings();
    });
    elements.kanaFidelity.addEventListener("change", () => {
      kanaGeneration = 0;
      if (kanaCandidates.length) generateKanaCandidates();
    });
    elements.kanaGenerateButton.addEventListener("click", () => generateKanaCandidates());
    elements.kanaRerollButton.addEventListener("click", () => generateKanaCandidates({ reroll: true }));
    elements.kanaCopyAllButton.addEventListener("click", () => {
      if (!kanaCandidates.length) return;
      copyKanaText(kanaCandidates.map((candidate) => candidate.spelling).join("\n"), "候補をすべてコピーしました");
    });
    elements.kanaClearHistoryButton.addEventListener("click", clearKanaHistory);
    elements.kanaHistoryEnabled.addEventListener("change", () => setKanaHistoryEnabled(elements.kanaHistoryEnabled.checked));
    elements.exportKanaDataButton.addEventListener("click", exportKanaData);
    elements.importKanaDataButton.addEventListener("click", () => elements.kanaDataFileInput.click());
    elements.kanaDataFileInput.addEventListener("change", () => importKanaData(elements.kanaDataFileInput.files && elements.kanaDataFileInput.files[0]));
    elements.deleteAllLocalDataButton.addEventListener("click", deleteAllLocalData);

    elements.copyButton.addEventListener("click", handleCopy);
    elements.swapButton.addEventListener("click", handleSwap);
    elements.saveButton.addEventListener("click", handleSave);
    elements.saveInputButton.addEventListener("click", handleSourceSave);
    elements.openTextFileButton.addEventListener("click", () => elements.fileInput.click());
    elements.clearButton.addEventListener("click", handleClear);
    elements.autoSaveInput.addEventListener("change", () => setAutoSaveInput(elements.autoSaveInput.checked));
    elements.deleteDraftButton.addEventListener("click", () => setAutoSaveInput(false));
    elements.applyEncodingButton.addEventListener("click", applySelectedEncoding);
    elements.cancelEncodingButton.addEventListener("click", cancelEncodingSelection);
    elements.batchStartButton.addEventListener("click", startBatchProcessing);
    elements.batchCancelButton.addEventListener("click", cancelBatchProcessing);
    elements.batchCsvButton.addEventListener("click", exportBatchCsv);
    elements.batchClearButton.addEventListener("click", clearBatchPanel);
    root.addEventListener("pagehide", () => saveInputDraft(false, true));
    root.addEventListener("storage", handleStorageChange);

    elements.fileInput.addEventListener("change", () => handleFileList(elements.fileInput.files));
    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      root.addEventListener(eventName, (event) => event.preventDefault(), false);
    });
    elements.dropZone.addEventListener("dragenter", () => {
      dragDepth += 1;
      elements.dropZone.classList.add("is-dragging");
    });
    elements.dropZone.addEventListener("dragleave", () => {
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) elements.dropZone.classList.remove("is-dragging");
    });
    elements.dropZone.addEventListener("drop", (event) => {
      dragDepth = 0;
      elements.dropZone.classList.remove("is-dragging");
      handleFileList(event.dataTransfer.files);
    });
  }

  applySavedSettings();
  restoreInputDraft();
  bindEvents();
  renderKanaFavorites();
  renderKanaHistory();
  renderGlitchHistory();
  renderGlitchSavedCandidates();
  renderGlitchPresets();
  renderGlitchComparison();
  selectMode(settings.mode);
  refreshSource(currentMode === "mirror" || currentMode === "romaji");
  announcementsReady = true;
  document.documentElement.dataset.textToolsState = "ready";
  const startupStatus = document.getElementById("startupStatus");
  if (startupStatus) startupStatus.hidden = true;
}(window));
