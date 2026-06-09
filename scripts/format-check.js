"use strict";

const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const includedExtensions = new Set([".js", ".json", ".md", ".yml", ".yaml"]);
const includedRootNames = new Set([".gitignore", "LICENSE"]);
const ignoredDirectoryNames = new Set([".git", "node_modules", "dist", "coverage", "tmp", "temp"]);
const ignoredRelativePaths = new Set([
  path.join("bookmarklet", "bookmarklet.js"),
  path.join("bookmarklet", "bookmarklet.min.js"),
  path.join("console-script", "script.js")
]);
const failures = [];

function shouldCheckFile(filePath) {
  const parsed = path.parse(filePath);
  const relativePath = path.relative(projectRoot, filePath);

  if (ignoredRelativePaths.has(relativePath)) {
    return false;
  }

  return includedExtensions.has(parsed.ext) || includedRootNames.has(parsed.base);
}

function walk(currentDirectory) {
  for (const entry of fs.readdirSync(currentDirectory, { withFileTypes: true })) {
    const fullPath = path.join(currentDirectory, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirectoryNames.has(entry.name)) {
        walk(fullPath);
      }
      continue;
    }

    if (!shouldCheckFile(fullPath)) {
      continue;
    }

    const contents = fs.readFileSync(fullPath, "utf8");
    const lines = contents.split("\n");

    lines.forEach((line, index) => {
      if (/[ \t]+$/.test(line)) {
        failures.push(`${path.relative(projectRoot, fullPath)}:${index + 1} has trailing whitespace`);
      }
    });
  }
}

walk(projectRoot);

if (failures.length) {
  for (const failure of failures) {
    process.stderr.write(`${failure}\n`);
  }
  process.exitCode = 1;
}
