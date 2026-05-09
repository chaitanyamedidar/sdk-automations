"use strict";

function createAssignmentReport(decision) {
  const lines = [
    "### Hiero Workflow V2 Assignment Report",
    "",
    `- Mode: ${decision.mode}`,
    `- Decision: ${decision.decision}`,
    `- Reason: ${decision.reason}`,
    `- Source event: ${decision.source_event}`,
    `- Fresh state used: ${decision.fresh_state_used ? "yes" : "no"}`,
    `- Audit rule: ${decision.audit.rule}`
  ];

  if (decision.actions.length > 0) {
    lines.push("", "Planned actions:");
    decision.actions.forEach((action) => {
      lines.push(`- ${action}`);
    });
  }

  return lines.join("\n");
}

module.exports = {
  createAssignmentReport
};
