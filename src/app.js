"use strict";

const { evaluateAssignment } = require("./modules/assignment/assignment-policy");
const { normalizeIssueCommentEvent } = require("./events/normalize");
const { createAssignmentReport } = require("./output/assignment-report");

async function evaluateIssueCommentAssignment({ payload, config, currentStateClient }) {
  const normalized = normalizeIssueCommentEvent(payload);
  if (!normalized.supported) {
    return {
      decision: "ignored",
      reason: normalized.reason,
      report: normalized.reason
    };
  }

  const event = normalized.event;
  let freshIssue;

  try {
    freshIssue = await currentStateClient.getIssue({
      repo: event.repo,
      issueNumber: event.issueNumber
    });
  } catch (error) {
    return {
      module: "assignment",
      mode: config.assignment && config.assignment.mode ? config.assignment.mode : "dry-run",
      source_event: payload.name,
      fresh_state_used: false,
      decision: "blocked",
      reason: `Could not fetch current issue state: ${error.message}`,
      actions: [],
      report: `Could not fetch current issue state: ${error.message}`
    };
  }

  const contributor = await currentStateClient.getContributor({
    login: event.actor.login
  });

  const decision = evaluateAssignment({
    repo: event.repo,
    config,
    event: {
      name: payload.name,
      comment: { body: event.commentBody }
    },
    issue: freshIssue,
    contributor: {
      ...contributor,
      type: event.actor.type || contributor.type
    },
    freshStateUsed: true
  });

  return {
    ...decision,
    payload_issue_snapshot: event.payloadIssueSnapshot,
    report: createAssignmentReport(decision)
  };
}

module.exports = {
  evaluateIssueCommentAssignment
};
