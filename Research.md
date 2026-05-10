# Research Notes - Hiero GitHub Workflow App

## 1. Research Goal

I did a research to understand how Hiero currently handles contributor and maintainer workflows before proposing a reusable GitHub Workflow App. The project should not start by inventing new features. It should first understand the existing Python and C++ SDK workflows, preserve useful behavior, and evolve that behavior into a safer, more reusable, more configurable system.

## 2. Sources Reviewed

| Source | What Was Reviewed | Importance |
|---|---|---|
| `hiero-sdk-python` workflows | Assignment bots, review-sync, triage review, inactivity, planner hooks, CI workflows | Python has broad real-world workflow coverage |
| `hiero-sdk-cpp` workflows | Comment dispatcher, helper modules, bot tests, workflow linting, post-merge automation | C++ has cleaner workflow structure |
| `hiero-ledger` org workflow inventory | Workflow files across selected repositories | Shows scaling targets and repository tiers |
| Python workflow PRs and issues | `#2229`, `#2242`, `#2254`, `#2262`, `#2247`, `#2261`, `#2250`, `#2197` | Shows current community direction |
| Maintainer Discord guidance | Start small, abstract existing SDK workflows, use GitHub Actions for execution and GitHub App for orchestration/policy | Defines proposal constraints |

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

