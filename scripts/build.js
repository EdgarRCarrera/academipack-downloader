"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { minify } = require("terser");

const projectRoot = path.resolve(__dirname, "..");

const OUTPUT_TARGETS = {
  bookmarklet: [
    {
      banner: [
        "// AcademiPack Downloader - readable bookmarklet source",
        "// Review this file before using the generated bookmarklet.min.js.",
        "// Built from the audited source tree with npm run build."
      ].join("\n"),
      entryPoint: path.join(projectRoot, "src", "entries", "bookmarklet-entry.js"),
      minify: false,
      outputPath: path.join(projectRoot, "bookmarklet", "bookmarklet.js"),
      wrapAsBookmarklet: false
    },
    {
      banner: "",
      entryPoint: path.join(projectRoot, "src", "entries", "bookmarklet-entry.js"),
      minify: true,
      outputPath: path.join(projectRoot, "bookmarklet", "bookmarklet.min.js"),
      wrapAsBookmarklet: true
    }
  ],
  console: [
    {
      banner: [
        "// AcademiPack Downloader - advanced console script",
        "// Review this file before pasting it into any LMS session.",
        "// Built from the audited source tree with npm run build."
      ].join("\n"),
      entryPoint: path.join(projectRoot, "src", "entries", "console-script-entry.js"),
      minify: false,
      outputPath: path.join(projectRoot, "console-script", "script.js"),
      wrapAsBookmarklet: false
    }
  ]
};

function readSource(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8").trim();
}

function indent(sourceText, spaces) {
  const prefix = " ".repeat(spaces);
  return sourceText.split("\n").map((line) => `${prefix}${line}`).join("\n");
}

function normalizeModuleSource(sourceText, replacements = []) {
  let normalized = sourceText.replace(/\r\n/g, "\n");

  for (const [fromValue, toValue] of replacements) {
    normalized = normalized.replace(fromValue, toValue);
  }

  return normalized.trim();
}

function createBundle(entrySourcePath, banner) {
  const coreSource = normalizeModuleSource(readSource("src/core.js"));
  const runtimeSource = normalizeModuleSource(readSource("src/runtime.js"));
  const entrySource = normalizeModuleSource(readSource(path.relative(projectRoot, entrySourcePath)), [
    ["require(\"../runtime\")", "require(\"./runtime\")"]
  ]);

  const bannerSection = banner ? `${banner}\n` : "";

  return `${bannerSection}(function () {
  const modules = {
    "./core": function (module, exports, require) {
${indent(coreSource, 6)}
    },
    "./runtime": function (module, exports, require) {
${indent(runtimeSource, 6)}
    },
    "./entry": function (module, exports, require) {
${indent(entrySource, 6)}
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
})();`;
}

async function bundleEntry(entryPoint, shouldMinify, banner) {
  const bundled = createBundle(entryPoint, banner);

  if (!shouldMinify) {
    return bundled.trim();
  }

  const result = await minify(bundled, {
    compress: true,
    format: {
      ascii_only: true,
      comments: false
    },
    mangle: true
  });

  return result.code.trim();
}

async function renderOutputs(selectedTarget) {
  const targets = selectedTarget
    ? { [selectedTarget]: OUTPUT_TARGETS[selectedTarget] }
    : OUTPUT_TARGETS;
  const outputs = {};

  for (const targetEntries of Object.values(targets)) {
    for (const target of targetEntries) {
      const bundled = await bundleEntry(target.entryPoint, target.minify, target.banner);
      outputs[target.outputPath] = target.wrapAsBookmarklet ? `javascript:${bundled}` : `${bundled}\n`;
    }
  }

  return outputs;
}

function writeOutputs(outputs) {
  for (const [outputPath, contents] of Object.entries(outputs)) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, contents, "utf8");
  }
}

async function main() {
  const selectedTarget = process.argv[2];
  const outputs = await renderOutputs(selectedTarget);
  writeOutputs(outputs);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  renderOutputs,
  writeOutputs
};
