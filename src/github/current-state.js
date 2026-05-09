"use strict";

function createMockCurrentStateClient({ issuesByKey, contributorsByLogin }) {
  return {
    async getIssue({ repo, issueNumber }) {
      const key = `${repo}#${issueNumber}`;
      const issue = issuesByKey[key];
      if (!issue) {
        throw new Error(`No mocked current issue state for ${key}.`);
      }

      return {
        labels: [...issue.labels],
        assignees: [...issue.assignees]
      };
    },

    async getContributor({ login }) {
      const contributor = contributorsByLogin[login];
      if (!contributor) {
        return {
          login,
          activeAssignments: 0,
          type: "User",
          isRestricted: false,
          completedByLabel: {}
        };
      }

      return {
        login,
        activeAssignments: contributor.activeAssignments || 0,
        type: contributor.type || "User",
        isRestricted: Boolean(contributor.isRestricted),
        completedByLabel: contributor.completedByLabel || {}
      };
    }
  };
}

module.exports = {
  createMockCurrentStateClient
};
