# Hiero GitHub Workflow App - Technical Design Document

Files: [`research.md`](./Research.md) , [`Prototype.md`](./README.md)
## 1. Core Idea

I am proposing a reusable GitHub workflow automation system for Hiero maintainers and contributors. My goal is to migrate the useful behavior already present in Python and C++ SDK automation into a safer, reusable, configurable V2 architecture.

I would use a hybrid model:

- GitHub App for orchestration, policy evaluation, repository configuration, audit logging, and reusable workflow modules.
- GitHub Actions for repo-local execution, CI checks, builds, test workflows, release workflows, and existing trusted automation paths.
- Repository-specific configuration for labels, contributor thresholds, review rules, permission profiles, output modes, and rollout mode.

I would start with an end-to-end contributor workflow:

```text
Contributor finds issue
-> contributor comments /assign
-> bot checks issue state, labels, eligibility, limits, and current assignment state
-> bot assigns, blocks, or produces maintainer-facing reason
-> onboarding message links docs and expectations
-> mentor or planning hook can run if configured
-> PR review queue and quality state are tracked
-> inactivity and stale assignment handling runs later
-> merged PR can trigger next issue recommendation and progression evidence
```

I am keeping the first scope intentionally small: I would start from the existing SDK workflows, reuse the stronger C++ structure where it fits, and avoid prioritizing new features before the current maintainer and contributor workflow system is understood and migrated safely.

Detailed workflow research and repository survey notes are kept separately in [`research.md`](./research.md).

## 2. Bottleneck

Hiero already has useful workflow automation, but the current system is spread across many repository-specific GitHub Actions, scripts, labels, and cron workflows. Python has broad coverage but more fragmentation. C++ has cleaner structure but narrower coverage. Other Hiero repositories vary widely in workflow count and maintenance needs.

This creates several problems:

- Maintainer logic is duplicated or encoded differently across repositories.
- Contributor onboarding rules are not always easy to inspect or configure.
- Write-enabled automation requires careful permission boundaries.
- Workflow behavior can diverge as repositories evolve.
- Testing and linting patterns are not yet consistent across all bot scripts.
- Scaling to many repositories without a shared policy layer risks repeating the same fragmentation.

## 3. Design Goals

| Goal | Technical Meaning |
|---|---|
| Preserve working behavior | Do not replace existing workflows until V2 decisions match expected behavior in dry-run mode. |
| Make policy explicit | Move labels, thresholds, teams, modes, and allowed actions into repository config. |
| Separate policy from execution | GitHub App decides and logs. GitHub Actions still run repo-local checks. |
| Default to safe rollout | Start with dry-run, then comment-only, then write-enabled per repository. |
| Keep AI advisory only | AI may summarize evidence but must not assign, promote, block, close, or merge. |
| Make decisions auditable | Every decision includes input state, rule matched, reason, planned action, and output mode. |
| Scale by module reuse | New repositories adopt modules through config, not custom scripts. |

## 4. Overall Architecture

The V2 system is a hybrid GitHub App plus GitHub Actions architecture.

<img width="2048" height="1143" alt="1" src="https://github.com/user-attachments/assets/918cfcd7-4340-4cec-bab2-8ebe5badde62" />



The diagram should communicate that V2 centralizes policy and auditability while preserving GitHub Actions as the repo-local execution layer.

```text
GitHub webhook event
-> GitHub App webhook receiver
-> event normalizer
-> repository config loader
-> policy router
-> module registry
-> module decision engine
-> permission guard
-> audit logger
-> output adapter
-> GitHub Actions execution or GitHub API write adapter
```

| Layer | Responsibility |
|---|---|
| GitHub Actions | builds |
| GitHub Actions | test suites |
| GitHub Actions | release workflows |
| GitHub Actions | CodeQL |
| GitHub Actions | fuzzing |
| GitHub Actions | actionlint |
| GitHub Actions | repo-specific check runs |
| GitHub App | cross-repo policy consistency |
| GitHub App | module routing |
| GitHub App | config loading |
| GitHub App | audit logging |
| GitHub App | dry-run and comment-only reporting |
| GitHub App | safe write authorization |
| GitHub App | future dashboard/reporting data |



## 6. Existing Workflow Migration 
<img width="2048" height="1143" alt="release workflows" src="https://github.com/user-attachments/assets/4a6c0c36-36d6-4f45-8e4f-b23ffe9caf47" />


V2 extracts and standardizes existing Hiero workflow behavior before introducing reusable modules.

## 7. Component Breakdown

### 7.1 Webhook Receiver

Receives GitHub events from installed repositories.

| Event Family | Used For |
|---|---|
| `issue_comment.created` | contributor commands such as `/assign` and `/unassign` |
| `issues.opened` | issue onboarding and initial policy checks |
| `issues.labeled` | difficulty, state, and workflow routing changes |
| `issues.assigned` | assignment state tracking |
| `pull_request.opened` | PR quality and review queue initialization |
| `pull_request.synchronize` | refreshed PR quality and stale review handling |
| `pull_request_review.submitted` | review queue and progression evidence updates |
| `workflow_run.completed` | CI result and PR quality summary |
| scheduled checks | inactivity, stale assignment, and periodic sync |

| Webhook Receiver Responsibility | Importance |
|---|---|
| verify webhook signature | prevents spoofed GitHub events |
| identify repository and installation | loads the correct repo-specific config |
| forward raw event to event normalizer | keeps event parsing separate from policy |
| avoid policy decisions directly | ensures decisions happen only inside modules |

### 7.2 Event Normalizer

Converts GitHub payloads into a stable internal event shape.

Example normalized event:

```json
{
  "repo": "hiero-sdk-python",
  "event": "issue_comment.created",
  "actor": "example-user",
  "target": {
    "type": "issue",
    "number": 123
  },
  "command": "/assign",
  "labels": ["Good First Issue"],
  "source": "github-webhook"
}
```

Importance:

- prevents each module from parsing raw GitHub payloads differently
- allows Python and C++ patterns to map into one module contract
- makes test fixtures easier to write

### 7.3 Repository Config Loader

Loads repository-specific config.

Candidate config file:

```yaml
version: 1

repository:
  profile: sdk-contributor-heavy
  mode: dry-run

labels:
  good_first_issue: "Good First Issue"
  beginner: "skill: beginner"
  intermediate: "skill: intermediate"
  advanced: "skill: advanced"
  in_progress: "status: in progress"
  ready_to_merge: "status: ready-to-merge"

assignment:
  enabled: true
  trigger: "/assign"
  max_open_assignments: 2
  require_fresh_issue_state: true
  difficulty_prerequisites:
    "skill: beginner":
      requires_completed:
        label: "Good First Issue"
        count: 1
    "skill: intermediate":
      requires_completed:
        label: "skill: beginner"
        count: 1

review_queue:
  enabled: true
  mode: dry-run
  labels:
    junior: "queue:junior-committer"
    committers: "queue:committers"
    maintainers: "queue:maintainers"
    ready: "status: ready-to-merge"

outputs:
  assignment: check-summary
  review_queue: updatable-comment
  audit: enabled
```

Config principles:

- no config means no write actions
- ambiguous config means do nothing
- every module has mode, permissions, and output declared
- label names are repo-specific, not hardcoded

### 7.4 Policy Router

Routes normalized events to enabled modules.

Example:

```text
issue_comment.created + command=/assign
-> Assignment and Eligibility Module

pull_request_review.submitted
-> Review Queue Module

schedule
-> Inactivity and Stale Module

pull_request.closed + merged=true
-> Post-Merge Recommendation Module
```

### 7.5 Module Registry

Defines the available modules and their requirements.

| Module | Inputs | Outputs | Write Permission Needed |
|---|---|---|---|
| Assignment and Eligibility | issue, actor, labels, config, current issue state | assign, block, request maintainer review | `issues: write` only in write-enabled mode |
| Contributor Onboarding | issue, actor, docs links, assignment result | welcome message, docs pointers | `issues: write` for comments |
| Review Queue | PR reviews, reviewer roles, queue config | queue label, report | `pull-requests: write`, `issues: write` if applying labels |
| PR Quality Summary | check runs, linked issue, labels, templates | check summary or report | usually read-only |
| Inactivity and Stale | assignment age, PR activity, issue state | reminder, unassign, close recommendation | write only after opt-in |
| Post-Merge Recommendation | merged PR, linked issue, contributor history | next issue suggestions | comment write if enabled |
| Progression Evidence | merged PRs, reviews, labels, role thresholds | maintainer-facing evidence card | read-only or comment-only |
| Advisory AI Summary | structured evidence only | short explanation | no write decisions |

### 7.6 Decision Engine

The Decision Engine is a V2 abstraction, not a single component that currently exists in the repositories. Today, decision logic is spread across workflow scripts: assignment checks, label checks, inactivity checks, review queue logic, and post-merge automation. In V2, I would centralize that scattered rule evaluation into a shared decision layer used by each module.

The Decision Engine does not perform GitHub writes and does not use AI for final decisions. Its job is to evaluate normalized inputs and return a clear, auditable decision.

| Input | Purpose |
|---|---|
| normalized event | tells the engine what happened, such as `/assign`, PR opened, review submitted, or schedule run |
| repository config | provides repo-specific labels, thresholds, enabled modules, modes, and permissions |
| current GitHub state | prevents decisions from relying only on stale webhook payloads |
| module policy | defines the rules for assignment, review queue, stale handling, or progression evidence |
| contributor or PR history | supports eligibility, recommendation, and progression evidence |

| Output | Example |
|---|---|
| decision | `would_assign`, `blocked_already_assigned`, `needs_maintainer_review`, `no_action` |
| reason | `issue already has an assignee in fresh GitHub state` |
| planned actions | `add_assignee`, `post_comment`, `emit_check_summary` |
| required permissions | `issues: write`, `pull-requests: read` |
| audit metadata | matched rule, actor, target, mode, timestamp |

Example decision:

```json
{
  "module": "assignment",
  "mode": "dry-run",
  "decision": "would_assign",
  "reason": "issue is open, unassigned, has allowed difficulty label, and contributor is below assignment limit",
  "planned_actions": ["add_assignee", "post_onboarding_comment"],
  "required_permissions": ["issues: write"],
  "fresh_state_used": true
}
```

### 7.7 Current-State Fetcher

Fetches fresh GitHub state before write decisions.

This preserves the C++ safety pattern:

- do not rely only on old webhook payloads
- refetch current issue or PR before final write
- fail closed when fresh state cannot be fetched
- revalidate labels and assignees before assignment

### 7.8 Permission Guard

Checks whether a module is allowed to perform a planned action.

Example guard:

```text
module = assignment
mode = dry-run
planned_action = add_assignee
decision = block write, emit dry-run report

module = review_queue
mode = write-enabled
planned_action = add queue label
required_permission = issues: write
decision = allow only if repo config enabled module and app installation has permission
```

### 7.9 Audit Logger

Every decision produces an audit record:

```json
{
  "timestamp": "2026-05-10T00:00:00Z",
  "repo": "hiero-sdk-python",
  "module": "assignment",
  "mode": "dry-run",
  "actor": "example-user",
  "target": "issue#123",
  "decision": "would_assign",
  "reason": "issue is open, unassigned, has Good First Issue label, actor below assignment limit",
  "planned_actions": ["add_assignee"],
  "permissions_required": ["issues: write"]
}
```

### 7.10 Output Adapters

Adapters convert module decisions into human-readable output.

Output options:

- workflow logs
- check summary
- updatable issue or PR comment
- audit artifact
- optional maintainer digest
- future dashboard

Important rule: output adapters should be separate from policy logic.

## 8. Proposed Application File Structure

The V2 application should make the architecture visible in the repository layout. The file structure should separate app infrastructure, shared policy logic, workflow modules, output adapters, config schema, tests, and documentation.

### File Structure Rationale

| Area | Why It Exists |
|---|---|
| `src/app` | Owns GitHub App startup, webhook receiving, and signature verification. |
| `src/core` | Contains reusable platform logic that every module depends on. |
| `src/modules` | Keeps assignment, onboarding, review queue, inactivity, and progression as independent modules. |
| `src/adapters` | Prevents policy modules from directly writing to GitHub. |
| `src/config` | Makes repository profiles and schema validation explicit. |
| `tests/fixtures` | Allows Python and C++ event behavior to be replayed without live GitHub writes. |
| `configs/examples` | Shows how different repositories opt into different modules and modes. |
| `docs` | Helps maintainers and contributors understand adoption, configuration, and module behavior. |

This structure supports both contributor-facing workflows, such as onboarding and assignment, and maintainer-facing workflows, such as review queue status, stale handling, and post-merge progression evidence.

## 9. Component Breakdown 

<img width="2048" height="1143" alt="2" src="https://github.com/user-attachments/assets/0a0b5bd2-bef8-4f1b-a1f4-d59f0ce9f304" />


Each component has a narrow responsibility and that write actions pass through a safety boundary.

## 10. End-To-End Working Application

The first working application should focus on assignment and contributor onboarding because it connects directly to the mentor’s stated needs and existing workflows.

### End-To-End Flow: Assignment And Onboarding

<img width="2048" height="1143" alt="3" src="https://github.com/user-attachments/assets/73f64eaf-d980-4cc2-b4ab-07072c48bccc" />


### Decision Outputs

| Decision | Example Reason | Output |
|---|---|---|
| `would_assign` | issue is open, unassigned, actor meets policy | dry-run check summary |
| `assigned` | write-enabled mode and all checks passed | add assignee, audit record |
| `blocked_already_assigned` | fresh issue state has existing assignee | comment or check summary |
| `blocked_prerequisite_missing` | beginner issue requires completed GFI | contributor guidance |
| `requires_maintainer_review` | high difficulty or unclear state | maintainer-facing report |
| `no_action` | config absent or module disabled | workflow log only |

## 11. End-To-End Flow 

<img width="2048" height="1143" alt="5" src="https://github.com/user-attachments/assets/cd9abbe8-a1c2-4021-930a-7bfbaadc36e0" />

The first deliverable is a safe, testable assignment workflow, not a broad replacement of every existing workflow.

## 12. Phased Implementation Plan

| Phase | Goal | Existing Sources | Deliverables | Success Criteria |
|---|---|---|---|---|
| Phase 0 - Workflow Survey And Behavior Mapping | Build a current workflow map before changing behavior | Python and C++ workflows, org workflow survey | workflow inventory, behavior map, permission matrix, migration candidate ranking | every V2 module maps to existing behavior and maintainers can see what is preserved, modified, deferred, or rejected |
| Phase 1 - Assignment And Eligibility Core | Migrate the most visible contributor workflow | Python `bot-gfi-assign-on-comment.yml`, `bot-beginner-assign-on-comment.yml`, `bot-assignment-check.yml`, `bot-intermediate-assignment.yml`; C++ `on-comment.yaml`, `bot-on-comment.js`, `commands/assign.js` | assignment module, eligibility policy, config schema, current-state fetch, dry-run report, unit tests | assignment behavior can be replayed safely against Python and C++ edge cases |
| Phase 2 - Contributor Onboarding Hooks | Connect assignment to contributor guidance | Python mentor assignment, CodeRabbit planner chain, `docs/sdk_developers`; C++ optional command pattern | onboarding module, docs link output, optional mentor hook, optional planner hook, updatable comment output | assigned or blocked contributors receive clear next steps without noisy repeated comments |
| Phase 3 - PR Review Queue And Quality Summary | Move from assignment to maintainer review visibility | Python `review-sync.yml`, `request-triage-review.yml`; C++ `on-pr.yaml`, `on-pr-update.yaml`, `on-pr-review.yaml`, `on-pr-review-labels.yaml` | review queue module, PR quality summary, queue state report, check summary or updatable comment, role-based tests | maintainers can see whether a PR is waiting on junior committer, committer, maintainer, author changes, or merge readiness |
| Phase 4 - Inactivity And Stale Management | Reduce stale assignment and PR backlog | Python inactivity unassign and reminder workflows; C++ `on-schedule-inactivity.yaml`, `bot-inactivity.js` | inactivity module, stale assignment policy, reminder model, escalation model, maintainer override model | stale work is surfaced first, then escalated or unassigned only through configured policy |
| Phase 5 - Post-Merge Recommendation And Progression Evidence | Support contributor growth without automatic promotion | C++ post-merge automation, C++ recommendation tests, Python recommendation scripts and archives, `hiero-hackers/analytics` themes | post-merge recommendation module, progression evidence card, next issue report, maintainer-facing eligibility evidence, advisory AI summary | contributors receive next-step suggestions and maintainers receive evidence, while final progression decisions remain human |


## 13. Scaling Model

I would not roll V2 out uniformly to every repository. Each repository should adopt modules based on workflow maturity and maintainer needs.

### Adoption Tiers

| Tier | Repositories | Initial V2 Mode | Recommended Modules |
|---|---|---|---|
| Tier 1 | `hiero-sdk-python`, `hiero-sdk-cpp` | dry-run, then comment-only, then limited write-enabled | assignment, review queue, inactivity, post-merge |
| Tier 2 | `hiero-sdk-js`, `hiero-sdk-swift`, `hiero-sdk-rust`, `hiero-sdk-go`, `hiero-cli`, `hiero-website` | dry-run and reporting first | assignment report, PR summary, stale report |
| Tier 3 | `hiero-consensus-node`, `hiero-block-node`, `hiero-json-rpc-relay`, `hiero-mirror-node`, `solo` | read-only reporting | CI health, PR quality summary, stale management report |
| Tier 4 | docs, governance, collaboration repos | read-only and comment-only | review status, issue triage, stale reminders |

### Scaling Controls

- Repository opt-in only.
- Module opt-in per repository.
- Default mode is dry-run.
- Write actions require explicit config and app permission.
- Every module declares required permissions.
- Every write action passes through permission guard.
- Every decision is logged.
- Maintainers can override by manual GitHub action.
- Existing workflows remain active until V2 proves equivalent or better.

## 14. Multi-Repository Scaling 

<img width="2048" height="1143" alt="4" src="https://github.com/user-attachments/assets/acf85340-a895-4cd1-aa0b-15e9d2a0c7f6" />


The architecture scales through configuration, not through duplicated workflow files.

## 15. Testing And CI Strategy

V2 should adopt the strongest current patterns from C++ and Python.

### Required Test Types

| Test Type | Purpose |
|---|---|
| Unit tests | Validate policy functions and helper modules. |
| Fixture replay tests | Replay GitHub event payloads from Python and C++ workflows. |
| Permission tests | Confirm module permissions match planned actions. |
| Mode tests | Ensure dry-run never writes and comment-only only comments. |
| Race tests | Validate fresh issue state before final write decisions. |
| Workflow linting | Use actionlint for GitHub Actions changes. |
| Integration smoke tests | Run selected modules against mocked Octokit API. |

### C++ Patterns To Preserve

- `zxc-test-bot-scripts.yaml` style bot-script test workflow.
- `zxc-lint-workflows.yaml` style actionlint workflow.
- Command handler map in `bot-on-comment.js`.
- Helper modules under `.github/scripts/helpers`.

### Python Patterns To Preserve

- Review queue Phase 1 safety model.
- Centralized labels.
- Rate-limit guard in review sync.
- Existing assignment and difficulty progression logic.
- Hardened runner and pinned action posture.

## 16. Security And Safety Model

### Safety Rules

1. No write action without explicit repository config.
2. No write action without permission guard approval.
3. No final decision from stale webhook state.
4. No AI-generated decision for assignment, promotion, blocking, closing, or merging.
5. Every action must have a logged reason.
6. Every automated result must be understandable by maintainers.
7. Existing workflows remain active until V2 is trusted.

### Permission Profiles

| Profile | Allowed Behavior |
|---|---|
| read-only | inspect events, labels, reviews, check runs, issue state |
| comment-only | post or update one marked report |
| label-write | apply configured labels only |
| assignment-write | assign or unassign users only when module enabled |
| maintainer-escalation | notify or request review from configured team |

## 17. What V2 Modifies From Existing Workflows

| Existing Pattern | Keep | Modify For V2 |
|---|---|---|
| Python assignment workflows | difficulty rules, mentor/planner hooks, contributor guidance | move policy into module and config |
| C++ command dispatcher | command map and helper boundaries | generalize across repos |
| Python review-sync | phased label sync, rate-limit guard, role-aware review state | make output and labels repo-configurable |
| C++ bot tests | helper and module tests | make tests required for every V2 module |
| C++ actionlint | workflow linting | make workflow linting part of migration safety |
| Python cron workflows | stale and reminder behavior | consolidate into inactivity module |
| Post-merge recommendation | next issue and milestone ideas | make advisory and evidence-based |

## 18. Non-Goals

V2 should not attempt these first:

- replacing all GitHub Actions at once
- controlling merges
- modifying branch protection
- making AI review mandatory
- building a full Slack or Discord bot
- making contributor progression automatic
- applying write-enabled automation across all Hiero repos
- rewriting CI pipelines unrelated to maintainer or contributor workflow automation

## 19. Success Criteria

I would consider the mentorship deliverable successful if it produces:

- a workflow survey and migration map that maintainers can review and validate
- one reusable module framework
- an assignment and eligibility module tested against Python and C++ behavior
- repository config schema
- dry-run and comment-only modes
- permission guard and audit logger
- bot-script tests and workflow linting
- documented rollout path from Python and C++ to other repositories
- clear maintainer override behavior

## 20. Final Technical Thesis

My technical thesis is that the Hiero GitHub Workflow App should be a V2 migration system for the existing maintainer and contributor workflow lifecycle, not a new feature collection. I would cover contributor onboarding, assignment eligibility, review queue visibility, stale workflow handling, post-merge recommendations, and maintainer-facing progression evidence. Python provides the real-world workflow catalogue. C++ provides the cleaner structural baseline. The GitHub App centralizes policy, config, auditability, and safety. GitHub Actions remain the execution layer. Repositories adopt modules gradually through config, starting in dry-run mode and moving to write-enabled behavior only after maintainer review.
