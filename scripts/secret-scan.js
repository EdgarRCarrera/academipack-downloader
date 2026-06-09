"use strict";

const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const ignoredDirectories = new Set([".git", "node_modules", "dist", "coverage", "tmp", "temp"]);
const suspiciousFileNames = [
  /^\.env(?:\..+)?$/i,
  /^credentials.*\.json$/i,
  /^secrets.*\.json$/i,
  /^service-account.*\.json$/i,
  /^auth.*\.json$/i,
  /^cookies?.*\.(json|txt)$/i,
  /^session.*\.json$/i,
  /^storage-state.*\.json$/i,
  /\.(pem|key|p12|pfx|jks|keystore)$/i
];

const suspiciousContentPatterns = [
  { name: "github-token", regex: /\bghp_[A-Za-z0-9]{20,}\b/ },
  { name: "github-pat", regex: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { name: "aws-key", regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "google-api-key", regex: /\bAIza[0-9A-Za-z_-]{20,}\b/ },
  { name: "private-key", regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "bearer-token", regex: /authorization\s*:\s*bearer\s+[A-Za-z0-9._-]{10,}/i }
];

function walk(currentDirectory, findings) {
  for (const item of fs.readdirSync(currentDirectory, { withFileTypes: true })) {
    const fullPath = path.join(currentDirectory, item.name);

    if (item.isDirectory()) {
      if (!ignoredDirectories.has(item.name)) {
        walk(fullPath, findings);
      }
      continue;
    }

    const relativePath = path.relative(projectRoot, fullPath);

    for (const pattern of suspiciousFileNames) {
      if (pattern.test(item.name)) {
        findings.push(`Suspicious file name: ${relativePath}`);
        break;
      }
    }

    const contents = fs.readFileSync(fullPath, "utf8");
    for (const pattern of suspiciousContentPatterns) {
      if (pattern.regex.test(contents)) {
        findings.push(`Suspicious content (${pattern.name}): ${relativePath}`);
      }
    }
  }
}

const findings = [];
walk(projectRoot, findings);

if (findings.length) {
  for (const finding of findings) {
    console.error(finding);
  }
  process.exitCode = 1;
}
