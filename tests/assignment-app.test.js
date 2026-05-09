"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluateIssueCommentAssignment } = require("../src/app");
const { createMockCurrentStateClient } = require("../src/github/current-state");

const config = {
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
        "skill: beginner": { required_label: "good first issue", required_count: 2 },
        "skill: intermediate": { required_label: "skill: beginner", required_count: 1 }
      }
    },
    require_human_review_for: ["skill: intermediate"],
    post_assignment_hooks: {
      welcome_comment: true,
      mentor_assignment: false,
      ai_planner: false
    }
  }
};

function payload({ issueNumber = 10, login = "new-contributor", labels = ["good first issue"], assignees = [] } = {}) {
  return {
    name: "issue_comment.created",
    repository: { full_name: "hiero-ledger/hiero-sdk-python" },
    issue: {
      number: issueNumber,
      labels: labels.map((name) => ({ name })),
      assignees: assignees.map((assignee) => ({ login: assignee }))
    },
    comment: { body: "/assign" },
    sender: { login, type: "User" }
  };
}

test("app uses fresh issue state rather than stale webhook issue snapshot", async () => {
  const result = await evaluateIssueCommentAssignment({
    payload: payload({ issueNumber: 10, assignees: [] }),
    config,
    currentStateClient: createMockCurrentStateClient({
      issuesByKey: {
        "hiero-ledger/hiero-sdk-python#10": {
          labels: ["good first issue", "status: ready for dev"],
          assignees: ["already-assigned-user"]
        }
      },
      contributorsByLogin: {
        "new-contributor": {
          activeAssignments: 0,
          type: "User",
          isRestricted: false,
          completedByLabel: {}
        }
      }
    })
  });

  assert.equal(result.decision, "blocked");
  assert.equal(result.reason, "Issue already has an assignee.");
  assert.equal(result.fresh_state_used, true);
  assert.deepEqual(result.payload_issue_snapshot.assignees, []);
  assert.match(result.report, /Fresh state used: yes/);
});

test("app produces would_assign report when fresh state is eligible", async () => {
  const result = await evaluateIssueCommentAssignment({
    payload: payload({ issueNumber: 11 }),
    config,
    currentStateClient: createMockCurrentStateClient({
      issuesByKey: {
        "hiero-ledger/hiero-sdk-python#11": {
          labels: ["good first issue", "status: ready for dev"],
          assignees: []
        }
      },
      contributorsByLogin: {
        "new-contributor": {
          activeAssignments: 0,
          type: "User",
          isRestricted: false,
          completedByLabel: {}
        }
      }
    })
  });

  assert.equal(result.decision, "would_assign");
  assert.deepEqual(result.actions, ["add assignee", "post welcome comment"]);
  assert.match(result.report, /Decision: would_assign/);
});

test("app blocks higher difficulty issue when contributor lacks prerequisites", async () => {
  const result = await evaluateIssueCommentAssignment({
    payload: payload({ issueNumber: 12, labels: ["skill: beginner"] }),
    config,
    currentStateClient: createMockCurrentStateClient({
      issuesByKey: {
        "hiero-ledger/hiero-sdk-python#12": {
          labels: ["skill: beginner", "status: ready for dev"],
          assignees: []
        }
      },
      contributorsByLogin: {
        "new-contributor": {
          activeAssignments: 0,
          type: "User",
          isRestricted: false,
          completedByLabel: { "good first issue": 1 }
        }
      }
    })
  });

  assert.equal(result.decision, "blocked");
  assert.equal(result.audit.rule, "assignment.progression");
  assert.match(result.reason, /1\/2/);
});

test("app fails safely when current issue state cannot be fetched", async () => {
  const result = await evaluateIssueCommentAssignment({
    payload: payload({ issueNumber: 404 }),
    config,
    currentStateClient: createMockCurrentStateClient({
      issuesByKey: {},
      contributorsByLogin: {}
    })
  });

  assert.equal(result.decision, "blocked");
  assert.equal(result.fresh_state_used, false);
  assert.match(result.reason, /Could not fetch current issue state/);
});
