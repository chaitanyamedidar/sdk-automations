
# Hiero Workflow V2 Migration Prototype

This prototype demonstrates a low-risk migration path from existing Hiero SDK automation toward a reusable V2 maintainer and contributor workflow system.

It starts with one workflow pattern: issue assignment through `/assign`.

The goal is not to replace current Python or C++ SDK workflows immediately. Instead, this prototype runs assignment decision logic in dry-run mode, using repository-specific config and structured audit output, so maintainers can compare V2 decisions against existing automation before enabling write actions.

This local prototype is dependency-free CommonJS so it can run with only Node's built-in test runner. The production implementation target remains a TypeScript GitHub App using the same boundaries: config, events, modules, safety, audit, and outputs.


| Claim | Prototype Evidence |
|---|---|
| Existing SDK automation can be migrated incrementally | The prototype starts with only assignment and keeps all behavior dry-run by default. |
| Repository-specific behavior can be configured | Python, C++, and default configs live under `configs/`. |
| Workflow decisions can be auditable | Every result includes event, actor, rule, mode, decision, and reason. |
| Stale webhook payloads can be handled safely | The app fetches mocked current issue state before the final assignment decision. |
| The same module can support different repositories | Assignment policy is shared while labels, limits, hooks, and modes come from config. |
| Write-enabled behavior can be deferred | No GitHub writes exist in this prototype. |

## Current Prototype Scope

Implemented:

- Repository config loading from `configs/*.yml`.
- GitHub App style event normalization for `issue_comment.created`.
- Mocked current-state fetching before assignment decisions.
- Dry-run assignment eligibility policy.
- Maintainer-readable assignment report generation.
- Structured audit log generation.
- Tests for core edge cases, including stale webhook payload handling.
- Documentation for migration, security, onboarding, and contributor workflow.

Yet to be implemented:

- Real GitHub App webhook server.
- Real GitHub API writes.
- Discord or Slack notifications.
- AI planning or review assistance.
- Dashboards.

Those can be added later as modules once the migration foundation is trusted.

## Architecture Direction

```text
GitHub event
  -> GitHub App orchestration layer
  -> normalize event
  -> load repo config
  -> fetch current GitHub state
  -> run workflow module in dry-run/comment/write mode
  -> emit audit log and maintainer-facing report
  -> optionally dispatch GitHub Actions for repo-local execution
```

GitHub Actions should continue to run repository-local checks such as tests, builds, DCO, GPG, CodeQL, actionlint, fuzzing, and documentation validation. The central layer should own policy, configuration, auditability, safety checks, and reusable orchestration.

## Repository Layout

```text
.hiero-workflows.example.yml
configs/
  default.yml
  hiero-sdk-cpp.yml
  hiero-sdk-python.yml
docs/
  contributor-guide.md
  maintainer-onboarding.md
  migration-plan.md
  prototype-scope.md
  security-trigger-matrix.md
  workflow-inventory.md
src/
  app.js
  audit/audit-log.js
  config/loader.js
  events/normalize.js
  fixtures/issue-comment-assign.json
  github/current-state.js
  modules/assignment/assignment-policy.js
  output/assignment-report.js
scripts/
  demo-assignment.js
tests/
  assignment-app.test.js
  assignment-policy.test.js
  config-loader.test.js
```

## Prototype Flow

| Step | Component | What Happens |
|---|---|---|
| 1 | Event normalizer | Accepts a mocked `issue_comment.created` payload and extracts repo, issue, actor, and command. |
| 2 | Config loader | Loads the repository profile, such as `hiero-sdk-python.yml`, or falls back to `default.yml`. |
| 3 | Current-state client | Fetches mocked current issue labels and assignees instead of trusting the original webhook snapshot. |
| 4 | Assignment module | Evaluates trigger, labels, assignees, human check, active assignment limit, and progression prerequisites. |
| 5 | Output adapter | Produces a dry-run report or comment body without writing to GitHub. |
| 6 | Audit logger | Records event, actor, decision, reason, mode, and matched rule. |

## Run Tests

```bash
npm test
```

The tests use Node's built-in test runner and do not require dependency installation.

## Run Demo

```bash
npm run demo
```

This prints one dry-run assignment decision and its audit entry.

## Example Dry-Run Decision

```json
{
  "module": "assignment",
  "mode": "dry-run",
  "source_event": "issue_comment.created",
  "fresh_state_used": true,
  "decision": "would_assign",
  "reason": "Issue is unassigned, has an allowed label, and contributor is below the active assignment limit.",
  "actions": [
    "add assignee",
    "post welcome comment",
    "trigger mentor assignment hook"
  ]
}
```

## Why was Assignment the first abstraction target?

Assignment is a good migration candidate because it is already present in the Python and C++ SDK automation systems, it affects contributor onboarding, and it has meaningful edge cases around labels, assignees, contributor state, current issue state, and maintainer trust.

The first version intentionally avoids GitHub writes. This lets maintainers validate whether the V2 policy matches expected behavior before any existing workflow is replaced.
