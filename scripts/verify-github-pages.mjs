import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import {
  assertSafeOutputDirectory,
  outputDirectory,
  publishedFiles,
  repositoryRoot,
  resolvePagesRootPath,
} from "./github-pages-config.mjs";

const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

async function listFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(absolutePath, relativePath)));
    } else {
      const stats = await lstat(absolutePath);
      check(!stats.isSymbolicLink(), `Published artifact must not contain symlinks: ${relativePath}`);
      files.push(relativePath);
    }
  }
  return files.sort();
}

function extractAssetReferences(html) {
  const references = [];
  for (const expression of [
    /<script\b[^>]*\bsrc="([^"]+)"[^>]*>/giu,
    /<link\b[^>]*\bhref="([^"]+)"[^>]*>/giu,
  ]) {
    for (const match of html.matchAll(expression)) references.push(match[1]);
  }
  return references;
}

function localReferencePath(reference) {
  const withoutQuery = reference.split(/[?#]/u, 1)[0];
  check(!withoutQuery.startsWith("/"), `Index asset reference must be relative: ${reference}`);
  check(!/^[a-z][a-z\d+.-]*:/iu.test(withoutQuery), `External asset reference is forbidden: ${reference}`);
  check(!withoutQuery.includes("\\"), `Backslashes are forbidden in asset references: ${reference}`);
  const normalized = path.posix.normalize(withoutQuery);
  check(normalized !== ".." && !normalized.startsWith("../"), `Unsafe asset reference: ${reference}`);
  return normalized;
}

assertSafeOutputDirectory();
const actualFiles = await listFiles(outputDirectory);
check(
  JSON.stringify(actualFiles) === JSON.stringify(publishedFiles),
  `Artifact allowlist mismatch.\nExpected: ${publishedFiles.join(", ")}\nActual: ${actualFiles.join(", ")}`,
);

const indexHtml = await readFile(path.join(outputDirectory, "index.html"), "utf8");
const notFoundHtml = await readFile(path.join(outputDirectory, "404.html"), "utf8");
const workflow = await readFile(
  path.join(repositoryRoot, ".github", "workflows", "deploy-pages.yml"),
  "utf8",
);

for (const [label, html] of [
  ["index.html", indexHtml],
  ["404.html", notFoundHtml],
]) {
  check(
    html.includes('name="robots" content="noindex,nofollow,noarchive,nosnippet,noimageindex"'),
    `${label} must carry the noindex policy.`,
  );
  check(html.includes('name="referrer" content="no-referrer"'), `${label} must disable referrers.`);
  check(html.includes('http-equiv="Content-Security-Policy"'), `${label} must include a meta CSP.`);
}

for (const requiredText of [
  "検索対象外・認証なし",
  "再共有も防げません",
  "検索除外は保証されません",
  "GitHub Pagesによる配信",
  "アクセス解析・広告・外部フォントを組み込んでいません",
  "アプリから外部へ送信しません",
]) {
  check(indexHtml.includes(requiredText), `Missing GitHub Pages disclosure: ${requiredText}`);
}

check(
  indexHtml.includes('id="sourceText"') &&
    indexHtml.includes('spellcheck="false"') &&
    indexHtml.includes('maxlength="1000000"'),
  "The protected source input limits must remain in the published page.",
);

for (const reference of extractAssetReferences(indexHtml)) {
  const relativePath = localReferencePath(reference);
  check(
    actualFiles.includes(relativePath),
    `Referenced asset is missing from the artifact: ${reference}`,
  );
}

const pagesRootPath = resolvePagesRootPath();
check(
  notFoundHtml.includes(`href="${pagesRootPath}404.css"`),
  "404 stylesheet must use the configured Pages root path.",
);
check(
  notFoundHtml.includes(`href="${pagesRootPath}"`),
  "404 return link must use the configured Pages root path.",
);

for (const [environment, expectedPath] of [
  [{}, "/"],
  [{ GITHUB_REPOSITORY: "owner/example" }, "/example/"],
  [{ GITHUB_REPOSITORY: "owner/owner.github.io" }, "/"],
  [{ PAGES_BASE_PATH: "" }, "/"],
  [{ PAGES_BASE_PATH: "/example" }, "/example/"],
  [{ PAGES_BASE_URL: "https://owner.github.io/example" }, "/example/"],
]) {
  check(
    resolvePagesRootPath(environment) === expectedPath,
    `Pages root path resolution failed for ${JSON.stringify(environment)}.`,
  );
}

const actionReferences = [...workflow.matchAll(/^\s*uses:\s*([^\s#]+)(?:\s+#\s*(.+))?$/gmu)];
check(actionReferences.length === 5, "The deployment workflow must use exactly five reviewed Actions.");
for (const [, actionReference, versionComment] of actionReferences) {
  check(
    /^actions\/[a-z-]+@[a-f\d]{40}$/u.test(actionReference),
    `Action must be pinned to a full commit SHA: ${actionReference}`,
  );
  check(/^v\d+\.\d+\.\d+$/u.test(versionComment ?? ""), `Pinned Action needs a version comment: ${actionReference}`);
}
check(!workflow.includes("pull_request_target"), "Untrusted pull_request_target deployments are forbidden.");
check(workflow.includes("permissions: {}"), "Workflow permissions must default to none.");
check(
  workflow.includes("contents: read") &&
    workflow.includes("pages: read") &&
    workflow.includes("pages: write") &&
    workflow.includes("id-token: write"),
  "Workflow must separate minimum build and deployment permissions.",
);
check(
  workflow.includes("path: ./github-pages-dist"),
  "Workflow must upload only the allowlisted artifact directory.",
);
check(
  !/\b(?:npm|pnpm|yarn)\s+(?:ci|install|add)\b/u.test(workflow),
  "Pages deployment must not install the application dependency tree.",
);

const javascript = (
  await Promise.all(
    actualFiles
      .filter((fileName) => fileName.startsWith("js/") && fileName.endsWith(".js"))
      .map((fileName) => readFile(path.join(outputDirectory, fileName), "utf8")),
  )
).join("\n");

for (const forbiddenNetworkApi of [
  /\bfetch\s*\(/u,
  /\bXMLHttpRequest\b/u,
  /\bWebSocket\b/u,
  /\bEventSource\b/u,
  /\bsendBeacon\s*\(/u,
]) {
  check(
    !forbiddenNetworkApi.test(javascript),
    `Published JavaScript contains a forbidden network API: ${forbiddenNetworkApi}`,
  );
}

check(
  !actualFiles.some((fileName) =>
    /(^|\/)(?:\.openai|\.env|\.git|node_modules|outputs?|work|dist)(?:\/|$)/u.test(fileName),
  ),
  "Private, development, or platform-specific files leaked into the artifact.",
);

if (failures.length > 0) {
  console.error(`GitHub Pages verification failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`GitHub Pages artifact verified (${actualFiles.length} allowlisted files).`);
}
