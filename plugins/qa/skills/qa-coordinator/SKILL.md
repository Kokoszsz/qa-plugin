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
- If code exists and test types selected: "Setup complete. Run `/qa:scenarios` to generate user scenarios, or `/test` to run your tests."
- If code exists but no tests: "Setup complete. Use the test-writer skills to create your first tests, or `/qa:scenarios` to plan what to test."
- If no code: "Base setup complete. When you have code, run `/qa:sync` to select test types and generate artifacts."

### After `/qa:sync`
- If config changed: "Configuration and artifacts updated. Run `/qa:analyze` to check test health."
- If only artifacts regenerated: "Artifacts updated. Run `/qa:analyze` to check test health against the new configuration."
- If everything current: "All artifacts are up to date. Run `/qa:analyze` for a deeper test health check."

### After `/qa:analyze`
- If gaps found: "Found N coverage gaps. Highest priority: [module]. Use the test-writer skill to add tests."
- If quality issues: "Found N test quality issues. Run `/test:review` for detailed recommendations."
- If healthy: "Test health looks good. Run `/test:coverage` to verify coverage thresholds."

### After `/qa:scenarios`
- If generated from spec: "Scenarios added to [spec file]. Use the e2e-test-writer skill to create e2e tests from these scenarios."
- If generated standalone: "Scenarios saved to `.claude/scenarios/`. Use the e2e-test-writer skill to create e2e tests from these scenarios, or run `/qa:scenarios --spec <path>` to attach them to a spec."

## Output Format

Always output exactly one suggestion line at the end of the command output:

```
---
**Suggested next step:** Run `/qa:sync` to update 3 outdated artifacts.
```
