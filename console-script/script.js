// AcademiPack Downloader - advanced console script
// Review this file before pasting it into any LMS session.
// Built from the audited source tree with npm run build.
(function () {
  const modules = {
    "./core": function (module, exports, require) {
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
    },
    "./runtime": function (module, exports, require) {
      "use strict";
      
      const {
        MAX_FILES,
        MIN_DELAY_MS,
        REPEATED_SERVER_ERROR_LIMIT,
        buildPreview,
        clampDelayMs,
        clampMaxFiles,
        computeDelayMs,
        createFetchOptions,
        getAnchorLabel,
        isAllowedDownloadUrl,
        isAllowedProtocol,
        isExtractableAnchorElement,
        isHtmlContentType,
        isInsideAllowedActivityContainer,
        isSameOrigin,
        normalizeUrl,
        redactUrl,
        uniqueCandidates
      } = require("./core");
      
      const DEFAULT_ACTIVITY_SELECTORS = [
        ".activityname",
        ".instancename",
        "li.activity",
        ".ig-title",
        ".course-content li",
        "[data-type=\"resource\"]"
      ];
      
      const DEFAULT_INCLUDE_PATTERNS = [
        "pluginfile.php",
        "mod/resource/view.php",
        "/files/",
        "/bbcswebdav/",
        "/download"
      ];
      
      const DEFAULT_EXCLUDE_PATTERNS = [
        "/mod/quiz/",
        "/mod/forum/",
        "/mod/assign/",
        "/mod/chat/",
        "/mod/choice/",
        "/mod/feedback/",
        "/mod/workshop/",
        "/mod/scorm/",
        "/mod/lti/",
        "/assignments/",
        "/quizzes/",
        "/discussion/",
        "/discussion_topics/",
        "/grades/",
        "/submission/",
        "/submissions/",
        "/forum/",
        "/gradebook/"
      ];
      
      const DEFAULT_EXTENSION_PATTERN = /\.(pdf|docx?|pptx?|xlsx?|odt|ods|odp|zip|csv|txt|rtf|epub|mp4|mp3)(?:$|\?)/i;
      
      class StopProcessError extends Error {
        constructor(code, message) {
          super(message);
          this.code = code;
        }
      }
      
      function createDefaultConfig(windowObject, overrides) {
        return {
          activitySelector: DEFAULT_ACTIVITY_SELECTORS.join(","),
          delayMs: MIN_DELAY_MS,
          extensionPattern: DEFAULT_EXTENSION_PATTERN,
          excludePatterns: DEFAULT_EXCLUDE_PATTERNS,
          includePatterns: DEFAULT_INCLUDE_PATTERNS,
          maxFiles: MAX_FILES,
          modeName: "console",
          origin: windowObject.location.origin,
          platformAdapter: null,
          resolveIntermediatePages: true,
          ...overrides
        };
      }
      
      function createState(windowObject) {
        return {
          cancelled: false,
          logger: windowObject.console,
          repeatedServerErrors: 0
        };
      }
      
      function exposeCancellation(windowObject, state) {
        windowObject.academiPackDownloader = {
          cancel() {
            state.cancelled = true;
          },
          getState() {
            return { cancelled: state.cancelled };
          }
        };
      }
      
      function assertNotCancelled(state) {
        if (state.cancelled) {
          throw new StopProcessError("cancelled", "cancelled by user");
        }
      }
      
      function collectAllowedCandidates(documentObject, config, options = {}) {
        const containerSelector = options.containerSelector || config.activitySelector;
        const allowAnyVisibleContainer = Boolean(options.allowAnyVisibleContainer);
        const baseUrl = options.baseUrl || documentObject.baseURI;
        const anchors = [...documentObject.querySelectorAll("a[href]")];
      
        const candidates = anchors.flatMap((anchor) => {
          if (!isExtractableAnchorElement(anchor)) {
            return [];
          }
      
          if (!allowAnyVisibleContainer && !isInsideAllowedActivityContainer(anchor, containerSelector)) {
            return [];
          }
      
          const relativeHref = anchor.getAttribute("href");
          const url = normalizeUrl(relativeHref, baseUrl);
      
          if (!url || !isAllowedDownloadUrl(url, config)) {
            return [];
          }
      
          return [{
            anchor,
            label: getAnchorLabel(anchor, url),
            url
          }];
        });
      
        return uniqueCandidates(candidates);
      }
      
      function enforceFileCount(candidates, config) {
        const maxFiles = clampMaxFiles(config.maxFiles);
      
        if (candidates.length > maxFiles) {
          throw new StopProcessError(
            "too-many-files",
            `Refusing to continue because ${candidates.length} files were found and the safe limit is ${maxFiles}.`
          );
        }
      }
      
      function showPreviewAndConfirm(windowObject, candidates, config) {
        const previewMessage = [
          buildPreview(candidates, config.origin),
          "",
          "Use only your own account and only files you are authorized to access.",
          "Query strings, fragments and signed parameters are intentionally hidden.",
          "Cancel now in the next prompt, or cancel later with academiPackDownloader.cancel()."
        ].join("\n");
      
        windowObject.console.log(previewMessage);
        windowObject.alert(previewMessage);
      
        return windowObject.confirm(
          "This tool will only attempt same-origin downloads that are visibly linked on the current page.\n" +
          "Do not continue unless you are authorized to access and copy these files.\n\n" +
          "Continue?"
        );
      }
      
      function evaluateResponseStatus(response, state) {
        if (response.status === 401) {
          throw new StopProcessError("authentication-required", "authentication required");
        }
      
        if (response.status === 403) {
          throw new StopProcessError("forbidden", "access denied by the server");
        }
      
        if (response.status === 429) {
          throw new StopProcessError("rate-limited", "server is rate limiting requests");
        }
      
        if (response.status === 404) {
          state.repeatedServerErrors = 0;
          state.logger.warn("Skipping missing resource.");
          return "skip";
        }
      
        if (response.status >= 500) {
          state.repeatedServerErrors += 1;
          if (state.repeatedServerErrors >= REPEATED_SERVER_ERROR_LIMIT) {
            throw new StopProcessError("server-error", "server returned repeated 5xx responses");
          }
          return "retry";
        }
      
        state.repeatedServerErrors = 0;
      
        if (!response.ok) {
          state.logger.warn(`Skipping HTTP ${response.status}.`);
          return "skip";
        }
      
        return "continue";
      }
      
      async function fetchWithLimitedRetry(windowObject, url, config, state) {
        const retryDelayMs = clampDelayMs(config.delayMs);
      
        for (;;) {
          const response = await windowObject.fetch(url.href, createFetchOptions());
          const statusResult = evaluateResponseStatus(response, state);
      
          if (statusResult !== "retry") {
            return { response, statusResult };
          }
      
          state.logger.warn(`Retrying once after a same-origin server error for ${redactUrl(url)}.`);
          await sleep(windowObject, retryDelayMs);
        }
      }
      
      function detectLoginPage(documentObject) {
        return Boolean(documentObject.querySelector("input[type=\"password\"]"));
      }
      
      function applyPlatformAdapter(url, adapter) {
        if (
          !adapter ||
          !adapter.enabled ||
          !adapter.searchParamName ||
          !(adapter.pathPattern instanceof RegExp) ||
          !adapter.pathPattern.test(url.pathname)
        ) {
          return new URL(url.href);
        }
      
        const adaptedUrl = new URL(url.href);
        adaptedUrl.searchParams.set(adapter.searchParamName, adapter.searchParamValue || "1");
        return adaptedUrl;
      }
      
      async function resolveDownloadTarget(windowObject, candidate, config, state) {
        assertNotCancelled(state);
      
        if (!config.resolveIntermediatePages || config.extensionPattern.test(candidate.url.pathname)) {
          return { label: candidate.label, url: applyPlatformAdapter(candidate.url, config.platformAdapter) };
        }
      
        const { response, statusResult } = await fetchWithLimitedRetry(windowObject, candidate.url, config, state);
      
        if (statusResult === "skip") {
          return null;
        }
      
        const finalUrl = normalizeUrl(response.url, candidate.url.href);
      
        if (!finalUrl || !isAllowedProtocol(finalUrl) || !isSameOrigin(finalUrl, config.origin)) {
          throw new StopProcessError("cross-origin-redirect", "blocked a cross-origin redirect");
        }
      
        const contentType = response.headers.get("content-type") || "";
      
        if (!isHtmlContentType(contentType)) {
          if (!isAllowedDownloadUrl(finalUrl, config)) {
            return null;
          }
          return { label: candidate.label, url: applyPlatformAdapter(finalUrl, config.platformAdapter) };
        }
      
        const html = await response.text();
        const parsedDocument = new windowObject.DOMParser().parseFromString(html, "text/html");
      
        if (detectLoginPage(parsedDocument)) {
          throw new StopProcessError("authentication-required", "authentication required");
        }
      
        const resolvedCandidates = collectAllowedCandidates(parsedDocument, config, {
          allowAnyVisibleContainer: true,
          baseUrl: finalUrl.href,
          containerSelector: config.activitySelector
        });
      
        return resolvedCandidates.length
          ? {
              label: resolvedCandidates[0].label,
              url: applyPlatformAdapter(resolvedCandidates[0].url, config.platformAdapter)
            }
          : null;
      }
      
      function triggerDownload(windowObject, resolvedCandidate) {
        const anchor = windowObject.document.createElement("a");
        anchor.href = resolvedCandidate.url.href;
        anchor.download = "";
        anchor.referrerPolicy = "no-referrer";
        anchor.rel = "noopener noreferrer";
        anchor.style.display = "none";
        windowObject.document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      }
      
      function sleep(windowObject, delayMs) {
        return new Promise((resolve) => windowObject.setTimeout(resolve, delayMs));
      }
      
      async function runDownloader(windowObject, overrides = {}) {
        const config = createDefaultConfig(windowObject, overrides);
        const state = createState(windowObject);
        const delayMs = clampDelayMs(config.delayMs);
      
        exposeCancellation(windowObject, state);
      
        const candidates = collectAllowedCandidates(windowObject.document, config);
      
        if (!candidates.length) {
          windowObject.alert(
            "No allowed downloadable files were found.\n\n" +
            "The tool only accepts same-origin files that are visibly linked inside allowed activity containers."
          );
          return { status: "no-files" };
        }
      
        let downloadedCount = 0;
      
        try {
          enforceFileCount(candidates, config);
      
          if (!showPreviewAndConfirm(windowObject, candidates, config)) {
            windowObject.alert("Download cancelled before any request was made.");
            return { status: "cancelled-before-start" };
          }
      
          for (let index = 0; index < candidates.length; index += 1) {
            assertNotCancelled(state);
      
            const candidate = candidates[index];
            state.logger.log(`[${index + 1}/${candidates.length}] Preparing ${candidate.label} (${redactUrl(candidate.url)})`);
      
            const resolvedCandidate = await resolveDownloadTarget(windowObject, candidate, config, state);
      
            if (!resolvedCandidate) {
              state.logger.log(`[${index + 1}/${candidates.length}] Skipped.`);
              continue;
            }
      
            triggerDownload(windowObject, resolvedCandidate);
            downloadedCount += 1;
            state.logger.log(`[${index + 1}/${candidates.length}] Download triggered.`);
      
            if (index < candidates.length - 1) {
              await sleep(windowObject, computeDelayMs(delayMs));
            }
          }
        } catch (error) {
          if (error instanceof StopProcessError) {
            windowObject.alert(`Stopped: ${error.message}`);
            return { downloadedCount, reason: error.code, status: "stopped" };
          }
          throw error;
        }
      
        windowObject.alert(`Finished. Attempted ${downloadedCount} download(s) from ${candidates.length} detected item(s).`);
        return { downloadedCount, status: "completed" };
      }
      
      module.exports = {
        DEFAULT_ACTIVITY_SELECTORS,
        DEFAULT_EXCLUDE_PATTERNS,
        DEFAULT_EXTENSION_PATTERN,
        DEFAULT_INCLUDE_PATTERNS,
        StopProcessError,
        collectAllowedCandidates,
        createDefaultConfig,
        detectLoginPage,
        enforceFileCount,
        evaluateResponseStatus,
        resolveDownloadTarget,
        runDownloader
      };
    },
    "./entry": function (module, exports, require) {
      "use strict";
      
      const { runDownloader } = require("./runtime");
      
      runDownloader(window, {
        modeName: "console",
        resolveIntermediatePages: true
      });
    }
  };

  const cache = {};

  function requireModule(moduleId) {
    if (cache[moduleId]) {
      return cache[moduleId].exports;
    }

    const factory = modules[moduleId];
    if (!factory) {
      throw new Error("Unknown bundled module: " + moduleId);
    }

    const module = { exports: {} };
    cache[moduleId] = module;
    factory(module, module.exports, requireModule);
    return module.exports;
  }

  requireModule("./entry");
})();
