(function (root) {
  "use strict";

  document.documentElement.dataset.textToolsState = "loading";

  function showStartupFailure() {
    if (document.documentElement.dataset.textToolsState === "ready") return;
    document.documentElement.dataset.textToolsState = "failed";
    const status = document.getElementById("startupStatus");
    if (status) status.hidden = false;
    document.querySelectorAll("button, select, input").forEach((control) => {
      control.disabled = true;
    });
  }

  root.addEventListener("error", showStartupFailure);
  root.addEventListener("unhandledrejection", showStartupFailure);
  root.addEventListener("DOMContentLoaded", () => {
    root.setTimeout(showStartupFailure, 1500);
  }, { once: true });
}(window));
