---
name: qa-scaffolder
description: "Generates project-specific QA artifacts into .claude/ directory. Takes qa-scanner report + templates and produces customized skills, agents, commands, and qa-config.json. Respects selected test types — only generates artifacts for types the user chose. Use during /qa:init or /qa:sync rebuild."
user-invocable: false
---

# QA Scaffolder — Artifact Generator

Generate the complete QA infrastructure for a project's `.claude/` directory using the scanner report and template files.

## When This Skill Is Invoked

Called by `/qa:init` after the qa-scanner produces its report. Receives:
- The scanner report (project structure, modules, testing opportunities)
- The stack detection output (language, framework, test runner)
- The test analysis output (existing patterns, conventions)
- **The selected test types** (from user confirmation in init Step 4)

## Workflow

### Phase 1: Read Templates

Read the template files this run needs from `${CLAUDE_PLUGIN_ROOT}/templates/`. Claude Code replaces
`${CLAUDE_PLUGIN_ROOT}` with the plugin's install folder when it loads this skill, so the paths below are
absolute. Never read templates from the project you are scaffolding.

**Always read (base templates):**
- `${CLAUDE_PLUGIN_ROOT}/templates/skills/use-case-identifier.md`
- `${CLAUDE_PLUGIN_ROOT}/templates/skills/scenario-writer.md`
- `${CLAUDE_PLUGIN_ROOT}/templates/skills/coverage-analyzer.md`
- `${CLAUDE_PLUGIN_ROOT}/templates/skills/test-reviewer.md`
- `${CLAUDE_PLUGIN_ROOT}/templates/agents/test-runner.md`
- `${CLAUDE_PLUGIN_ROOT}/templates/agents/coverage-checker.md`
- `${CLAUDE_PLUGIN_ROOT}/templates/agents/test-reviewer.md`
- `${CLAUDE_PLUGIN_ROOT}/templates/commands/test.md`
- `${CLAUDE_PLUGIN_ROOT}/templates/commands/test-coverage.md`
- `${CLAUDE_PLUGIN_ROOT}/templates/commands/test-review.md`

**Read per selected test type:**
- Unit selected → `${CLAUDE_PLUGIN_ROOT}/templates/skills/test-writer.md`
- Integration selected → `${CLAUDE_PLUGIN_ROOT}/templates/skills/integration-test-writer.md`
- E2E selected → `${CLAUDE_PLUGIN_ROOT}/templates/skills/e2e-test-writer.md`
- API selected → `${CLAUDE_PLUGIN_ROOT}/templates/skills/api-test-writer.md`

### Phase 2: Customize Templates

For each template, substitute project-specific details:

**Variables to replace:**
- `{{language}}` — detected language (e.g., "kotlin")
- `{{framework}}` — detected framework (e.g., "spring")
- `{{testRunner}}` — detected test runner (e.g., "junit")
- `{{testCommand}}` — detected unit test command (e.g., "gradle test")
- `{{integrationTestCommand}}` — integration test command (e.g., "gradle integrationTest")
- `{{e2eTestCommand}}` — e2e test command (e.g., "npx playwright test")
- `{{apiTestCommand}}` — API test command (e.g., "gradle test --tests '*ApiTest'")
- `{{e2eRunner}}` — e2e framework (e.g., "playwright", "cypress", "selenium")
- `{{coverageTool}}` — detected coverage tool (e.g., "jacoco")
- `{{packageManager}}` — detected package manager (e.g., "gradle")
- `{{testLocation}}` — test location convention (e.g., "src/test/")
- `{{namingPattern}}` — test naming pattern (e.g., "*Test.kt")
- `{{modules}}` — list of project modules from scanner
- `{{existingPatterns}}` — existing test patterns (if any)

**Beyond simple substitution:**
- Add project-specific examples based on actual module names
- Reference real file paths from the scanner report
- Include framework-specific testing patterns
- Adapt recommendations based on existing test conventions

### Phase 3: Generate qa-config.json

```json
{
  "stack": {
    "language": "{{language}}",
    "framework": "{{framework}}",
    "testRunner": "{{testRunner}}",
    "coverageTool": "{{coverageTool}}",
    "packageManager": "{{packageManager}}"
  },
  "testTypes": {
    "unit": {
      "enabled": true,
      "runner": "{{testRunner}}",
      "command": "{{testCommand}}"
    },
    "integration": {
      "enabled": false,
      "runner": null,
      "command": null
    },
    "e2e": {
      "enabled": false,
      "runner": null,
      "command": null
    },
    "api": {
      "enabled": false,
      "runner": null,
      "command": null
    }
  },
  "emphasis": {
    "unit": "standard",
    "integration": "standard",
    "e2e": "standard",
    "useCases": "standard"
  },
  "conventions": {
    "testLocation": "{{testLocation}}",
    "namingPattern": "{{namingPattern}}",
    "fixturePattern": "{{fixturePattern}}"
  },
  "coverage": {
    "tool": "{{coverageTool}}",
    "thresholds": { "lines": 80, "branches": 70 }
  },
  "generatedAt": "{{timestamp}}",
  "pluginVersion": "0.1.0"
}
```

Set `enabled: true` and populate `runner` + `command` only for test types the user selected in init Step 4.

### Phase 4: Write Files

Write each file to the project's `.claude/` directory at exactly the path below. File names matter:
Claude Code names a project command after its path under `.claude/commands/`, turning each `/` into `:`
and dropping `.md`, so `.claude/commands/test/coverage.md` becomes `/test:coverage`. Agents are flat
`.md` files, and the `name` in their frontmatter must match the file name.

Template paths are relative to the templates folder from Phase 1.

**Always written (base):**

| # | Template | Write to | Shows up as |
|---|----------|----------|-------------|
| 1 | (Phase 3) | `.claude/qa-config.json` | QA configuration |
| 2 | `skills/use-case-identifier.md` | `.claude/skills/qa-use-case-identifier/SKILL.md` | skill `qa-use-case-identifier` |
| 3 | `skills/scenario-writer.md` | `.claude/skills/qa-scenario-writer/SKILL.md` | skill `qa-scenario-writer` |
| 4 | `skills/coverage-analyzer.md` | `.claude/skills/qa-coverage-analyzer/SKILL.md` | skill `qa-coverage-analyzer` |
| 5 | `skills/test-reviewer.md` | `.claude/skills/qa-test-reviewer/SKILL.md` | skill `qa-test-reviewer` |
| 6 | `agents/test-runner.md` | `.claude/agents/qa-test-runner.md` | agent `qa-test-runner` |
| 7 | `agents/coverage-checker.md` | `.claude/agents/qa-coverage-checker.md` | agent `qa-coverage-checker` |
| 8 | `agents/test-reviewer.md` | `.claude/agents/qa-test-reviewer.md` | agent `qa-test-reviewer` |
| 9 | `commands/test.md` | `.claude/commands/test.md` | `/test` |
| 10 | `commands/test-coverage.md` | `.claude/commands/test/coverage.md` | `/test:coverage` |
| 11 | `commands/test-review.md` | `.claude/commands/test/review.md` | `/test:review` |

**Written per selected test type:**

| # | Test type | Template | Write to |
|---|-----------|----------|----------|
| 12 | Unit | `skills/test-writer.md` | `.claude/skills/qa-test-writer/SKILL.md` |
| 13 | Integration | `skills/integration-test-writer.md` | `.claude/skills/qa-integration-test-writer/SKILL.md` |
| 14 | E2E | `skills/e2e-test-writer.md` | `.claude/skills/qa-e2e-test-writer/SKILL.md` |
| 15 | API | `skills/api-test-writer.md` | `.claude/skills/qa-api-test-writer/SKILL.md` |

### Phase 5: Validate

Confirm all artifacts are valid:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/verify-setup.js" --project-root "${CLAUDE_PROJECT_DIR}" --json
```

If validation fails → fix the failing artifacts before completing.

## Critical Rules

1. **Specificity test** — For each generated file, ask: "Could this have been generated without analyzing THIS project?" If yes → rewrite with more project-specific details.
2. **Respect existing** — If the project already has tests, the test-writer skills MUST reference existing conventions, not override them.
3. **Complete files** — Every generated file must be a complete, working artifact. No placeholders like "TODO" or "fill in later."
4. **Ask before overwriting** — If `.claude/skills/qa-*` files already exist, ask the user before overwriting.
5. **Only generate what's selected** — Do NOT generate test-writer skills for test types the user did not select.
