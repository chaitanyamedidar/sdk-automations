"use strict";

const fs = require("node:fs");
const path = require("node:path");

function loadRepositoryConfig({ repo, configDir = path.join(process.cwd(), "configs") }) {
  const repoName = repo.split("/").pop();
  const candidate = path.join(configDir, `${repoName}.yml`);
  const fallback = path.join(configDir, "default.yml");
  const selectedPath = fs.existsSync(candidate) ? candidate : fallback;

  if (!fs.existsSync(selectedPath)) {
    throw new Error(`No config found for ${repo}; expected ${candidate} or ${fallback}.`);
  }

  const raw = fs.readFileSync(selectedPath, "utf8");
  const config = parseSimpleYaml(raw);
  validateConfig(config, selectedPath);

  return {
    config,
    sourcePath: selectedPath,
    repoProfile: path.basename(selectedPath)
  };
}

function validateConfig(config, sourcePath) {
  if (!config.assignment) {
    throw new Error(`${sourcePath} is missing assignment config.`);
  }

  if (typeof config.assignment.enabled !== "boolean") {
    throw new Error(`${sourcePath} assignment.enabled must be true or false.`);
  }

  if (!config.assignment.mode) {
    throw new Error(`${sourcePath} assignment.mode is required.`);
  }
}

function parseSimpleYaml(raw) {
  const root = {};
  const stack = [{ indent: -1, value: root }];
  const lines = raw.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const original = lines[i];
    if (!original.trim() || original.trim().startsWith("#")) continue;

    const indent = original.match(/^\s*/)[0].length;
    const text = original.trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].value;

    if (text.startsWith("- ")) {
      if (!Array.isArray(parent)) {
        throw new Error(`Unsupported YAML list placement near line ${i + 1}.`);
      }
      parent.push(parseScalar(text.slice(2)));
      continue;
    }

    const separator = text.indexOf(":");
    if (separator === -1) {
      throw new Error(`Unsupported YAML syntax near line ${i + 1}: ${text}`);
    }

    const key = text.slice(0, separator).trim().replace(/^["']|["']$/g, "");
    const rawValue = text.slice(separator + 1).trim();

    if (rawValue) {
      parent[key] = parseScalar(rawValue);
      continue;
    }

    const next = nextMeaningfulLine(lines, i + 1);
    const child = next && next.trim().startsWith("- ") ? [] : {};
    parent[key] = child;
    stack.push({ indent, value: child });
  }

  return root;
}

function nextMeaningfulLine(lines, start) {
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() && !line.trim().startsWith("#")) return line;
  }
  return null;
}

function parseScalar(value) {
  const unquoted = value.replace(/^["']|["']$/g, "");
  if (unquoted === "true") return true;
  if (unquoted === "false") return false;
  if (unquoted === "null") return null;
  if (/^-?\d+$/.test(unquoted)) return Number.parseInt(unquoted, 10);
  return unquoted;
}

module.exports = {
  loadRepositoryConfig,
  parseSimpleYaml
};
