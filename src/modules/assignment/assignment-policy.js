"use strict";

const { createAuditEntry } = require("../../audit/audit-log");

const VALID_MODES = new Set(["dry-run", "comment-only", "write-enabled"]);

function evaluateAssignment({ repo, config, event, issue, contributor, freshStateUsed = false }) {
  const assignment = config.assignment;
  const base = {
    module: "assignment",
    mode: assignment && assignment.mode ? assignment.mode : "dry-run",
    source_event: event.name,
    fresh_state_used: freshStateUsed
  };

  const validationError = validateAssignmentConfig(assignment);
  if (validationError) {
    return withAudit({
      repo,
      event,
      contributor,
      result: {
        ...base,
        decision: "config_error",
        reason: validationError,
        actions: []
      },
      rule: "assignment.config"
    });
  }

  const command = getCommentCommand(event);
  if (command !== assignment.trigger) {
    return withAudit({
      repo,
      event,
      contributor,
      result: {
        ...base,
        decision: "ignored",
        reason: `Comment command '${command || ""}' does not match trigger '${assignment.trigger}'.`,
        actions: []
      },
      rule: "assignment.trigger"
    });
  }

  if (!assignment.enabled) {
    return withAudit({
      repo,
      event,
      contributor,
      result: {
        ...base,
        decision: "disabled",
        reason: "Assignment module is disabled for this repository.",
        actions: []
      },
      rule: "assignment.enabled"
    });
  }

  if (assignment.require_unassigned_issue && issue.assignees.length > 0) {
    return withAudit({
      repo,
      event,
      contributor,
      result: {
        ...base,
        decision: "blocked",
        reason: "Issue already has an assignee.",
        actions: []
      },
      rule: "assignment.require_unassigned_issue"
    });
  }

  const blockedLabel = firstMatchingLabel(issue.labels, assignment.blocked_labels);
  if (blockedLabel) {
    return withAudit({
      repo,
      event,
      contributor,
      result: {
        ...base,
        decision: "blocked",
        reason: `Issue has blocked label '${blockedLabel}'.`,
        actions: []
      },
      rule: "assignment.blocked_labels"
    });
  }

  if (contributor.activeAssignments >= assignment.max_active_assignments) {
    return withAudit({
      repo,
      event,
      contributor,
      result: {
        ...base,
        decision: "blocked",
        reason: `Contributor has ${contributor.activeAssignments} active assignment(s), meeting or exceeding the limit of ${assignment.max_active_assignments}.`,
        actions: []
      },
      rule: "assignment.max_active_assignments"
    });
  }

  if (assignment.required_status_label && !hasLabel(issue.labels, assignment.required_status_label)) {
    return withAudit({
      repo,
      event,
      contributor,
      result: {
        ...base,
        decision: "blocked",
        reason: `Issue is missing required status label '${assignment.required_status_label}'.`,
        actions: []
      },
      rule: "assignment.required_status_label"
    });
  }

  const humanCheckReason = evaluateHumanCheck(assignment, issue, contributor);
  if (humanCheckReason) {
    return withAudit({
      repo,
      event,
      contributor,
      result: {
        ...base,
        decision: "blocked",
        reason: humanCheckReason,
        actions: []
      },
      rule: "assignment.human_check"
    });
  }

  const progressionReason = evaluateProgression(assignment, issue, contributor);
  if (progressionReason) {
    return withAudit({
      repo,
      event,
      contributor,
      result: {
        ...base,
        decision: "blocked",
        reason: progressionReason,
        actions: []
      },
      rule: "assignment.progression"
    });
  }

  const reviewLabel = firstMatchingLabel(issue.labels, assignment.require_human_review_for);
  if (reviewLabel) {
    return withAudit({
      repo,
      event,
      contributor,
      result: {
        ...base,
        decision: "needs_maintainer",
        reason: `Issue label '${reviewLabel}' requires maintainer review before assignment.`,
        actions: ["post maintainer review request"]
      },
      rule: "assignment.require_human_review_for"
    });
  }

  const allowedLabel = firstMatchingLabel(issue.labels, assignment.allowed_labels);
  if (!allowedLabel) {
    return withAudit({
      repo,
      event,
      contributor,
      result: {
        ...base,
        decision: "blocked",
        reason: "Issue does not have an allowed assignment label.",
        actions: []
      },
      rule: "assignment.allowed_labels"
    });
  }

  return withAudit({
    repo,
    event,
    contributor,
    result: {
      ...base,
      decision: assignment.mode === "write-enabled" ? "assign" : "would_assign",
      reason: "Issue is unassigned, has an allowed label, and contributor is below the active assignment limit.",
      actions: plannedActions(assignment)
    },
    rule: "assignment.eligible"
  });
}

function validateAssignmentConfig(assignment) {
  if (!assignment) {
    return "Missing assignment config.";
  }

  if (!VALID_MODES.has(assignment.mode)) {
    return `Invalid assignment mode '${assignment.mode}'.`;
  }

  if (typeof assignment.trigger !== "string" || assignment.trigger.length === 0) {
    return "Missing assignment trigger.";
  }

  if (!Array.isArray(assignment.allowed_labels) || assignment.allowed_labels.length === 0) {
    return "assignment.allowed_labels must contain at least one label.";
  }

  if (!Array.isArray(assignment.blocked_labels)) {
    return "assignment.blocked_labels must be an array.";
  }

  if (!Number.isInteger(assignment.max_active_assignments) || assignment.max_active_assignments < 1) {
    return "assignment.max_active_assignments must be a positive integer.";
  }

  if (
    assignment.required_status_label !== null &&
    assignment.required_status_label !== undefined &&
    typeof assignment.required_status_label !== "string"
  ) {
    return "assignment.required_status_label must be a string or null.";
  }

  return null;
}

function getCommentCommand(event) {
  const body = event.comment && typeof event.comment.body === "string" ? event.comment.body.trim() : "";
  return body.split(/\s+/)[0] || "";
}

function firstMatchingLabel(issueLabels, configuredLabels) {
  if (!Array.isArray(configuredLabels)) return null;
  const normalizedIssueLabels = new Set(issueLabels.map(normalizeLabel));
  return configuredLabels.find((label) => normalizedIssueLabels.has(normalizeLabel(label))) || null;
}

function hasLabel(issueLabels, label) {
  return Boolean(firstMatchingLabel(issueLabels, [label]));
}

function evaluateHumanCheck(assignment, issue, contributor) {
  const humanCheck = assignment.human_check;
  if (!humanCheck || !humanCheck.enabled) return null;

  if (contributor.type === "Bot") {
    return "Contributor appears to be a bot account.";
  }

  if (contributor.isRestricted) {
    const allowed = humanCheck.restricted_allowed_labels || [];
    if (!firstMatchingLabel(issue.labels, allowed)) {
      return "Contributor is restricted to lower-risk issue labels.";
    }

    const restrictedLimit = humanCheck.restricted_max_active_assignments || 1;
    if (contributor.activeAssignments >= restrictedLimit) {
      return `Restricted contributor has ${contributor.activeAssignments} active assignment(s), meeting or exceeding the restricted limit of ${restrictedLimit}.`;
    }
  }

  return null;
}

function evaluateProgression(assignment, issue, contributor) {
  const progression = assignment.progression;
  if (!progression || !progression.enabled || !progression.prerequisites) return null;

  const skillLabel = getIssueSkillLabel(issue.labels, progression.skill_hierarchy || []);
  if (!skillLabel) return null;

  const rule = progression.prerequisites[skillLabel];
  if (!rule || !rule.required_label || !rule.required_count) return null;

  const completedByLabel = contributor.completedByLabel || {};
  const labelsToCheck = [rule.required_label, ...(rule.aliases || [])].filter(Boolean);
  const completedCount = labelsToCheck.reduce((sum, label) => sum + (completedByLabel[label] || 0), 0);

  if (completedCount < rule.required_count) {
    return `Contributor has completed ${completedCount}/${rule.required_count} required '${rule.required_label}' issue(s) before '${skillLabel}'.`;
  }

  return null;
}

function getIssueSkillLabel(issueLabels, skillHierarchy) {
  for (let i = skillHierarchy.length - 1; i >= 0; i -= 1) {
    if (hasLabel(issueLabels, skillHierarchy[i])) return skillHierarchy[i];
  }
  return null;
}

function normalizeLabel(label) {
  return String(label).trim().toLowerCase();
}

function plannedActions(assignment) {
  const actions = ["add assignee"];

  if (assignment.post_assignment_hooks && assignment.post_assignment_hooks.welcome_comment) {
    actions.push("post welcome comment");
  }

  if (assignment.post_assignment_hooks && assignment.post_assignment_hooks.mentor_assignment) {
    actions.push("trigger mentor assignment hook");
  }

  if (assignment.post_assignment_hooks && assignment.post_assignment_hooks.ai_planner) {
    actions.push("trigger advisory issue planner");
  }

  return actions;
}

function withAudit({ repo, event, contributor, result, rule }) {
  return {
    ...result,
    audit: createAuditEntry({
      repo,
      eventName: event.name,
      moduleName: result.module,
      actor: contributor.login,
      decision: result.decision,
      reason: result.reason,
      mode: result.mode,
      rule
    })
  };
}

module.exports = {
  evaluateAssignment,
  validateAssignmentConfig
};
