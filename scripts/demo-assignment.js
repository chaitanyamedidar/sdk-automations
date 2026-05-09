"use strict";

const { evaluateIssueCommentAssignment } = require("../src/app");
const { loadRepositoryConfig } = require("../src/config/loader");
const { createMockCurrentStateClient } = require("../src/github/current-state");

const payload = {
  name: "issue_comment.created",
  repository: { full_name: "hiero-ledger/hiero-sdk-python" },
  issue: {
    number: 101,
    labels: [{ name: "Good First Issue" }],
    assignees: []
  },
  comment: { body: "/assign" },
  sender: { login: "new-contributor", type: "User" }
};

async function main() {
  const { config, repoProfile } = loadRepositoryConfig({
    repo: payload.repository.full_name
  });

  const currentStateClient = createMockCurrentStateClient({
    issuesByKey: {
      "hiero-ledger/hiero-sdk-python#101": {
        labels: ["Good First Issue"],
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
  });

  const result = await evaluateIssueCommentAssignment({
    payload,
    config,
    currentStateClient
  });

  console.log(`Loaded config profile: ${repoProfile}`);
  console.log(result.report);
  console.log("\nStructured decision:");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
