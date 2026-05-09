"use strict";

function normalizeIssueCommentEvent(payload) {
  if (!payload || payload.name !== "issue_comment.created") {
    return {
      supported: false,
      reason: "Only issue_comment.created events are supported by the prototype."
    };
  }

  const repo = payload.repository && payload.repository.full_name;
  const issue = payload.issue || {};
  const sender = payload.sender || {};
  const comment = payload.comment || {};

  if (!repo || !issue.number || !sender.login) {
    return {
      supported: false,
      reason: "Event is missing repository, issue number, or sender login."
    };
  }

  return {
    supported: true,
    event: {
      name: payload.name,
      repo,
      issueNumber: issue.number,
      commentBody: typeof comment.body === "string" ? comment.body : "",
      actor: {
        login: sender.login,
        type: sender.type || "User"
      },
      payloadIssueSnapshot: {
        labels: normalizeLabels(issue.labels || []),
        assignees: normalizeAssignees(issue.assignees || [])
      }
    }
  };
}

function normalizeLabels(labels) {
  return labels.map((label) => (typeof label === "string" ? label : label.name)).filter(Boolean);
}

function normalizeAssignees(assignees) {
  return assignees.map((assignee) => (typeof assignee === "string" ? assignee : assignee.login)).filter(Boolean);
}

module.exports = {
  normalizeIssueCommentEvent
};
