// Wrapped with the pure domain and immutable catalog by build.mjs.
root.TextTools.createDecorativeUI = function (host, options) {
  const catalog = createCatalog(data);
  const preferenceKey = "text-tool:decorative-text:v1";
  const sampleText = "Lipsum";
  const validIds = data.styles.map(s => `style:${s.id}`).concat(data.decorations.map(d => `decoration:${d.id}`));
  const state = { source: "", styleId: null, decorationId: null, tab: "styles", query: "", category: null,
    kind: "wrap", favoriteKind: "all", limit: 60, selection: null, undo: null, composing: false };
  let preferences = parsePreferences(null, validIds).value;
  let canSave = true;
  let copyEpoch = 0;
  let validInput = true;
  let output = "";
  let outputValid = false;
  let manualOrigin;
  let disposed = false;
  let preferenceReloadPending = false;
  const hasSegmenter = typeof Intl.Segmenter === "function";
  const notice = message => options.onToast(message);
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (text, handler, label) => {
    const node = el("button", "button button--quiet", text);
    node.type = "button";
    if (label) node.setAttribute("aria-label", label);
    node.addEventListener("click", () => {
      try { handler(node); } catch (_error) { fail(); }
    });
    return node;
  };
  function fail() {
    // Contain addon failures: never change the existing tool's startup state.
    if (disposed) return;
    host.replaceChildren(el("p", "deco-error", "飾り文字でエラーが発生しました。本文を送信せず停止しました。"));
    host.append(button("既存ツールに戻る", options.onBack));
    disposed = true;
  }
  function disable(node, blocked) {
    node.dataset.blocked = String(Boolean(blocked));
    node.disabled = Boolean(blocked) || node.dataset.copyPending === "true";
  }
  function counter(value) {
    const count = measureText(value);
    return `見た目 ${count.graphemes ?? "計測不可"}文字 ／ コードポイント ${count.codePoints} ／ UTF-16 ${count.utf16}`;
  }
  function formField(label, node) {
    const field = el("label", "deco-field", label);
    field.append(node);
    return field;
  }
  function fillSelect(node, entries) {
    entries.forEach(([value, label]) => {
      const option = el("option", "", label); option.value = value; node.append(option);
    });
  }
  function guard(callback) {
    return event => { try { if (!disposed) callback(event); } catch (_error) { fail(); } };
  }

  const inputArea = el("section", "deco-input-area");
  const input = el("textarea");
  input.id = "decoSource"; input.rows = 3; input.dir = "auto";
  input.placeholder = "飾りたい英字や名前を入力";
  input.autocomplete = "off"; input.spellcheck = false;
  input.setAttribute("autocapitalize", "off"); input.setAttribute("autocorrect", "off");
  input.setAttribute("aria-describedby", "decoInputCount decoInputError decoControlWarning decoInputHint");
  const inputLabel = el("label", "deco-source-label", "原文"); inputLabel.htmlFor = input.id;
  const inputHint = el("p", "deco-muted", "見た目の文字数で500文字まで。対応外の文字はそのまま残します。本文はこの画面を開いている間だけ保持します。");
  inputHint.id = "decoInputHint";
  const inputCount = el("p", "deco-count"); inputCount.id = "decoInputCount";
  const inputError = el("p", "deco-error"); inputError.id = "decoInputError";
  const controlWarning = el("p", "deco-notice"); controlWarning.id = "decoControlWarning";
  const sourceActions = el("div", "deco-actions");
  const originalCopy = button("原文をコピー", node => copy(state.source, node));
  const example = button("例を入力", () => { if (!state.composing) setSource(sampleText); });
  const clear = button("クリア", () => { if (!state.composing) setSource(""); });
  const undo = button("追加前に戻す", () => {
    if (state.composing || !state.undo) return;
    const saved = state.undo; state.undo = null;
    state.source = saved.text; input.value = saved.text; state.selection = saved.selection;
    refresh(); restoreSelection();
  });
  sourceActions.append(originalCopy, example, clear, undo);
  inputArea.append(inputLabel, input, inputHint, inputCount, inputError, controlWarning, sourceActions);

  const navigation = el("div", "deco-tabs"); navigation.setAttribute("role", "tablist");
  navigation.setAttribute("aria-label", "飾り文字の機能");
  const tabEntries = [["styles", "英字変換"], ["symbols", "記号"], ["names", "名前装飾"], ["favorites", "お気に入り"]];
  const tabs = tabEntries.map(([id, label], index) => {
    const node = button(label, () => switchTab(id));
    node.id = `deco-tab-${id}`; node.setAttribute("role", "tab"); node.setAttribute("aria-controls", "decoBrowser");
    node.addEventListener("keydown", guard(event => {
      let next = index;
      if (event.key === "ArrowRight") next = (index + 1) % 4;
      else if (event.key === "ArrowLeft") next = (index + 3) % 4;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = 3;
      else return;
      event.preventDefault(); switchTab(tabEntries[next][0]); tabs[next].focus();
    }));
    navigation.append(node); return node;
  });
  const browser = el("section", "deco-browser"); browser.id = "decoBrowser";
  browser.setAttribute("role", "tabpanel"); browser.tabIndex = 0;
  const toolbar = el("div", "deco-toolbar");
  const density = el("select"); fillSelect(density, [["comfortable", "ゆったり"], ["compact", "コンパクト"]]);
  density.addEventListener("change", guard(() => {
    if (state.composing) { density.value = preferences.settings.density; return; }
    preferences.settings.density = density.value; persist(); renderCards();
  }));
  const storageStatus = el("p", "deco-muted"); storageStatus.id = "decoStorageStatus";
  const favoriteHelp = el("p", "deco-muted", "星でプリセットだけを保存できます。本文は保存しません。");
  const clearFavorites = button("飾り文字のお気に入りを解除", () => {
    if (state.composing) return;
    preferences.favorites = []; persist(); renderCards(); notice("飾り文字のお気に入りを解除しました");
  });
  toolbar.append(formField("表示密度", density));

  const nameControls = el("div", "deco-name-controls");
  const styleSelect = el("select"); styleSelect.id = "decoStyle";
  fillSelect(styleSelect, [["", "通常文字（変換しない）"], ...data.styles.map(s => [s.id, s.label])]);
  styleSelect.addEventListener("change", guard(() => {
    if (state.composing) return;
    state.styleId = styleSelect.value || null; refresh();
  }));
  const resetStyle = button("通常文字に戻す", () => { if (!state.composing) { state.styleId = null; refresh(); } });
  const clearWrap = button("飾りなし・囲みを外す", () => { if (!state.composing) { state.decorationId = null; refresh(); } });
  const wrapKind = el("select");
  fillSelect(wrapKind, [["wrap", "囲み（60）"], ["template", "複数行（20）"]]);
  wrapKind.addEventListener("change", guard(() => { state.kind = wrapKind.value; state.category = null; resetFilter(); }));
  nameControls.append(formField("英字スタイル", styleSelect), formField("飾りの種類", wrapKind), resetStyle, clearWrap);
  const resultRegion = el("section", "deco-result");
  const resultHeading = el("h4", "", "完成文");
  const resultSelection = el("p", "deco-muted");
  const resultNote = el("p", "deco-muted");
  const resultPreview = el("div", "deco-preview"); resultPreview.id = "decoResult"; resultPreview.dir = "auto";
  const resultCount = el("p", "deco-count");
  const resultCopy = button("完成文をコピー", node => copy(output, node));
  resultCopy.className = "button button--dark";
  const resultOriginal = button("原文をコピー", node => copy(state.source, node));
  const resultActions = el("div", "deco-actions"); resultActions.append(resultCopy, resultOriginal);
  resultRegion.append(resultHeading, resultSelection, resultPreview, resultCount, resultNote, resultActions);

  const filters = el("div", "deco-filters");
  const search = el("input"); search.type = "search"; search.id = "decoSearch";
  search.maxLength = 200; search.autocomplete = "off"; search.placeholder = "ほし / STAR / 별";
  let searchComposing = false;
  search.addEventListener("compositionstart", () => { searchComposing = true; });
  search.addEventListener("compositionend", guard(() => { searchComposing = false; updateQuery(); }));
  search.addEventListener("input", guard(event => { if (!searchComposing && !event.isComposing) updateQuery(); }));
  function updateQuery() { if (state.query !== search.value) { state.query = search.value; resetFilter(); } }
  const favoriteKind = el("select");
  fillSelect(favoriteKind, [["all", "すべて"], ["style", "スタイル"], ["snippet", "記号"], ["wrap", "囲み"], ["template", "複数行"]]);
  favoriteKind.addEventListener("change", guard(() => { state.favoriteKind = favoriteKind.value; state.category = null; resetFilter(); }));
  const favoriteField = formField("お気に入りの種類", favoriteKind);
  const categories = el("div", "deco-categories"); categories.setAttribute("aria-label", "カテゴリ");
  filters.append(formField("飾りを検索", search), favoriteField, categories);
  const listCount = el("p", "deco-muted"); listCount.id = "decoListCount";
  const cards = el("div", "deco-cards"); cards.setAttribute("aria-describedby", listCount.id);
  const empty = el("div", "deco-empty");
  const emptyMessage = el("p");
  const reset = button("条件をリセット", () => {
    state.query = ""; search.value = ""; state.category = null; state.favoriteKind = "all"; favoriteKind.value = "all"; resetFilter(); search.focus();
  });
  empty.append(emptyMessage, reset);
  const more = button("もっと表示", () => {
    const previousLimit = state.limit; state.limit += 60; renderCards();
    cards.children[previousLimit]?.querySelector("button")?.focus();
  });
  browser.append(toolbar, nameControls, resultRegion, filters, favoriteHelp, clearFavorites, listCount, cards, empty, more);

  const manual = el("dialog", "deco-manual"); manual.setAttribute("aria-labelledby", "decoManualTitle");
  const manualTitle = el("h3", "", "選択してコピー"); manualTitle.id = "decoManualTitle";
  const manualText = el("textarea"); manualText.id = "decoManualText"; manualText.readOnly = true; manualText.rows = 6; manualText.dir = "auto";
  manualText.setAttribute("aria-label", "手動でコピーする文字");
  const manualActions = el("div", "deco-actions");
  manualActions.append(button("全文を選択", () => { manualText.focus(); manualText.select(); }), button("閉じる", () => manual.close()));
  manual.append(manualTitle, el("p", "", "自動コピーできませんでした。下の文字を選択してコピーしてください。Ctrl+C、または端末のコピーメニューを使えます。"), manualText, manualActions);
  manual.addEventListener("close", () => {
    manualText.value = "";
    if (manualOrigin?.isConnected && !manualOrigin.disabled) manualOrigin.focus({ preventScroll: true });
    else tabs[tabEntries.findIndex(([id]) => id === state.tab)].focus({ preventScroll: true });
  });
  host.replaceChildren(inputArea, navigation, storageStatus, browser, manual);

  function storageFallback(reason) {
    canSave = false;
    storageStatus.textContent = reason || "この環境ではお気に入りを保存できません。この画面を開いている間は使えます。";
  }
  function loadPreferences() {
    canSave = true; storageStatus.textContent = "";
    try {
      const parsed = parsePreferences(root.localStorage.getItem(preferenceKey), validIds);
      preferences = parsed.value;
      if (parsed.status === "invalid" || parsed.status === "future-version") {
        storageFallback("保存データの形式を読み取れません。元の値は上書きせず、この画面を開いている間だけお気に入りを使います。");
      }
    } catch (_error) { storageFallback(); }
    density.value = preferences.settings.density;
  }
  function persist() {
    if (!canSave || state.composing) return;
    try {
      // Protect a newer/corrupted value written by another tab after initial load.
      const parsed = parsePreferences(root.localStorage.getItem(preferenceKey), validIds);
      if (!["ok", "empty"].includes(parsed.status)) { storageFallback("保存データが別の形式に変わったため上書きを止めました。この画面内では引き続き使えます。"); return; }
      root.localStorage.setItem(preferenceKey, JSON.stringify({ version: 1,
        favorites: preferences.favorites.slice(0, 300), settings: { density: preferences.settings.density } }));
    } catch (_error) { storageFallback(); }
  }
  function favoriteButton(id, label) {
    const node = button("", () => {
      if (state.composing) return;
      const present = preferences.favorites.includes(id);
      if (!present && preferences.favorites.length >= 300) { notice("お気に入りは300件までです"); return; }
      preferences.favorites = present ? preferences.favorites.filter(value => value !== id) : [...preferences.favorites, id];
      persist(); renderCards(true); notice(present ? "お気に入りを解除しました" : "お気に入りに追加しました");
    }, `${label}のお気に入りを登録または解除`);
    const selected = preferences.favorites.includes(id);
    node.textContent = selected ? "★ 保存済み" : "☆ 保存";
    node.setAttribute("aria-pressed", String(selected)); node.dataset.focusKey = `favorite:${id}`;
    disable(node, state.composing);
    return node;
  }
  async function copy(value, node) {
    if (!value || state.composing || node.dataset.copyPending === "true") return;
    const token = ++copyEpoch;
    node.dataset.copyPending = "true"; node.disabled = true;
    try {
      const result = await copyPlainText(value, root);
      if (token !== copyEpoch || disposed) return;
      if (result.status === "copied") notice("コピーしました");
      if (result.status === "manual") {
        manualOrigin = node; manualText.value = value;
        if (!manual.open) manual.showModal();
        manualText.focus(); manualText.select();
      }
    } catch (_error) { notice("コピー画面を開けませんでした。原文欄から選択してコピーしてください"); }
    finally { node.dataset.copyPending = "false"; node.disabled = node.dataset.blocked === "true"; }
  }
  function saveSelection() {
    if (!state.composing) state.selection = { start: input.selectionStart, end: input.selectionEnd };
  }
  function restoreSelection() {
    if (state.composing || !state.selection) return;
    input.focus({ preventScroll: true }); input.setSelectionRange(state.selection.start, state.selection.end);
  }
  function insert(text) {
    if (state.composing || !hasSegmenter || !validInput) return;
    const selection = state.selection || {start: state.source.length, end: state.source.length};
    try {
      const next = replaceSelection(state.source, text, selection.start, selection.end);
      state.undo = {text: state.source, selection}; state.source = next.text; input.value = next.text;
      state.selection = {start: next.selectionStart, end: next.selectionEnd}; refresh(); restoreSelection();
      notice("原文に追加しました。「追加前に戻す」で取り消せます");
    } catch (_error) { notice("追加すると500文字または処理上限を超えます。原文は変更していません"); }
  }
  function setSource(value) {
    if (disposed || state.composing) return;
    state.source = value; input.value = value; state.selection = null; state.undo = null; refresh();
  }
  function receiveInput() {
    if (input.value === state.source) return;
    state.source = input.value; state.undo = null; saveSelection(); refresh();
  }
  input.addEventListener("compositionstart", guard(() => {
    state.composing = true; copyEpoch++;
    // Do not recalculate results, save, move focus, or adjust selection during IME.
    host.querySelectorAll("button, select").forEach(node => disable(node, true));
  }));
  input.addEventListener("compositionend", guard(() => {
    if (preferenceReloadPending) { preferenceReloadPending = false; loadPreferences(); }
    state.composing = false; state.source = input.value; state.undo = null; saveSelection(); refresh();
  }));
  input.addEventListener("input", guard(event => { if (!state.composing && !event.isComposing) receiveInput(); }));
  ["select", "keyup", "pointerup", "blur", "focus"].forEach(name => input.addEventListener(name, guard(saveSelection)));

  function switchTab(id) {
    if (state.composing) return;
    state.tab = id; state.limit = 60; state.query = ""; search.value = ""; state.category = null; refresh();
  }
  function resetFilter() { state.limit = 60; copyEpoch++; renderCards(); }
  function refresh() {
    if (state.composing || disposed) return;
    copyEpoch++;
    validInput = hasSegmenter;
    inputError.textContent = ""; controlWarning.textContent = "";
    if (state.source.length > LIMITS.inputUtf16) {
      validInput = false; inputCount.textContent = `UTF-16 ${state.source.length}（詳細の計測は停止中）`;
      inputError.textContent = "処理上限（20,000 UTF-16）を超えています。入力は保持しています。短くしてからお試しください。";
    } else {
      inputCount.textContent = counter(state.source);
      if (hasSegmenter && measureText(state.source).graphemes > LIMITS.inputGraphemes) {
        validInput = false; inputError.textContent = "500文字以内で入力してください（見た目の文字数を基準にします）。入力は切り捨てていません。";
      }
      if (Object.values(inspectText(state.source)).some(Boolean)) controlWarning.textContent = "見えない制御文字が含まれています。原文を確認してください。文字は削除していません。";
    }
    if (!hasSegmenter) inputError.textContent = "このブラウザでは文字の区切りを正確に扱えません。原文コピーを利用できます。";
    inputError.hidden = !inputError.textContent; controlWarning.hidden = !controlWarning.textContent;
    input.setAttribute("aria-invalid", String(!validInput));
    host.querySelectorAll("button, select").forEach(node => disable(node, false));
    disable(originalCopy, !state.source); disable(resultOriginal, !state.source);
    disable(clear, !state.source); disable(undo, !state.undo || !hasSegmenter);
    disable(styleSelect, !validInput); disable(resetStyle, !validInput); disable(clearWrap, !validInput);
    tabs.forEach((node, index) => {
      const selected = tabEntries[index][0] === state.tab;
      node.setAttribute("aria-selected", String(selected)); node.tabIndex = selected ? 0 : -1;
    });
    browser.setAttribute("aria-labelledby", `deco-tab-${state.tab}`);
    nameControls.hidden = resultRegion.hidden = state.tab !== "names";
    filters.hidden = state.tab === "styles";
    favoriteField.hidden = clearFavorites.hidden = state.tab !== "favorites";
    styleSelect.value = state.styleId || "";
    output = ""; outputValid = false;
    if (validInput) {
      try { output = catalog.compose(state.source || sampleText, {styleId: state.styleId, decorationId: state.decorationId}); outputValid = true; }
      catch (_error) { resultCount.textContent = "結果が処理上限（2,000文字または20,000 UTF-16）を超えます。飾りを減らしてください。"; }
    }
    resultPreview.textContent = outputValid ? output : "変換を停止しています。原文の注意を確認してください。";
    resultPreview.classList.toggle("is-sample", !state.source);
    const selectedDecoration = catalog.getDecoration(state.decorationId);
    const selectedStyle = catalog.getStyle(state.styleId);
    resultNote.textContent = selectedStyle ? styleNote(selectedStyle) : "原文の文字をそのまま使います。";
    resultSelection.textContent = `${!state.source ? "見本 ／ " : ""}${catalog.getStyle(state.styleId)?.label || "通常文字"} ＋ ${selectedDecoration?.label || "飾りなし"}`;
    if (outputValid) resultCount.textContent = counter(output) + (selectedDecoration?.kind === "template" ? " ／ 貼り付け先によって改行が変わる場合があります" : "");
    else if (!validInput) resultCount.textContent = "";
    disable(resultCopy, !state.source || !validInput || !outputValid);
    renderCards();
  }
  function matchesStyle(style) {
    const haystack = normalizeSearch([style.label, ...style.tags].join(" "));
    return normalizeSearch(state.query).split(/\s+/u).filter(Boolean).every(token => haystack.includes(token));
  }
  function filteredDecorations(ignoreCategory = false) {
    return filterDecorations(data.decorations, {
      query: state.query, categoryId: ignoreCategory ? null : state.category,
      kind: state.tab === "symbols" ? "snippet" : state.tab === "names" ? state.kind : state.favoriteKind === "all" ? null : state.favoriteKind,
      favoriteIds: state.tab === "favorites" ? preferences.favorites : null
    });
  }
  function renderCategories() {
    categories.replaceChildren();
    const pool = filteredDecorations(true);
    [[null, "すべて"], ...data.categories.map(c => [c.id, c.label])].forEach(([id, label]) => {
      const count = id ? pool.filter(d => d.categoryId === id).length : pool.length;
      const node = button(`${label} ${count}`, () => { state.category = id; resetFilter(); }, `${label}カテゴリ ${count}件`);
      node.setAttribute("aria-pressed", String(id === state.category));
      node.dataset.focusKey = `category:${id || "all"}`;
      if (id === state.category) node.textContent = `✓ ${label} ${count}`;
      categories.append(node);
    });
    categories.hidden = state.tab === "favorites" && state.favoriteKind === "style";
  }
  const cautionLabels = { "font-dependent": "端末・アプリで表示が異なります", "visual-reuse": "別の意味の文字を形として使っています", multiline: "貼り付け先で改行が変わる場合があります" };
  function renderCards(restoreFocus = false) {
    if (state.composing || disposed) return;
    const activeKey = document.activeElement?.dataset.focusKey;
    const activeWasInside = cards.contains(document.activeElement) || categories.contains(document.activeElement);
    host.dataset.density = preferences.settings.density;
    renderCategories();
    let items;
    if (state.tab === "styles") items = data.styles.map(value => ({type: "style", value}));
    else if (state.tab === "favorites") {
      const styles = ["all", "style"].includes(state.favoriteKind) && !state.category
        ? data.styles.filter(s => preferences.favorites.includes(`style:${s.id}`) && matchesStyle(s)).map(value => ({type: "style", value})) : [];
      items = styles.concat(filteredDecorations().map(value => ({type: value.kind, value})));
    } else items = filteredDecorations().map(value => ({type: value.kind, value}));
    cards.className = `deco-cards${state.tab === "symbols" ? " deco-cards--symbols" : ""}`;
    cards.replaceChildren();
    items.slice(0, state.limit).forEach(({type, value}) => cards.append(type === "style" ? styleCard(value) : decorationCard(value)));
    listCount.textContent = `${items.length}件中 ${Math.min(state.limit, items.length)}件を表示`;
    empty.hidden = items.length > 0;
    emptyMessage.textContent = state.tab === "favorites" && !preferences.favorites.length
      ? "気に入った文字や飾りの星を押すと、ここからすぐ使えます。" : "見つかりませんでした。検索やカテゴリを変えてみてください。";
    more.hidden = items.length <= state.limit;
    more.textContent = `もっと表示（残り${Math.max(0, items.length - state.limit)}件）`;
    if (activeKey && (restoreFocus || activeWasInside)) {
      const target = Array.from(host.querySelectorAll("[data-focus-key]")).find(node => node.dataset.focusKey === activeKey);
      (target || cards.querySelector("button") || reset).focus({preventScroll: true});
    }
  }
  function styleNote(style) {
    const note = style.approximate ? "小型大文字風の近似です。大文字小文字の区別は失われ、q・xは通常文字のままです。" : style.note;
    return [style.digitMode === "preserve" && !/数字/.test(note) ? "数字はそのまま。" : "", note].filter(Boolean).join(" ");
  }
  function styleCard(style) {
    const card = el("article", "deco-card"); card.dataset.preset = `style:${style.id}`;
    const title = el("h4", "", style.label);
    const preview = el("div", "deco-preview"); preview.dir = "auto";
    let value = "";
    if (validInput) value = convertText(state.source || sampleText, style);
    preview.textContent = validInput ? value : "原文の注意を確認してください";
    preview.classList.toggle("is-sample", !state.source);
    const sample = el("span", "deco-badge", "見本"); sample.hidden = Boolean(state.source);
    const note = el("p", "deco-muted", styleNote(style));
    const actions = el("div", "deco-actions");
    const copyButton = button("コピー", node => copy(value, node), `${style.label}の結果をコピー`);
    copyButton.dataset.focusKey = `copy:style:${style.id}`;
    const use = button("名前装飾で使う", () => { if (state.composing) return; state.styleId = style.id; switchTab("names"); tabs[2].focus({preventScroll: true}); }, `${style.label}を名前装飾で使う`);
    disable(copyButton, !state.source || !validInput); disable(use, !state.source || !validInput);
    actions.append(copyButton, use, favoriteButton(`style:${style.id}`, style.label));
    card.append(title, sample, preview, note, actions); return card;
  }
  function decorationCard(decoration) {
    const card = el("article", "deco-card"); card.dataset.preset = `decoration:${decoration.id}`;
    const snippet = decoration.kind === "snippet";
    const selected = state.decorationId === decoration.id;
    if (!snippet) card.classList.toggle("is-selected", selected);
    let previewText = snippet ? decoration.text : "原文の注意を確認してください";
    let withinOutputLimit = validInput;
    if (!snippet && validInput) {
      try { previewText = catalog.compose(state.source || sampleText, {styleId: state.styleId, decorationId: decoration.id}); }
      catch (_error) { previewText = "この飾りでは結果の処理上限を超えます"; withinOutputLimit = false; }
    }
    const main = button("", node => {
      if (snippet) copy(decoration.text, node);
      else if (!state.composing) {
        state.decorationId = decoration.id;
        if (state.tab === "names") refresh();
        else { switchTab("names"); tabs[2].focus({preventScroll: true}); }
      }
    }, `${decoration.label}${snippet ? "をコピー" : "を名前装飾で使う"}`);
    main.className = "deco-card-main"; main.dataset.focusKey = `use:${decoration.id}`;
    const preview = el("span", "deco-preview", previewText); preview.dir = "auto"; preview.setAttribute("aria-hidden", "true");
    main.append(preview, el("span", "deco-card-label", `${selected && !snippet ? "✓ 選択中 · " : ""}${decoration.label}`));
    if (!snippet) {
      main.setAttribute("aria-pressed", String(selected));
      disable(main, !state.source || !withinOutputLimit);
      if (!state.source) { main.append(el("span", "deco-badge", "見本")); preview.classList.add("is-sample"); }
    }
    const actions = el("div", "deco-actions");
    if (snippet) {
      const add = button("追加", () => insert(decoration.text), `${decoration.label}を原文に追加`);
      add.dataset.focusKey = `insert:${decoration.id}`; disable(add, !validInput); actions.append(add);
    }
    actions.append(favoriteButton(`decoration:${decoration.id}`, decoration.label));
    card.append(main, el("p", "deco-muted", decoration.cautions.map(c => cautionLabels[c]).filter(Boolean).join("。")), actions);
    return card;
  }
  function reloadPreferences() {
    if (state.composing) { preferenceReloadPending = true; return; }
    loadPreferences(); refresh();
  }
  root.addEventListener("storage", guard(event => {
    if (event.key === preferenceKey || event.key === null) reloadPreferences();
  }));
  root.addEventListener("texttools:decorative-reset", guard(reloadPreferences));
  loadPreferences(); refresh();
  return {setSource};
};
