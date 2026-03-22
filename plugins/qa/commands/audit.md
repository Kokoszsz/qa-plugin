---
description: Non-destructive health check of QA artifacts. Compares current project state against generated .claude/ QA setup, reports CURRENT/OUTDATED/STALE/MISSING per artifact.
allowed-tools: [Read, Glob, Grep, Bash, Skill]
---

# /qa:audit — QA Artifact Health Check

Read-only review of QA setup accuracy.

## Pre-flight

1. Check that `.claude/qa-config.json` exists
   - If not: "No QA setup found. Run `/qa:init` first."
   - Stop execution.

## Execution

### Step 1: Run Drift Detection

Invoke the `qa-differ` skill to compare current project state against saved QA artifacts.

### Step 2: Report Results

Display the drift report:

```
## QA Audit Report

### Artifact Status
| Artifact | Status | Reason |
|----------|--------|--------|
| qa-test-writer | CURRENT | — |
| qa-use-case-identifier | OUTDATED | 2 new API routes |
| qa-coverage-analyzer | CURRENT | — |
| qa-test-reviewer | CURRENT | — |
| test-runner agent | CURRENT | — |
| test command | CURRENT | — |

### Stack Changes
- No changes detected (or list changes)

### Summary
- 5 CURRENT, 1 OUTDATED, 0 STALE, 0 MISSING
```

### Step 3: Suggest Next Step

Invoke `qa-coordinator` to suggest the appropriate action.

## Critical Rules

- **Never modify files** — This command is read-only.
- **Always run full comparison** — Don't skip artifacts.
