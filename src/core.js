"use strict";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const DOCUMENT_TYPE_LABELS = new Map([
  ["pdf", "PDF"],
  ["doc", "Word"],
  ["docx", "Word"],
  ["ppt", "PowerPoint"],
  ["pptx", "PowerPoint"],
  ["xls", "Excel"],
  ["xlsx", "Excel"],
  ["odt", "OpenDocument text"],
  ["ods", "OpenDocument spreadsheet"],
  ["odp", "OpenDocument presentation"],
  ["zip", "ZIP archive"],
  ["csv", "CSV"],
  ["txt", "Text"],
  ["rtf", "RTF"],
  ["epub", "EPUB"],
  ["mp4", "Video"],
  ["mp3", "Audio"]
]);
const MIN_DELAY_MS = 3000;
const MAX_FILES = 100;
const PREVIEW_ITEMS = 5;
const REPEATED_SERVER_ERROR_LIMIT = 2;

function normalizeUrl(input, baseUrl) {
  try {
    return new URL(input, baseUrl);
  } catch {
    return null;
  }
}

function isAllowedProtocol(url) {
  return Boolean(url && ALLOWED_PROTOCOLS.has(url.protocol));
}

function isSameOrigin(url, expectedOrigin) {
  return Boolean(url && expectedOrigin && url.origin === expectedOrigin);
}

function redactUrl(url) {
  return `${url.origin}${url.pathname}`;
}

function getRedactedPath(url) {
  if (!url || typeof url.pathname !== "string" || !url.pathname) {
    return "/";
  }

  return url.pathname;
}

function isHiddenElement(element) {
  if (!element || typeof element.closest !== "function") {
    return true;
  }

  return Boolean(element.closest("[hidden], [aria-hidden=\"true\"]"));
}

function isInsideForbiddenContainer(element) {
  if (!element || typeof element.closest !== "function") {
    return true;
  }

  return Boolean(element.closest("script, template, noscript"));
}

function isExtractableAnchorElement(element) {
  if (!element || typeof element.matches !== "function" || !element.matches("a[href]")) {
    return false;
  }

  if (isInsideForbiddenContainer(element) || isHiddenElement(element)) {
    return false;
  }

  return true;
}

function isInsideAllowedActivityContainer(element, selector) {
  if (!selector || !selector.trim() || !isExtractableAnchorElement(element)) {
    return false;
  }

  return Boolean(element.closest(selector));
}

function createPatternMatcher(patterns) {
  const values = Array.isArray(patterns) ? patterns : [];

  return (url) => values.some((pattern) => url.href.includes(pattern) || url.pathname.includes(pattern));
}

function isAllowedDownloadUrl(url, options) {
  const includePatterns = Array.isArray(options.includePatterns) ? options.includePatterns : [];
  const excludePatterns = Array.isArray(options.excludePatterns) ? options.excludePatterns : [];
  const extensionPattern = options.extensionPattern;

  if (!isAllowedProtocol(url) || !isSameOrigin(url, options.origin)) {
    return false;
  }

  const matchesIncludePattern = createPatternMatcher(includePatterns)(url);
  const matchesExcludePattern = createPatternMatcher(excludePatterns)(url);
  const matchesExtension = extensionPattern instanceof RegExp ? extensionPattern.test(url.pathname) : false;

  return !matchesExcludePattern && (matchesIncludePattern || matchesExtension);
}

function clampDelayMs(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return MIN_DELAY_MS;
  }

  return Math.max(MIN_DELAY_MS, Math.trunc(numeric));
}

function clampMaxFiles(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric < 1) {
    return MAX_FILES;
  }

  return Math.min(MAX_FILES, Math.trunc(numeric));
}

function computeDelayMs(baseDelayMs, randomFn = Math.random) {
  const clampedDelay = clampDelayMs(baseDelayMs);
  const jitter = Math.floor(randomFn() * 250);
  return clampedDelay + jitter;
}

function uniqueCandidates(candidates) {
  return [...new Map(candidates.map((candidate) => [candidate.url.href, candidate])).values()];
}

function getAnchorLabel(anchor, url) {
  const label = typeof anchor.textContent === "string" ? anchor.textContent.replace(/\s+/g, " ").trim() : "";

  if (label) {
    return label;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  return segments.length ? segments[segments.length - 1] : "unnamed-file";
}

function inferExtensionFromText(text) {
  if (typeof text !== "string") {
    return "";
  }

  const normalized = text.trim().toLowerCase();
  const match = normalized.match(/\.([a-z0-9]{2,5})(?:$|\s|\))/i);
  return match ? match[1] : "";
}

function inferDocumentType(url, fallbackText = "") {
  const pathname = url && typeof url.pathname === "string" ? url.pathname.toLowerCase() : "";
  const pathMatch = pathname.match(/\.([a-z0-9]{2,5})$/i);
  const extension = pathMatch ? pathMatch[1] : inferExtensionFromText(fallbackText);

  return DOCUMENT_TYPE_LABELS.get(extension) || "undetermined";
}

function buildPreview(candidates, origin) {
  const previewLines = candidates.slice(0, PREVIEW_ITEMS).map((candidate, index) => {
    return [
      `${index + 1}. name: ${candidate.label}`,
      `origin: ${origin}`,
      `path: ${getRedactedPath(candidate.url)}`,
      `type: ${inferDocumentType(candidate.url, candidate.label)}`
    ].join(" | ");
  });
  const remainingCount = candidates.length - previewLines.length;

  return [
    `Origin: ${origin}`,
    `Documents found: ${candidates.length}`,
    "Preview:",
    ...previewLines,
    ...(remainingCount > 0 ? [`...and ${remainingCount} more item(s).`] : [])
  ].join("\n");
}

function isHtmlContentType(contentType) {
  return /(^|;)\s*(text\/html|application\/xhtml\+xml)\b/i.test(contentType || "");
}

function createFetchOptions() {
  return {
    credentials: "same-origin",
    redirect: "follow",
    referrerPolicy: "no-referrer"
  };
}

function listRepositoryJavaScriptFiles(rootDirectory) {
  const fs = require("node:fs");
  const path = require("node:path");

  const entries = [];
  const ignoredDirectoryNames = new Set([".git", "node_modules", "dist", "coverage", "tmp", "temp"]);

  function walk(currentDirectory) {
    for (const item of fs.readdirSync(currentDirectory, { withFileTypes: true })) {
      const fullPath = path.join(currentDirectory, item.name);

      if (item.isDirectory()) {
        if (!ignoredDirectoryNames.has(item.name)) {
          walk(fullPath);
        }
        continue;
      }

      if (item.name.endsWith(".js")) {
        entries.push(fullPath);
      }
    }
  }

  walk(rootDirectory);
  return entries.sort();
}

module.exports = {
  MAX_FILES,
  MIN_DELAY_MS,
  PREVIEW_ITEMS,
  REPEATED_SERVER_ERROR_LIMIT,
  buildPreview,
  clampDelayMs,
  clampMaxFiles,
  computeDelayMs,
  createFetchOptions,
  getAnchorLabel,
  getRedactedPath,
  inferDocumentType,
  isAllowedDownloadUrl,
  isAllowedProtocol,
  isExtractableAnchorElement,
  isHtmlContentType,
  isInsideAllowedActivityContainer,
  isSameOrigin,
  listRepositoryJavaScriptFiles,
  normalizeUrl,
  redactUrl,
  uniqueCandidates
};
