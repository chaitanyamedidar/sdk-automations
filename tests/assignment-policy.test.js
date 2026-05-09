"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluateAssignment } = require("../src/modules/assignment/assignment-policy");

const baseConfig = {
  assignment: {
    enabled: true,
    mode: "dry-run",
    trigger: "/assign",
    required_status_label: "status: ready for dev",
    allowed_labels: ["good first issue", "skill: beginner", "skill: intermediate"],
    blocked_labels: ["status: blocked", "status: in progress"],
    max_active_assignments: 1,
    require_unassigned_issue: true,
    human_check: {
      enabled: true,
      restricted_allowed_labels: ["good first issue"],
      restricted_max_active_assignments: 1
    },
    progression: {
      enabled: true,
      skill_hierarchy: ["good first issue", "skill: beginner", "skill: intermediate"],
      prerequisites: {
        "good first issue": { required_label: null, required_count: 0 },
        "skill: beginner": {
          required_label: "good first issue",
          required_count: 2
        },
        "skill: intermediate": {
          required_label: "skill: beginner",
          required_count: 1
        }
      }
    },
    require_human_review_for: ["skill: intermediate"],
    post_assignment_hooks: {
      welcome_comment: true,
      mentor_assignment: true,
      ai_planner: false
    }
  }
};

const baseEvent = {
  name: "issue_comment.created",
  comment: { body: "/assign" }
};

const baseIssue = {
  labels: ["good first issue", "status: ready for dev"],
  assignees: []
};

const baseContributor = {
  login: "new-contributor",
  activeAssignments: 0,
  type: "User",
  isRestricted: false,
  completedByLabel: {}
};

test("eligible contributor produces dry-run would_assign decision", () => {
  const result = evaluateAssignment({
    repo: "hiero-ledger/hiero-sdk-python",
    config: baseConfig,
    event: baseEvent,
    issue: baseIssue,
    contributor: baseContributor
  });

  assert.equal(result.decision, "would_assign");
  assert.equal(result.mode, "dry-run");
  assert.match(result.reason, /Issue is unassigned/);
  assert.deepEqual(result.actions, [
    "add assignee",
    "post welcome comment",
    "trigger mentor assignment hook"
  ]);
  assert.equal(result.audit.rule, "assignment.eligible");
  assert.equal(result.source_event, "issue_comment.created");
});

test("already assigned issue blocks assignment", () => {
  const result = evaluateAssignment({
    repo: "hiero-ledger/hiero-sdk-python",
    config: baseConfig,
    event: baseEvent,
    issue: { labels: ["good first issue", "status: ready for dev"], assignees: ["someone"] },
    contributor: baseContributor
  });

  assert.equal(result.decision, "blocked");
  assert.equal(result.reason, "Issue already has an assignee.");
  assert.equal(result.audit.rule, "assignment.require_unassigned_issue");
});

test("missing allowed label blocks assignment", () => {
  const result = evaluateAssignment({
    repo: "hiero-ledger/hiero-sdk-python",
    config: baseConfig,
    event: baseEvent,
    issue: { labels: ["kind: docs", "status: ready for dev"], assignees: [] },
    contributor: baseContributor
  });

  assert.equal(result.decision, "blocked");
  assert.equal(result.reason, "Issue does not have an allowed assignment label.");
});

test("blocked label blocks assignment", () => {
  const result = evaluateAssignment({
    repo: "hiero-ledger/hiero-sdk-python",
    config: baseConfig,
    event: baseEvent,
    issue: { labels: ["good first issue", "status: blocked", "status: ready for dev"], assignees: [] },
    contributor: baseContributor
  });

  assert.equal(result.decision, "blocked");
  assert.equal(result.reason, "Issue has blocked label 'status: blocked'.");
});

test("active assignment limit blocks assignment", () => {
  const result = evaluateAssignment({
    repo: "hiero-ledger/hiero-sdk-python",
    config: baseConfig,
    event: baseEvent,
    issue: baseIssue,
    contributor: { ...baseContributor, login: "busy-contributor", activeAssignments: 1 }
  });

  assert.equal(result.decision, "blocked");
  assert.match(result.reason, /active assignment/);
});

test("human-review labels produce needs_maintainer decision after prerequisites pass", () => {
  const result = evaluateAssignment({
    repo: "hiero-ledger/hiero-sdk-python",
    config: baseConfig,
    event: baseEvent,
    issue: { labels: ["skill: intermediate", "status: ready for dev"], assignees: [] },
    contributor: {
      ...baseContributor,
      completedByLabel: { "skill: beginner": 1 }
    }
  });

  assert.equal(result.decision, "needs_maintainer");
  assert.deepEqual(result.actions, ["post maintainer review request"]);
});

test("missing ready status label blocks assignment", () => {
  const result = evaluateAssignment({
    repo: "hiero-ledger/hiero-sdk-python",
    config: baseConfig,
    event: baseEvent,
    issue: { labels: ["good first issue"], assignees: [] },
    contributor: baseContributor
  });

  assert.equal(result.decision, "blocked");
  assert.equal(result.audit.rule, "assignment.required_status_label");
});

test("bot account is blocked by human check", () => {
  const result = evaluateAssignment({
    repo: "hiero-ledger/hiero-sdk-python",
    config: baseConfig,
    event: baseEvent,
    issue: baseIssue,
    contributor: { ...baseContributor, type: "Bot" }
  });

  assert.equal(result.decision, "blocked");
  assert.equal(result.audit.rule, "assignment.human_check");
});

test("restricted contributor is blocked from higher-risk labels", () => {
  const result = evaluateAssignment({
    repo: "hiero-ledger/hiero-sdk-python",
    config: baseConfig,
    event: baseEvent,
    issue: { labels: ["skill: beginner", "status: ready for dev"], assignees: [] },
    contributor: {
      ...baseContributor,
      isRestricted: true,
      completedByLabel: { "good first issue": 2 }
    }
  });

  assert.equal(result.decision, "blocked");
  assert.equal(result.audit.rule, "assignment.human_check");
});

test("beginner issue requires configured prerequisite completions", () => {
  const result = evaluateAssignment({
    repo: "hiero-ledger/hiero-sdk-python",
    config: baseConfig,
    event: baseEvent,
    issue: { labels: ["skill: beginner", "status: ready for dev"], assignees: [] },
    contributor: {
      ...baseContributor,
      completedByLabel: { "good first issue": 1 }
    }
  });

  assert.equal(result.decision, "blocked");
  assert.equal(result.audit.rule, "assignment.progression");
  assert.match(result.reason, /1\/2/);
});

test("unknown slash command is ignored", () => {
  const result = evaluateAssignment({
    repo: "hiero-ledger/hiero-sdk-python",
    config: baseConfig,
    event: { name: "issue_comment.created", comment: { body: "/unassign" } },
    issue: baseIssue,
    contributor: baseContributor
  });

  assert.equal(result.decision, "ignored");
  assert.equal(result.audit.rule, "assignment.trigger");
});

test("invalid config fails safely", () => {
  const result = evaluateAssignment({
    repo: "hiero-ledger/hiero-sdk-python",
    config: {
      assignment: {
        ...baseConfig.assignment,
        mode: "dangerous"
      }
    },
    event: baseEvent,
    issue: baseIssue,
    contributor: baseContributor
  });

  assert.equal(result.decision, "config_error");
  assert.match(result.reason, /Invalid assignment mode/);
  assert.deepEqual(result.actions, []);
});
