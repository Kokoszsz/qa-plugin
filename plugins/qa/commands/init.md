---
description: Analyze project and generate comprehensive QA testing infrastructure into .claude/. Detects tech stack, analyzes existing tests, creates project-specific skills, agents, and commands.
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash, TodoWrite, Skill]
---

# /qa:init — Setup QA Infrastructure

Generate a complete QA testing setup tailored to this project.

## Pre-flight

1. Check if `.claude/qa-config.json` already exists
   - If yes: "QA setup already exists. Would you like to:"
     - **Audit** — Run `/qa:audit` to check health (non-destructive)
     - **Rebuild** — Regenerate all artifacts (will overwrite existing)
   - Wait for user confirmation before proceeding with rebuild
2. If no existing setup: proceed with fresh initialization

## Execution

### Step 1: Detect Stack

Run the detection script:
```bash
node <plugin-dir>/scripts/detect-stack.js --project-root <project-root> --json
```

Save the JSON output for later steps.

### Step 2: Analyze Existing Tests

Run the analysis script:
```bash
node <plugin-dir>/scripts/analyze-tests.js --project-root <project-root> --language <detected-language> --json
```

Save the JSON output for later steps.

### Step 3: Deep Project Scan

Invoke the `qa-scanner` skill with the script outputs as context.
This produces a detailed project report with modules, entry points, and testing opportunities.

### Step 4: Generate QA Artifacts

Invoke the `qa-scaffolder` skill with:
- Scanner report
- Stack detection output
- Test analysis output

This generates all project-specific files into `.claude/`:
- 4 skills (test-writer, use-case-identifier, coverage-analyzer, test-reviewer)
- 3 agents (test-runner, coverage-checker, test-reviewer)
- 3 commands (test, test-coverage, test-review)
- qa-config.json

### Step 5: Verify

Run the verification script:
```bash
node <plugin-dir>/scripts/verify-setup.js --project-root <project-root> --json
```

If verification fails: fix issues and re-verify.

### Step 6: Report

Print a summary:

```
## QA Setup Complete

### Detected Stack
- Language: typescript
- Framework: next
- Test Runner: jest
- Coverage: istanbul

### Generated Artifacts
- 4 skills in .claude/skills/qa-*
- 3 agents in .claude/agents/qa-*
- 3 commands: /test, /test:coverage, /test:review
- Configuration: .claude/qa-config.json

### Existing Tests
- Found 15 test files following *.test.ts pattern
- Conventions preserved in generated skills
```

### Step 7: Suggest Next Step

Invoke the `qa-coordinator` skill to append the appropriate next-step suggestion.
