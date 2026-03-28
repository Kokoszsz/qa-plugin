---
name: qa-coordinator
description: "Generates contextual next-action suggestions based on current QA state. Appends 'Suggested next step' to command output. Used by all /qa:* commands to maintain workflow coherence."
user-invocable: false
---

# QA Coordinator — Next-Action Engine

Determine the most helpful next action for the user based on current QA state.

## When This Skill Is Invoked

Called at the end of every `/qa:*` command to append a "Suggested next step" line.

## Decision Logic

### After `/qa:init`
- If tests exist: "Setup complete. Run `/qa:analyze` to check test health, or `/test` to run your tests."
- If no tests: "Setup complete. Use the test-writer skill to create your first tests, or `/qa:analyze` for a coverage roadmap."

### After `/qa:audit`
- If all CURRENT: "All QA artifacts are up to date. Consider `/qa:analyze` for a deeper test health check."
- If any STALE: "N artifacts are stale. Run `/qa:sync` to regenerate them."
- If any OUTDATED: "N artifacts need updates. Run `/qa:sync` to refresh them."
- If any MISSING: "N artifacts are missing. Run `/qa:sync` to generate them."

### After `/qa:sync`
- "Artifacts updated. Run `/qa:analyze` to check test health against the new configuration."

### After `/qa:analyze`
- If gaps found: "Found N coverage gaps. Highest priority: [module]. Use the test-writer skill to add tests."
- If quality issues: "Found N test quality issues. Run `/test:review` for detailed recommendations."
- If healthy: "Test health looks good. Run `/test:coverage` to verify coverage thresholds."

### After `/qa:status`
- Show the single most impactful action from the decision tree above.

### After `/qa:configure`
- "Configuration updated. Run `/qa:sync` to regenerate artifacts with new settings."

### After `/qa:scenarios`
- If generated from spec: "Scenarios added to [spec file]. Use the test-writer skill to create e2e tests from these scenarios."
- If generated standalone: "Scenarios saved to `.claude/scenarios/`. Use the test-writer skill to create e2e tests from these scenarios, or run `/qa:scenarios --spec <path>` to attach them to a spec."

## Output Format

Always output exactly one suggestion line at the end of the command output:

```
---
**Suggested next step:** Run `/qa:sync` to update 3 outdated artifacts.
```
