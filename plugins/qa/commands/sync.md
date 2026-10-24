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

Run detection and analysis. Claude Code replaces `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PROJECT_DIR}` with
real paths when it loads this command; keep the quotes.
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/detect-stack.js" --project-root "${CLAUDE_PROJECT_DIR}" --json
node "${CLAUDE_PLUGIN_ROOT}/scripts/analyze-tests.js" --project-root "${CLAUDE_PROJECT_DIR}" --language <language> --json
```

Run the second (analysis) command once for each language in the detection output's `languages` list.
Compare results against current `qa-config.json`. If its `pluginVersion` is older than the `version` in
`${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`, treat every generated artifact as OUTDATED.

### Step 2: Drift Report

Show what has changed since last init/sync:

```
## QA Health Report

### Stack Changes
- Test runner: jest → vitest (CHANGED)
- Framework: react (unchanged)

### Artifact Status
- skills/qa-test-writer/SKILL.md — STALE (test runner changed)
- agents/qa-test-runner.md — STALE (test runner changed)
- skills/qa-coverage-analyzer/SKILL.md — CURRENT
- skills/qa-e2e-test-writer/SKILL.md — MISSING (e2e is enabled but skill doesn't exist)
- 0.1.0 layout — 3 commands and 3 agents at old paths, will be moved (Step 5)

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

Will move (0.1.0 layout, see Step 5):
- 3 commands and 3 agents to their new paths

Will regenerate:
- skills/qa-test-writer/SKILL.md (STALE — test runner changed)
- agents/qa-test-runner.md (STALE — test runner changed)
- commands/test.md (STALE — test command changed)

Will generate (new):
- skills/qa-api-test-writer/SKILL.md (API tests newly enabled)

Will keep:
- skills/qa-coverage-analyzer/SKILL.md (CURRENT)
- skills/qa-test-reviewer/SKILL.md (CURRENT)

Proceed? (yes/no)
```

Wait for user confirmation.

### Step 5: Move the 0.1.0 layout (if present)

Version 0.1.0 wrote commands and agents to paths that Claude Code registers under the wrong names.
If any file in the left column exists, move it to the right column, keeping any edits the user made.
Then delete the old file, and delete the `test-coverage/`, `test-review/` and `agents/qa-*/` folders once
they're empty. Treat each moved file as OUTDATED in Step 6.

| 0.1.0 path | Registered as | Move to |
|------------|---------------|---------|
| `.claude/commands/test/COMMAND.md` | `/test:COMMAND` | `.claude/commands/test.md` |
| `.claude/commands/test-coverage/COMMAND.md` | `/test-coverage:COMMAND` | `.claude/commands/test/coverage.md` |
| `.claude/commands/test-review/COMMAND.md` | `/test-review:COMMAND` | `.claude/commands/test/review.md` |
| `.claude/agents/qa-test-runner/AGENT.md` | agent (non-standard path) | `.claude/agents/qa-test-runner.md` |
| `.claude/agents/qa-coverage-checker/AGENT.md` | agent (non-standard path) | `.claude/agents/qa-coverage-checker.md` |
| `.claude/agents/qa-test-reviewer/AGENT.md` | agent (non-standard path) | `.claude/agents/qa-test-reviewer.md` |

### Step 6: Regenerate

For STALE artifacts: invoke `qa-scaffolder` to fully regenerate from templates.
For OUTDATED artifacts: invoke `qa-scaffolder` to extend with new information while preserving existing customizations.
For MISSING artifacts (newly enabled types): generate from templates.

### Step 7: Update qa-config.json

Update the saved stack info, test types, and timestamp in `.claude/qa-config.json`.

### Step 8: Verify

Validate all artifacts:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/verify-setup.js" --project-root "${CLAUDE_PROJECT_DIR}" --json
```

### Step 9: Summary

Show what changed:

```
## Sync Complete

- 3 artifacts regenerated
- 1 new artifact created (qa-api-test-writer)
- Configuration updated (API tests enabled)
```

### Step 10: Suggest Next Step

Invoke `qa-coordinator`.
