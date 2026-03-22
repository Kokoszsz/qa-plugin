---
name: qa-differ
description: "Detects drift between project's current state and generated QA artifacts. Compares stack, modules, and test patterns to identify CURRENT, OUTDATED, STALE, or MISSING artifacts. Used by /qa:audit and /qa:sync."
user-invocable: false
---

# QA Differ — Drift Detection

Compare the project's current state against previously generated QA artifacts to detect what needs updating.

## When This Skill Is Invoked

Called by `/qa:audit` (read-only report) and `/qa:sync` (to determine what to regenerate).

## Workflow

### Phase 1: Gather Current State

1. Run `detect-stack.js` → get current stack info
2. Run `analyze-tests.js` → get current test analysis
3. Read `.claude/qa-config.json` → get saved state from last init/sync

### Phase 2: Compare

For each dimension, compare current vs. saved:

**Stack drift:**
- Language changed? (rare but possible)
- Framework changed or added?
- Test runner changed (e.g., Jest → Vitest)?
- New coverage tool?
- New CI setup?

**Module drift:**
- New source directories/modules added?
- Modules removed?
- Significant new files (new API routes, new components)?

**Test drift:**
- New test files added outside QA plugin guidance?
- Test conventions changed?
- New testing patterns detected?

### Phase 3: Classify Artifacts

For each generated artifact, assign a status:

- **CURRENT** — No relevant drift detected. Artifact is still accurate.
- **OUTDATED** — Minor drift. Artifact mostly correct but missing new modules or patterns.
- **STALE** — Major drift. Stack or framework changed. Artifact needs full regeneration.
- **MISSING** — Expected artifact doesn't exist (e.g., new module type needs new guidance).

### Phase 4: Produce Report

```
## Drift Report

### Stack Changes
- testRunner: jest → vitest (CHANGED)
- framework: react → next (CHANGED)

### Artifact Status
| Artifact | Status | Reason |
|----------|--------|--------|
| qa-test-writer/SKILL.md | STALE | Test runner changed from jest to vitest |
| qa-use-case-identifier/SKILL.md | OUTDATED | 3 new API routes not covered |
| qa-coverage-analyzer/SKILL.md | CURRENT | — |
| qa-test-reviewer/SKILL.md | CURRENT | — |
| test-runner/AGENT.md | STALE | Test runner changed |
| test/COMMAND.md | STALE | Test command changed |

### Recommended Actions
1. Run /qa:sync to regenerate STALE artifacts
2. Run /qa:sync to extend OUTDATED artifacts
```

## Critical Rules

1. **Read actual files** — Compare against real `.claude/qa-config.json`, not assumptions.
2. **Be conservative** — If unsure whether something drifted, mark as OUTDATED (not STALE).
3. **Stay read-only** — This skill produces a report. It does NOT modify files. `/qa:sync` acts on this report.
