"use strict";

function createAuditEntry({ repo, eventName, moduleName, actor, decision, reason, mode, rule }) {
  return {
    timestamp: new Date().toISOString(),
    repo,
    event: eventName,
    module: moduleName,
    actor,
    decision,
    reason,
    mode,
    rule
  };
}

module.exports = {
  createAuditEntry
};
