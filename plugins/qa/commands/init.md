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

Claude Code replaces `${CLAUDE_PLUGIN_ROOT}` with this plugin's install folder and `${CLAUDE_PROJECT_DIR}`
with the project root when it loads this command. Keep the quotes, so paths with spaces stay one argument.
If a path still reads literally as `${CLAUDE_PLUGIN_ROOT}`, find this plugin's install folder under
`~/.claude/plugins/cache/` instead of guessing.

### Step 1: Detect Stack

Run the detection script:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/detect-stack.js" --project-root "${CLAUDE_PROJECT_DIR}" --json
```

Save the JSON output for later steps.

### Step 2: Analyze Existing Tests

Run the analysis script:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/analyze-tests.js" --project-root "${CLAUDE_PROJECT_DIR}" --language <detected-language> --json
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

These are generated regardless of selected test types. The scaffolder's Phase 4 table gives the exact
file path for each one; use those paths, because Claude Code derives command names from them.
- `qa-use-case-identifier` skill — available for later use, **NOT invoked during init**
- `qa-scenario-writer` skill — available for later use
- `qa-coverage-analyzer` skill
- `qa-test-reviewer` skill
- `qa-test-runner` agent (single agent, handles all test types)
- `qa-coverage-checker` agent
- `qa-test-reviewer` agent
- `/test` command (with flags for enabled types) — `.claude/commands/test.md`
- `/test:coverage` command — `.claude/commands/test/coverage.md`
- `/test:review` command — `.claude/commands/test/review.md`
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
node "${CLAUDE_PLUGIN_ROOT}/scripts/verify-setup.js" --project-root "${CLAUDE_PROJECT_DIR}" --json
```

If verification fails: fix issues and re-verify. The script only reports files this command generated
(including leftover `{{…}}` placeholders); never edit other files in `.claude/` to make it pass.

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
- N skills in .claude/skills/qa-*/SKILL.md
- 3 agents in .claude/agents/qa-*.md
- 3 commands: /test, /test:coverage, /test:review
- Configuration: .claude/qa-config.json

### Existing Tests
- Found N test files following [pattern]
- Conventions preserved in generated skills
```

### Step 8: Suggest Next Step

Invoke the `qa-coordinator` skill to append the appropriate next-step suggestion.
