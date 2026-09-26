(function (root) {
  "use strict";

  // Run before the stylesheet so a saved dark theme does not flash light.
  const key = "textTools.theme.v1";
  const document = root.document;
  let media;
  try { media = root.matchMedia("(prefers-color-scheme: dark)"); } catch (_error) { /* Light fallback. */ }
  const normalize = (value) => ["light", "dark"].includes(value) ? value : "system";
  function readPreference() {
    try { return normalize(root.localStorage.getItem(key)); } catch (_error) { return "system"; }
  }
  let preference = readPreference();

  function apply() {
    const theme = preference === "system" ? (media && media.matches ? "dark" : "light") : preference;
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#141c1a" : "#f3f1e9");
    const select = document.getElementById("themeSelect");
    if (select) select.value = preference;
  }

  function reloadPreference() {
    preference = readPreference();
    apply();
  }

  function bind() {
    apply();
    const select = document.getElementById("themeSelect");
    if (!select) return;
    select.addEventListener("change", () => {
      preference = normalize(select.value);
      apply();
      let saved = true;
      try {
        if (preference === "system") root.localStorage.removeItem(key);
        else root.localStorage.setItem(key, preference);
      } catch (_error) { saved = false; }
      const status = document.getElementById("themeStatus");
      if (status) {
        status.textContent = saved ? "配色を変更しました。" : "配色は変更しましたが、保存できません。このページだけに適用します。";
        status.classList.toggle("visually-hidden", saved);
      }
    });
  }

  apply();
  if (media && media.addEventListener) media.addEventListener("change", apply);
  else if (media && media.addListener) media.addListener(apply);
  root.addEventListener("storage", (event) => {
    try { if (event.storageArea && event.storageArea !== root.localStorage) return; } catch (_error) { return; }
    if (event.key === key || event.key === null) reloadPreference();
  });
  root.addEventListener("texttools:theme-reload", reloadPreference);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();
}(window));
