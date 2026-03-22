---
description: Regenerate outdated QA artifacts. Re-scans project, identifies drift, updates stale skills/agents/commands, and validates results. Fully manual — never auto-triggered.
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash, TodoWrite, Skill]
---

# /qa:sync — Update QA Artifacts

Regenerate QA artifacts that have drifted from current project state.

## Pre-flight

1. Check that `.claude/qa-config.json` exists
   - If not: "No QA setup found. Run `/qa:init` first." — Stop.

## Execution

### Step 1: Run Drift Detection

Invoke `qa-differ` to get the drift report.

### Step 2: Show Plan

Display what will be updated:

```
## Sync Plan

Will update:
- qa-test-writer/SKILL.md (STALE — test runner changed)
- qa-use-case-identifier/SKILL.md (OUTDATED — new modules)
- test-runner/AGENT.md (STALE — test runner changed)
- test/COMMAND.md (STALE — test command changed)

Will keep:
- qa-coverage-analyzer/SKILL.md (CURRENT)
- qa-test-reviewer/SKILL.md (CURRENT)

Proceed? (yes/no)
```

Wait for user confirmation.

### Step 3: Regenerate

For STALE artifacts: invoke `qa-scaffolder` to fully regenerate from templates.
For OUTDATED artifacts: invoke `qa-scaffolder` to extend with new information while preserving existing customizations.

### Step 4: Update qa-config.json

Update the saved stack info and timestamp in `.claude/qa-config.json`.

### Step 5: Verify

Run `verify-setup.js` to validate all artifacts.

### Step 6: Show Diff Summary

Show what changed in each file (high-level summary, not full diff).

### Step 7: Suggest Next Step

Invoke `qa-coordinator`.
