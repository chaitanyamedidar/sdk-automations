"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadRepositoryConfig, parseSimpleYaml } = require("../src/config/loader");

test("loads repository-specific config when available", () => {
  const loaded = loadRepositoryConfig({
    repo: "hiero-ledger/hiero-sdk-python"
  });

  assert.equal(loaded.repoProfile, "hiero-sdk-python.yml");
  assert.equal(loaded.config.assignment.enabled, true);
  assert.equal(loaded.config.assignment.trigger, "/assign");
  assert.ok(loaded.config.assignment.allowed_labels.includes("skill: beginner"));
});

test("falls back to default config for unknown repository", () => {
  const loaded = loadRepositoryConfig({
    repo: "hiero-ledger/unknown-repo"
  });

  assert.equal(loaded.repoProfile, "default.yml");
  assert.equal(loaded.config.assignment.mode, "dry-run");
});

test("minimal yaml parser handles nested maps and arrays used by configs", () => {
  const parsed = parseSimpleYaml([
    "assignment:",
    "  enabled: true",
    "  mode: dry-run",
    "  allowed_labels:",
    "    - \"good first issue\"",
    "    - \"skill: beginner\"",
    "  progression:",
    "    enabled: false"
  ].join("\n"));

  assert.deepEqual(parsed, {
    assignment: {
      enabled: true,
      mode: "dry-run",
      allowed_labels: ["good first issue", "skill: beginner"],
      progression: {
        enabled: false
      }
    }
  });
});
