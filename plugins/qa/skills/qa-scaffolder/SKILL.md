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

Read template files from the plugin's `templates/` directory based on what needs to be generated.

**Always read (base templates):**
- `templates/skills/use-case-identifier.md`
- `templates/skills/scenario-writer.md`
- `templates/skills/coverage-analyzer.md`
- `templates/skills/test-reviewer.md`
- `templates/agents/test-runner.md`
- `templates/agents/coverage-checker.md`
- `templates/agents/test-reviewer.md`
- `templates/commands/test.md`
- `templates/commands/test-coverage.md`
- `templates/commands/test-review.md`

**Read per selected test type:**
- Unit selected → `templates/skills/test-writer.md`
- Integration selected → `templates/skills/integration-test-writer.md`
- E2E selected → `templates/skills/e2e-test-writer.md`
- API selected → `templates/skills/api-test-writer.md`

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

Write all generated files to the project's `.claude/` directory:

**Always written (base):**
1. `.claude/qa-config.json`
2. `.claude/skills/qa-use-case-identifier/SKILL.md`
3. `.claude/skills/qa-scenario-writer/SKILL.md`
4. `.claude/skills/qa-coverage-analyzer/SKILL.md`
5. `.claude/skills/qa-test-reviewer/SKILL.md`
6. `.claude/agents/qa-test-runner/AGENT.md`
7. `.claude/agents/qa-coverage-checker/AGENT.md`
8. `.claude/agents/qa-test-reviewer/AGENT.md`
9. `.claude/commands/test/COMMAND.md`
10. `.claude/commands/test-coverage/COMMAND.md`
11. `.claude/commands/test-review/COMMAND.md`

**Written per selected test type:**
12. Unit → `.claude/skills/qa-test-writer/SKILL.md`
13. Integration → `.claude/skills/qa-integration-test-writer/SKILL.md`
14. E2E → `.claude/skills/qa-e2e-test-writer/SKILL.md`
15. API → `.claude/skills/qa-api-test-writer/SKILL.md`

### Phase 5: Validate

Run `verify-setup.js --project-root <path>` to confirm all artifacts are valid.

If validation fails → fix the failing artifacts before completing.

## Critical Rules

1. **Specificity test** — For each generated file, ask: "Could this have been generated without analyzing THIS project?" If yes → rewrite with more project-specific details.
2. **Respect existing** — If the project already has tests, the test-writer skills MUST reference existing conventions, not override them.
3. **Complete files** — Every generated file must be a complete, working artifact. No placeholders like "TODO" or "fill in later."
4. **Ask before overwriting** — If `.claude/skills/qa-*` files already exist, ask the user before overwriting.
5. **Only generate what's selected** — Do NOT generate test-writer skills for test types the user did not select.
