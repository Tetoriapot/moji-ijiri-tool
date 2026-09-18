import path from "node:path";
import { fileURLToPath } from "node:url";

export const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
export const outputDirectory = path.join(repositoryRoot, "github-pages-dist");

export const javascriptFiles = [
  "app.js",
  "boot.js",
  "count.js",
  "decorative-loader.js",
  "decorative.js",
  "encoding.js",
  "kana-spell.js",
  "local-data.js",
  "mirror.js",
  "mojibake.js",
  "roman-kana.js",
  "workflow.js",
];

export const publishedFiles = [
  ".nojekyll",
  "404.css",
  "404.html",
  "css/style.css",
  "index.html",
  ...javascriptFiles.map((fileName) => `js/${fileName}`),
  "og.png",
].sort();

function normalizeRootPath(value) {
  const trimmed = value.trim();
  if (!trimmed) return "/";
  if (!trimmed.startsWith("/") || trimmed.includes("\\") || /[?#]/u.test(trimmed)) {
    throw new Error(`Invalid GitHub Pages base path: ${JSON.stringify(value)}`);
  }

  const segments = trimmed.split("/").filter(Boolean);
  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error(`Unsafe GitHub Pages base path: ${JSON.stringify(value)}`);
  }

  return segments.length > 0 ? `/${segments.join("/")}/` : "/";
}

export function resolvePagesRootPath(environment = process.env) {
  if (Object.hasOwn(environment, "PAGES_BASE_PATH")) {
    return normalizeRootPath(environment.PAGES_BASE_PATH ?? "");
  }

  if (environment.PAGES_BASE_URL?.trim()) {
    const baseUrl = new URL(environment.PAGES_BASE_URL);
    if (baseUrl.protocol !== "https:") {
      throw new Error("PAGES_BASE_URL must use HTTPS.");
    }
    return normalizeRootPath(baseUrl.pathname);
  }

  const repositoryName = environment.GITHUB_REPOSITORY?.split("/").at(-1)?.trim();
  if (!repositoryName || repositoryName.toLowerCase().endsWith(".github.io")) {
    return "/";
  }

  return normalizeRootPath(`/${encodeURIComponent(repositoryName)}/`);
}

export function assertSafeOutputDirectory() {
  const resolvedRoot = path.resolve(repositoryRoot);
  const resolvedOutput = path.resolve(outputDirectory);
  if (
    path.dirname(resolvedOutput) !== resolvedRoot ||
    path.basename(resolvedOutput) !== "github-pages-dist"
  ) {
    throw new Error(`Refusing to modify unexpected output directory: ${resolvedOutput}`);
  }
}
