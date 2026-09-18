(function (root) {
  "use strict";
  root.TextTools = root.TextTools || {};
  const asset = new URL("decorative.js?v=20260918-decoration1", document.currentScript.src).href;
  let loading;
  let instance;
  let request = 0;
  function load() {
    if (root.TextTools.createDecorativeUI) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = asset;
      script.onload = () => root.TextTools.createDecorativeUI ? resolve() : reject(new Error("MODULE_MISSING"));
      script.onerror = () => { script.remove(); reject(new Error("MODULE_UNAVAILABLE")); };
      document.head.appendChild(script);
    }).catch(error => { loading = null; throw error; });
    return loading;
  }
  root.TextTools.openDecoration = async function (options) {
    const token = ++request;
    const host = document.getElementById("decorationHost");
    const status = document.getElementById("decorationLoadStatus");
    const retry = document.getElementById("decorationRetry");
    const back = document.getElementById("decorationBack");
    retry.onclick = () => root.TextTools.openDecoration(options);
    back.onclick = options.onBack;
    status.textContent = "飾り文字を読み込んでいます…";
    retry.hidden = true;
    try {
      await load();
      if (token !== request) return;
      if (!instance) instance = root.TextTools.createDecorativeUI(host, options);
      if (typeof options.source === "string") instance.setSource(options.source);
      document.getElementById("decorationLoading").hidden = true;
      host.hidden = false;
    } catch (_error) {
      host.hidden = true;
      document.getElementById("decorationLoading").hidden = false;
      status.textContent = "飾り文字を読み込めませんでした。再試行するか、既存ツールに戻れます。";
      retry.hidden = false;
    }
  };
}(window));
