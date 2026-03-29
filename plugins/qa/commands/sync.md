---
description: "Check QA artifact health, update configuration (enable/disable test types, adjust thresholds), and regenerate outdated artifacts. The go-to command for keeping QA infrastructure current."
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash, TodoWrite, Skill, AskUserQuestion]
---

# /qa:sync — Update QA Configuration & Artifacts

Check what's outdated, adjust settings, and regenerate artifacts. Run this after project changes, when you want to enable new test types, or to check QA health.

## Pre-flight

1. Check that `.claude/qa-config.json` exists
   - If not: "No QA setup found. Run `/qa:init` first." — Stop.

## Execution

### Step 1: Re-detect Stack & Scan Project

Run detection and analysis:
```bash
node <plugin-dir>/scripts/detect-stack.js --project-root <project-root> --json
node <plugin-dir>/scripts/analyze-tests.js --project-root <project-root> --language <detected-language> --json
```

Compare results against current `qa-config.json`.

### Step 2: Drift Report

Show what has changed since last init/sync:

```
## QA Health Report

### Stack Changes
- Test runner: jest → vitest (CHANGED)
- Framework: react (unchanged)

### Artifact Status
- qa-test-writer/SKILL.md — STALE (test runner changed)
- qa-test-runner/AGENT.md — STALE (test runner changed)
- qa-coverage-analyzer/SKILL.md — CURRENT
- qa-e2e-test-writer/SKILL.md — MISSING (e2e is enabled but skill doesn't exist)

### Configuration Suggestions
- Detected 3 new REST controllers → consider enabling API tests
- E2E runner (playwright) detected in dependencies → consider enabling E2E tests
```

### Step 3: Configuration Changes (if applicable)

If drift detection finds new signals (new controllers, new dependencies, etc.), or if the user asked to change settings:

- Ask if they want to enable/disable test types
- Ask if they want to adjust thresholds or emphasis
- Apply changes to `qa-config.json`

This replaces the need for a separate configure command.

### Step 4: Show Sync Plan

Display what will be updated:

```
## Sync Plan

Will regenerate:
- qa-test-writer/SKILL.md (STALE — test runner changed)
- qa-test-runner/AGENT.md (STALE — test runner changed)
- test/COMMAND.md (STALE — test command changed)

Will generate (new):
- qa-api-test-writer/SKILL.md (API tests newly enabled)

Will keep:
- qa-coverage-analyzer/SKILL.md (CURRENT)
- qa-test-reviewer/SKILL.md (CURRENT)

Proceed? (yes/no)
```

Wait for user confirmation.

### Step 5: Regenerate

For STALE artifacts: invoke `qa-scaffolder` to fully regenerate from templates.
For OUTDATED artifacts: invoke `qa-scaffolder` to extend with new information while preserving existing customizations.
For MISSING artifacts (newly enabled types): generate from templates.

### Step 6: Update qa-config.json

Update the saved stack info, test types, and timestamp in `.claude/qa-config.json`.

### Step 7: Verify

Run `verify-setup.js` to validate all artifacts.

### Step 8: Summary

Show what changed:

```
## Sync Complete

- 3 artifacts regenerated
- 1 new artifact created (qa-api-test-writer)
- Configuration updated (API tests enabled)
```

### Step 9: Suggest Next Step

Invoke `qa-coordinator`.
