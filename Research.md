# Research Notes - Hiero GitHub Workflow App

## 2. Sources Reviewed

| Source | What Was Reviewed | Importance |
|---|---|---|
| `hiero-sdk-python` workflows | Assignment bots, review-sync, triage review, inactivity, planner hooks, CI workflows | Python has broad real-world workflow coverage |
| `hiero-sdk-cpp` workflows | Comment dispatcher, helper modules, bot tests, workflow linting, post-merge automation | C++ has cleaner workflow structure |
| `hiero-ledger` org workflow inventory | Workflow files across selected repositories | Shows scaling targets and repository tiers |
| Python workflow PRs and issues | `#2229`, `#2242`, `#2254`, `#2262`, `#2247`, `#2261`, `#2250`, `#2197` | Current community direction |

## Target Repo Deep Survey: Python SDK
Note: Some of the sections are based on research done on 3rd May.

Active workflows surveyed: **35**, excluding archived workflows.

| Workflow | Events Detected | Category | Concurrency |
|---|---|---|---|
| bot-advanced-check.yml | issues, workflow_dispatch, label | assignment-onboarding, security | True |
| bot-assignment-check.yml | issues, label | assignment-onboarding, security | False |
| bot-beginner-assign-on-comment.yml | issue_comment, issues, pull_request | assignment-onboarding, security | True |
| bot-coderabbit-plan-trigger.yml | issues, label | pr-review-quality, security | True |
| bot-gfi-assign-on-comment.yml | issue_comment, issues, pull_request | assignment-onboarding, security | True |
| bot-gfi-candidate-notification.yaml | issues, label | assignment-onboarding, security | True |
| bot-inactivity-unassign.yml | issues, schedule, workflow_dispatch | assignment-onboarding, stale-inactivity, security | False |
| bot-intermediate-assignment.yml | issues, workflow_dispatch, label | assignment-onboarding, security | True |
| bot-p0-issues-notify-team.yml | issues, label | security | False |
| clusterfuzzlite.yml | pull_request, push | ci-test-quality, security | True |
| cron-admin-update-spam-list.yml | issues, schedule, workflow_dispatch | assignment-onboarding, stale-inactivity, security | False |
| cron-calls-community.yml | issues, schedule, workflow_dispatch | assignment-onboarding, stale-inactivity, ci-test-quality, security | True |
| cron-calls-office-hours.yml | schedule, workflow_dispatch | assignment-onboarding, stale-inactivity, security | True |
| cron-enforcer-pr-linked-issue.yml | issues, schedule, workflow_dispatch | assignment-onboarding, pr-review-quality, stale-inactivity, security | False |
| cron-pr-check-broken-links.yml | issues, schedule, workflow_dispatch, label | assignment-onboarding, pr-review-quality, stale-inactivity, security | True |
| cron-reminder-issue-no-pr.yml | issues, schedule, workflow_dispatch | assignment-onboarding, stale-inactivity, ci-test-quality, security | False |
| cron-reminder-pr-inactive.yml | issues, schedule, workflow_dispatch | assignment-onboarding, stale-inactivity, security | False |
| pr-check-feedback-all.yml | issues, workflow_dispatch, workflow_run | assignment-onboarding, pr-review-quality, ci-test-quality, security | True |
| pr-check-primary-broken-links.yml | pull_request, push | ci-test-quality, security | True |
| pr-check-primary-codecov.yml | pull_request, push | ci-test-quality, security | False |
| pr-check-primary-codeql.yml | pull_request, push, schedule | stale-inactivity, ci-test-quality, security | False |
| pr-check-primary-test-files.yml | pull_request, push | pr-review-quality, ci-test-quality, security | True |
| pr-check-secondary-deps-test.yml | pull_request, push, workflow_dispatch | ci-test-quality, security | False |
| pr-check-secondary-examples.yml | pull_request, push, workflow_dispatch | ci-test-quality, security | False |
| pr-check-secondary-tck-test.yml | pull_request, push, workflow_dispatch | ci-test-quality, security | True |
| pr-check-secondary-unit-integration-test.yml | pull_request, push, workflow_dispatch | ci-test-quality, security | True |
| pre-commit.yml | pull_request, push | pr-review-quality, ci-test-quality, security | False |
| publish.yml | push | ci-test-quality, release, security | True |
| release-pr-coderabbit-gate.yml | pull_request | assignment-onboarding, pr-review-quality, ci-test-quality, release, security | True |
| request-triage-review.yml | issues, pull_request_target, pull_request, label | assignment-onboarding, pr-review-quality, security | True |
| review-sync.yml | issues, schedule, workflow_dispatch, label | assignment-onboarding, pr-review-quality, stale-inactivity, security | True |
| sync-issue-labels-add.yml | issues, workflow_run, label | ci-test-quality, security | True |
| sync-issue-labels-compute.yml | issues, pull_request, label | ci-test-quality, security | True |
| unassign-on-comment.yml | issue_comment, issues, pull_request | assignment-onboarding, security | True |
| working-on-comment.yml | issue_comment, issues, workflow_dispatch | assignment-onboarding, security | True |

### Insights

- Assignment/onboarding is broad but fragmented across GFI, beginner, intermediate, advanced, working-on, unassign, assignment limit, spam-list, and candidate notification workflows.
- bot-gfi-assign-on-comment.yml is still a key current system because it chains assignment, mentor assignment, and CodeRabbit planning.
- review-sync.yml is important new evidence. It is explicitly phase-based and currently label-sync only, with no comments, assignments, or routing. This aligns well with a safe V2 migration model.
- Several JavaScript test files exist under .github/scripts/review-sync/tests and .github/scripts/shared/labels.test.js, but the scan did not find a workflow executing those tests. This may be a valid CI hardening follow-up, but must be checked again before filing because the repo is changing quickly.
- Python's best V2 role is not to be copied as-is. It should provide workflow coverage and real user scenarios, while C++ should inform structure and safety patterns.

## Target Repo Deep Survey: C++ SDK

Active workflows surveyed: **12**.

| Workflow | Events Detected | Category | Concurrency |
|---|---|---|---|
| flow-pull-request-checks.yaml | pull_request, workflow_dispatch | ci-test-quality, security | True |
| on-comment.yaml | issue_comment, issues, pull_request, label | assignment-onboarding, pr-review-quality, security | True |
| on-pr-close.yaml | issues, pull_request_target, pull_request | assignment-onboarding, security | True |
| on-pr-review-labels.yaml | issues, workflow_run, label | pr-review-quality, security | False |
| on-pr-review.yaml | pull_request, pull_request_review | pr-review-quality, security | True |
| on-pr-update.yaml | pull_request_target, pull_request, label | assignment-onboarding, pr-review-quality, security | True |
| on-pr.yaml | pull_request_target, pull_request, label | assignment-onboarding, pr-review-quality, security | True |
| on-schedule-builds.yaml | schedule, workflow_dispatch | stale-inactivity, ci-test-quality | False |
| on-schedule-inactivity.yaml | issues, push, schedule, workflow_dispatch, label | assignment-onboarding, pr-review-quality, stale-inactivity, ci-test-quality, security | True |
| zxc-build-library.yaml | pull_request, workflow_dispatch | ci-test-quality, release, security | False |
| zxc-lint-workflows.yaml | pull_request, workflow_dispatch | ci-test-quality, security | True |
| zxc-test-bot-scripts.yaml | issues, pull_request, workflow_dispatch | assignment-onboarding, pr-review-quality, ci-test-quality, security | True |

### Insights

- on-comment.yaml is the strongest assignment baseline. It serializes per issue, checks out the default branch, and dispatches slash commands through bot-on-comment.js.
- Assignment logic is modularized under .github/scripts/commands/assign.js, with helpers under .github/scripts/helpers.
- zxc-test-bot-scripts.yaml is now a strong testing baseline. It runs helper and bot tests for assign, inactivity, PR open/update/review/merged/close, recommendation, and comments.
- zxc-lint-workflows.yaml adds actionlint, which is important for V2 because workflow syntax safety is part of maintainability.
- C++ should be treated as the structural reference for command dispatch, test strategy, helper boundaries, and workflow linting.

## Org-Wide Workflow Surface

| Repository | Workflow Count | Detected Categories |
|---|---:|---|
| [hiero-consensus-node](https://github.com/hiero-ledger/hiero-consensus-node) | 64 | ci-quality, release-publish, security, pr-quality-review, contributor-assignment, stale-inactivity |
| [hiero-sdk-python](https://github.com/hiero-ledger/hiero-sdk-python) | 35 | contributor-assignment, security, pr-quality-review, stale-inactivity, ci-quality, release-publish |
| [hiero-json-rpc-relay](https://github.com/hiero-ledger/hiero-json-rpc-relay) | 24 | pr-quality-review, ci-quality, release-publish, security, contributor-assignment, stale-inactivity |
| [solo](https://github.com/hiero-ledger/solo) | 24 | ci-quality, release-publish, security, pr-quality-review, contributor-assignment, stale-inactivity |
| [hiero-mirror-node](https://github.com/hiero-ledger/hiero-mirror-node) | 17 | pr-quality-review, stale-inactivity, ci-quality, release-publish, security |
| [hiero-sdk-js](https://github.com/hiero-ledger/hiero-sdk-js) | 14 | stale-inactivity, security, pr-quality-review, ci-quality, release-publish, contributor-assignment |
| [hiero-sdk-cpp](https://github.com/hiero-ledger/hiero-sdk-cpp) | 12 | pr-quality-review, ci-quality, security, contributor-assignment, stale-inactivity, release-publish |
| [hiero-block-node](https://github.com/hiero-ledger/hiero-block-node) | 10 | pr-quality-review, ci-quality, release-publish, security, contributor-assignment, stale-inactivity |
| [hiero-improvement-proposals](https://github.com/hiero-ledger/hiero-improvement-proposals) | 9 | contributor-assignment, pr-quality-review, security, ci-quality, release-publish, stale-inactivity |
| [hiero-sdk-tck](https://github.com/hiero-ledger/hiero-sdk-tck) | 8 | pr-quality-review, ci-quality, security, stale-inactivity, contributor-assignment |
| [heka-identity-platform](https://github.com/hiero-ledger/heka-identity-platform) | 7 | pr-quality-review, ci-quality, release-publish, security |
| [hiero-contracts](https://github.com/hiero-ledger/hiero-contracts) | 7 | pr-quality-review, ci-quality, release-publish, security, contributor-assignment |
| [hiero-cli](https://github.com/hiero-ledger/hiero-cli) | 6 | ci-quality, release-publish, pr-quality-review, security |
| [hiero-hederium](https://github.com/hiero-ledger/hiero-hederium) | 6 | contributor-assignment, ci-quality, release-publish, security, pr-quality-review |
| [hiero-mirror-node-explorer](https://github.com/hiero-ledger/hiero-mirror-node-explorer) | 6 | pr-quality-review, ci-quality, security, release-publish |
| [hiero-gradle-conventions](https://github.com/hiero-ledger/hiero-gradle-conventions) | 5 | pr-quality-review, ci-quality, release-publish, security |
| [hiero-local-node](https://github.com/hiero-ledger/hiero-local-node) | 5 | pr-quality-review, security, ci-quality, release-publish |
| [hiero-did-sdk-js](https://github.com/hiero-ledger/hiero-did-sdk-js) | 4 | ci-quality, release-publish, security, pr-quality-review |
| [hiero-did-sdk-python](https://github.com/hiero-ledger/hiero-did-sdk-python) | 4 | ci-quality, release-publish, security, pr-quality-review |
| [hiero-enterprise-java](https://github.com/hiero-ledger/hiero-enterprise-java) | 4 | pr-quality-review, stale-inactivity, ci-quality, release-publish, security, contributor-assignment |
| [hiero-sdk-java](https://github.com/hiero-ledger/hiero-sdk-java) | 4 | pr-quality-review, ci-quality, release-publish, security |
| [homebrew-tools](https://github.com/hiero-ledger/homebrew-tools) | 4 | pr-quality-review, ci-quality, release-publish, security, stale-inactivity |
| [governance](https://github.com/hiero-ledger/governance) | 3 | stale-inactivity, security, pr-quality-review |
| [hiero-sdk-rust](https://github.com/hiero-ledger/hiero-sdk-rust) | 3 | contributor-assignment, pr-quality-review, security, ci-quality, release-publish |
| [hiero-website](https://github.com/hiero-ledger/hiero-website) | 2 | pr-quality-review, ci-quality, security |
| [identity-collaboration-hub](https://github.com/hiero-ledger/identity-collaboration-hub) | 2 | pr-quality-review, ci-quality, release-publish, security |
| [.github](https://github.com/hiero-ledger/.github) | 1 | stale-inactivity, ci-quality, security |
| [hiero-consensus-specifications](https://github.com/hiero-ledger/hiero-consensus-specifications) | 1 | pr-quality-review, ci-quality |
| [hiero-sdk-go](https://github.com/hiero-ledger/hiero-sdk-go) | 1 | pr-quality-review, ci-quality, security |
| [hiero-sdk-swift](https://github.com/hiero-ledger/hiero-sdk-swift) | 1 | pr-quality-review, ci-quality, release-publish, security |
| [hiero-solo-action](https://github.com/hiero-ledger/hiero-solo-action) | 1 | pr-quality-review, ci-quality, release-publish, security |
| [solo-docs](https://github.com/hiero-ledger/solo-docs) | 1 | pr-quality-review, ci-quality, release-publish, security |
| [tsc](https://github.com/hiero-ledger/tsc) | 1 | pr-quality-review, security |


## 3. Main Research Conclusion

| Observation | Design Conclusion |
|---|---|
| Python SDK contains many workflow scenarios but they are spread across workflow files and scripts | Treat Python as the behavior catalogue |
| C++ SDK has cleaner command dispatch, helper structure, tests, and workflow linting | Treat C++ as the structural baseline |
| Recent Python work is moving toward phased workflow automation | V2 should use dry-run, read-only, comment-only, then limited write-enabled rollout |
| Permission failures and workflow syntax issues have occurred in recent work | V2 must include permission profiles, config validation, and workflow linting |
| Review queue automation is actively evolving | V2 should not duplicate blindly, but provide a migration path and reusable structure |

## 4. Python SDK Findings

| Workflow Area | Existing Pattern | V2 Migration Opportunity |
|---|---|---|
| Good First Issue assignment | `/assign` based assignment logic and eligibility checks | Reusable Assignment and Eligibility module |
| Beginner and higher difficulty assignment | label-driven progression and prerequisite expectations | Configurable difficulty policy |
| Assignment guard | separate checks to prevent unsafe assignment | Shared current-state and permission checks |
| Maintainer/planner hooks | assignment can trigger Maintainer or planning support | Optional onboarding hook |
| Review queue sync | label sync based on review state and permissions | Review Queue module with dry-run and report modes |
| Triage review request | workflow comments for review routing | PR Quality and Review Status module |
| Inactivity handling | reminders and unassignment flows | Inactivity Management module |
| Label centralization | shared label files introduced in recent work | Config schema and shared constants |
| CI and quality workflows | CodeQL, test, pre-commit, fuzzing, release, broken link checks | Keep as GitHub Actions execution layer |

## 5. C++ SDK Findings

| Workflow Area | Existing Pattern | V2 Migration Opportunity |
|---|---|---|
| Comment command handling | `on-comment.yaml` routes commands through a dispatcher | Model V2 command routing after this structure |
| Command modules | assignment, unassignment, finalize style commands are separated | Use one module per workflow behavior |
| Helper modules | shared helper functions reduce duplication | Move shared logic into `src/core` and module helpers |
| Bot tests | dedicated bot-script tests exist | Require tests for every V2 module |
| Workflow linting | actionlint workflow exists | Include actionlint in migration safety checks |
| PR lifecycle workflows | open, update, review, labels, close events handled separately | Map PR events into Review Queue and Post-Merge modules |
| Post-merge automation | status cleanup and milestone handling | Inform Post-Merge Recommendation module |


## 6. Migration Mapping

| Existing Workflow Behavior | V2 Module | Initial Mode |
|---|---|---|
| `/assign` comment handling | Assignment and Eligibility | dry-run |
| Contributor eligibility checks | Assignment Policy | dry-run |
| First-time contributor guidance | Contributor Onboarding | comment-only |
| Maintainer or planner trigger | Onboarding Hook or Planner Hook | optional comment-only |
| Review queue label sync | Review Queue | dry-run to comment-only |
| PR review status report | PR Quality Summary | read-only |
| Inactivity reminders | Inactivity Management | comment-only |
| Unassignment after inactivity | Inactivity Management | limited write-enabled |
| Post-merge cleanup | Post-Merge Module | dry-run to write-enabled |
| Next issue recommendation | Post-Merge Recommendation | advisory |
| Contributor progression evidence | Progression Evidence | advisory |

## 7. Edge Cases Found Or Inferred

| Edge Case | Importance | V2 Handling |
|---|---|---|
| Stale webhook payload | A queued workflow may act on old issue state | Refetch current issue or PR before final write |
| Permission mismatch | Recent review-sync work needed permission correction | Declare module permission profiles |
| Fork PR token restriction | Fork-origin PR workflows often have restricted tokens | Prefer read-only, scheduled, or base-branch-safe reporting paths |
| Label syntax with colon | `skill: beginner` can break careless workflow expressions | Validate config and lint workflows |
| Duplicate comments | Bot comments can become noisy | Use one marked updatable comment |
| CI failure after approval | PR may need demotion or blocked status | PR Quality module reads check runs |
| Bot-authored PRs | Bot PRs may still need community review | Make bot PR policy configurable |
| Rate limits | Cron or cross-repo scans can hit API limits | Rate-limit guard and clear failure modes |
| No linked issue | Review and recommendation logic may lack context | Report missing link and ask maintainer |
| Inactive assignment | Issues can remain blocked by stale assignment | Reminder, grace period, then configurable unassignment |
| AI overreach | AI could bias assignment or progression | AI is advisory only and cannot authorize writes |

## 8. Repository Adoption Tiers

| Tier | Repositories | Research Rationale |
|---|---|---|
| Tier 1 | `hiero-sdk-python`, `hiero-sdk-cpp` | Primary sources for workflow behavior and structure |
| Tier 2 | `hiero-sdk-js`, `hiero-sdk-swift`, `hiero-sdk-rust`, `hiero-sdk-go`, `hiero-cli`, `hiero-website` | Likely benefit from contributor workflow reports before writes |
| Tier 3 | `hiero-consensus-node`, `hiero-block-node`, `hiero-json-rpc-relay`, `hiero-mirror-node`, `solo` | CI-heavy repositories need read-only summaries and careful permissions |
| Tier 4 | docs, governance, collaboration repos | Lower-risk candidates for triage and stale reminders |

