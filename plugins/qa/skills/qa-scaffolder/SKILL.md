---
name: qa-scaffolder
description: "Generates project-specific QA artifacts into .claude/ directory. Takes qa-scanner report + templates and produces customized skills, agents, commands, and qa-config.json. Use during /qa:init or /qa:sync rebuild."
user-invocable: false
---

# QA Scaffolder — Artifact Generator

Generate the complete QA infrastructure for a project's `.claude/` directory using the scanner report and template files.

## When This Skill Is Invoked

Called by `/qa:init` after the qa-scanner produces its report. Receives:
- The scanner report (project structure, modules, testing opportunities)
- The stack detection output (language, framework, test runner)
- The test analysis output (existing patterns, conventions)

## Workflow

### Phase 1: Read Templates

Read all template files from the plugin's `templates/` directory:
- `templates/skills/test-writer.md`
- `templates/skills/use-case-identifier.md`
- `templates/skills/coverage-analyzer.md`
- `templates/skills/test-reviewer.md`
- `templates/agents/test-runner.md`
- `templates/agents/coverage-checker.md`
- `templates/agents/test-reviewer.md`
- `templates/commands/test.md`
- `templates/commands/test-coverage.md`
- `templates/commands/test-review.md`

### Phase 2: Customize Templates

For each template, substitute project-specific details:

**Variables to replace:**
- `{{language}}` — detected language (e.g., "typescript")
- `{{framework}}` — detected framework (e.g., "next")
- `{{testRunner}}` — detected test runner (e.g., "jest")
- `{{testCommand}}` — detected test command (e.g., "npm test")
- `{{coverageTool}}` — detected coverage tool (e.g., "istanbul")
- `{{packageManager}}` — detected package manager (e.g., "npm")
- `{{testLocation}}` — test location convention (e.g., "colocated")
- `{{namingPattern}}` — test naming pattern (e.g., "*.test.ts")
- `{{modules}}` — list of project modules from scanner
- `{{existingPatterns}}` — existing test patterns (if any)

**Beyond simple substitution:**
- Add project-specific examples based on actual module names
- Reference real file paths from the scanner report
- Include framework-specific testing patterns (e.g., React Testing Library for Next.js)
- Adapt recommendations based on existing test conventions

### Phase 3: Generate qa-config.json

```json
{
  "stack": {
    "language": "{{language}}",
    "framework": "{{framework}}",
    "testRunner": "{{testRunner}}",
    "testCommand": "{{testCommand}}",
    "coverageTool": "{{coverageTool}}",
    "packageManager": "{{packageManager}}"
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

### Phase 4: Write Files

Write all generated files to the project's `.claude/` directory:

1. `.claude/qa-config.json`
2. `.claude/skills/qa-test-writer/SKILL.md`
3. `.claude/skills/qa-use-case-identifier/SKILL.md`
4. `.claude/skills/qa-coverage-analyzer/SKILL.md`
5. `.claude/skills/qa-test-reviewer/SKILL.md`
6. `.claude/agents/qa-test-runner/AGENT.md`
7. `.claude/agents/qa-coverage-checker/AGENT.md`
8. `.claude/agents/qa-test-reviewer/AGENT.md`
9. `.claude/commands/test/COMMAND.md`
10. `.claude/commands/test-coverage/COMMAND.md`
11. `.claude/commands/test-review/COMMAND.md`

### Phase 5: Validate

Run `verify-setup.js --project-root <path>` to confirm all artifacts are valid.

If validation fails → fix the failing artifacts before completing.

## Critical Rules

1. **Specificity test** — For each generated file, ask: "Could this have been generated without analyzing THIS project?" If yes → rewrite with more project-specific details.
2. **Respect existing** — If the project already has tests, the test-writer skill MUST reference existing conventions, not override them.
3. **Complete files** — Every generated file must be a complete, working artifact. No placeholders like "TODO" or "fill in later."
4. **Ask before overwriting** — If `.claude/skills/qa-*` files already exist, ask the user before overwriting.
