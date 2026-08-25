import {
  copyFile,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import {
  assertSafeOutputDirectory,
  javascriptFiles,
  outputDirectory,
  repositoryRoot,
  resolvePagesRootPath,
} from "./github-pages-config.mjs";

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'",
  "media-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "manifest-src 'none'",
].join("; ");

const errorPageStyles = `
:root {
  color-scheme: light;
  font-family: "Yu Gothic UI", "Hiragino Sans", "Noto Sans JP", sans-serif;
  color: #1e2926;
  background: #f3f1e9;
}

* { box-sizing: border-box; }

body {
  min-height: 100vh;
  margin: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at 15% 10%, rgba(35, 119, 104, 0.12), transparent 34rem),
    #f3f1e9;
}

main {
  width: min(620px, 100%);
  padding: clamp(28px, 6vw, 56px);
  border: 1px solid #cdd7d1;
  border-radius: 28px;
  background: rgba(255, 255, 252, 0.9);
  box-shadow: 0 20px 50px rgba(33, 68, 60, 0.1);
}

p { color: #5f6b67; line-height: 1.8; }

.eyebrow {
  margin: 0 0 10px;
  color: #237768;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.16em;
}

h1 { margin: 0; font-size: clamp(1.8rem, 6vw, 3rem); line-height: 1.25; }

a {
  display: inline-block;
  margin-top: 12px;
  padding: 12px 18px;
  border-radius: 999px;
  color: #fff;
  background: #237768;
  font-weight: 700;
  text-decoration: none;
}

a:focus-visible { outline: 3px solid #d28a50; outline-offset: 4px; }
`;

function escapeHtmlAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function replaceRequired(source, search, replacement) {
  if (!source.includes(search)) {
    throw new Error(`Required HTML marker is missing: ${search}`);
  }
  return source.replace(search, replacement);
}

function createPagesIndex(template) {
  let html = template;
  html = replaceRequired(
    html,
    '<meta name="referrer" content="no-referrer">',
    `<meta name="referrer" content="no-referrer">\n  <meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy}">`,
  );
  html = replaceRequired(
    html,
    "URLを受け取った人は開けます",
    "URLを受け取った人は開け、再共有も防げません",
  );
  html = replaceRequired(
    html,
    "検索エンジンへ登録しない設定にしています。",
    "検索エンジンへ登録しない設定ですが、検索除外は保証されません。",
  );
  html = replaceRequired(
    html,
    "ページ表示に必要な一般的な通信情報は、配信基盤で取り扱われる場合があります。",
    "GitHub Pagesによる配信では、IPアドレスなど一般的な通信情報をGitHubがセキュリティ目的で取り扱う場合があります。",
  );
  return html;
}

function createNotFoundPage(pagesRootPath) {
  const root = escapeHtmlAttribute(pagesRootPath);
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex,nofollow,noarchive,nosnippet,noimageindex">
  <meta name="googlebot" content="noindex,nofollow,noarchive,nosnippet,noimageindex">
  <meta name="referrer" content="no-referrer">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'">
  <title>ページが見つかりません | 文字いじりツール</title>
  <link rel="stylesheet" href="${root}404.css">
</head>
<body>
  <main>
    <p class="eyebrow">404 · NOT FOUND</p>
    <h1>ページが見つかりません</h1>
    <p>URLが正しいか確認してください。入力した文章や変換結果が、この画面から送信されることはありません。</p>
    <a href="${root}">文字いじりツールへ戻る</a>
  </main>
</body>
</html>
`;
}

async function copyPublishedFile(sourceRelativePath, destinationRelativePath) {
  const sourcePath = path.join(repositoryRoot, sourceRelativePath);
  const destinationPath = path.join(outputDirectory, destinationRelativePath);
  await mkdir(path.dirname(destinationPath), { recursive: true });
  await copyFile(sourcePath, destinationPath);
}

assertSafeOutputDirectory();
const pagesRootPath = resolvePagesRootPath();
const templatePath = path.join(repositoryRoot, "app", "standalone", "template.html");
const template = await readFile(templatePath, "utf8");

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

await Promise.all([
  copyPublishedFile("public/css/style.css", "css/style.css"),
  copyPublishedFile("public/og.png", "og.png"),
  ...javascriptFiles.map((fileName) =>
    copyPublishedFile(`public/js/${fileName}`, `js/${fileName}`),
  ),
]);

await Promise.all([
  writeFile(path.join(outputDirectory, ".nojekyll"), "", "utf8"),
  writeFile(path.join(outputDirectory, "404.css"), errorPageStyles.trimStart(), "utf8"),
  writeFile(
    path.join(outputDirectory, "404.html"),
    createNotFoundPage(pagesRootPath),
    "utf8",
  ),
  writeFile(path.join(outputDirectory, "index.html"), createPagesIndex(template), "utf8"),
]);

console.log(`GitHub Pages artifact created at ${outputDirectory}`);
console.log(`Pages root path: ${pagesRootPath}`);
