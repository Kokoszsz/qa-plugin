---
description: Analyze project and generate comprehensive QA testing infrastructure into .claude/. Detects tech stack, analyzes existing tests, recommends test types, creates project-specific skills, agents, and commands. One-time setup command.
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash, TodoWrite, Skill, AskUserQuestion]
---

# /qa:init — Setup QA Infrastructure

Generate a complete QA testing setup tailored to this project. This is a **one-time command**.

## Pre-flight

1. Check if `.claude/qa-config.json` already exists
   - If yes: "QA is already initialized. Run `/qa:sync` to update configuration or regenerate artifacts." — **Stop.**
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

### Step 4: Test Type Selection

Based on the scanner report, determine which test types are applicable and recommend them to the user.

#### Detection Rules

| Signal | Recommends |
|--------|-----------|
| Any source code with logic | **Unit** |
| DB repositories, ORM models, message queues, service-to-service calls | **Integration** |
| REST controllers, GraphQL resolvers, API routes | **API** |
| UI pages, frontend routes, user-facing flows | **E2E** |

#### If no code exists (empty/new project)

Skip test type selection entirely. Generate only base artifacts (Step 5a). Tell the user:
> "No source code detected. Generated base QA skills. When you have code, run `/qa:sync` to select test types and generate test infrastructure."

#### If code exists

Present recommendations with reasoning:

```
## Recommended Test Types

Based on your [language]/[framework] project:

- **Unit** (recommended) — N services, N utilities detected
- **Integration** (recommended) — N DB repositories, [framework] context
- **API** (recommended) — N REST controllers / N GraphQL resolvers
- **E2E** (not recommended) — no frontend detected

Which test types do you want to enable?
```

Use `AskUserQuestion` to let the user confirm or adjust. The user can select any combination.

### Step 5: Generate QA Artifacts

Invoke the `qa-scaffolder` skill with:
- Scanner report
- Stack detection output
- Test analysis output
- **Selected test types from Step 4**

#### Step 5a: Base artifacts (always generated)

These are generated regardless of selected test types:
- `qa-use-case-identifier` skill — available for later use, **NOT invoked during init**
- `qa-scenario-writer` skill — available for later use
- `qa-coverage-analyzer` skill
- `qa-test-reviewer` skill
- `qa-test-runner` agent (single agent, handles all test types)
- `qa-coverage-checker` agent
- `qa-test-reviewer` agent
- `/test` command (with flags for enabled types)
- `/test:coverage` command
- `/test:review` command
- `qa-config.json` with detected stack + selected `testTypes`

#### Step 5b: Per-type artifacts (only for selected types)

| Selected Type | Skill Generated |
|---------------|----------------|
| Unit | `qa-test-writer` (unit-focused) |
| Integration | `qa-integration-test-writer` |
| E2E | `qa-e2e-test-writer` |
| API | `qa-api-test-writer` |

### Step 6: Verify

Run the verification script:
```bash
node <plugin-dir>/scripts/verify-setup.js --project-root <project-root> --json
```

If verification fails: fix issues and re-verify.

### Step 7: Report

Print a summary:

```
## QA Setup Complete

### Detected Stack
- Language: kotlin
- Framework: spring
- Test Runner: junit
- Coverage: jacoco

### Test Types Enabled
- Unit ✓
- Integration ✓
- API ✓
- E2E —

### Generated Artifacts
- N skills in .claude/skills/qa-*
- 3 agents in .claude/agents/qa-*
- 3 commands: /test, /test:coverage, /test:review
- Configuration: .claude/qa-config.json

### Existing Tests
- Found N test files following [pattern]
- Conventions preserved in generated skills
```

### Step 8: Suggest Next Step

Invoke the `qa-coordinator` skill to append the appropriate next-step suggestion.
