# QA Plugin Design — Comprehensive AI QA Testing Setup

## Purpose

A Claude Code plugin (`qa`) that analyzes any project and generates tailored QA infrastructure into the project's `.claude/` directory — teaching Claude how to test *that specific project*.

## Architecture: Two Layers

### Meta Layer (the plugin itself)
Commands like `/qa:init`, `/qa:audit`, `/qa:sync` that **analyze a project and generate/maintain** project-specific QA artifacts in `.claude/`.

### Template Layer (shipped with the plugin)
Pre-built QA skill/agent/command templates that the meta commands **customize per project**. The templates provide QA methodology; the meta commands make them project-specific.

### Flow
```
User installs qa plugin
  → runs /qa:init
    → plugin detects stack, analyzes tests
    → plugin takes templates + scan results
    → generates customized skills/agents/commands into project's .claude/
  → user now has /test, /test:coverage, /test:review + QA skills
  → later: /qa:sync regenerates if project changes
```

---

## Plugin Structure

```
qa-plugin/
├── .claude-plugin/
│   └── marketplace.json              # Marketplace discoverability
├── plugins/qa/
│   ├── .claude-plugin/
│   │   └── plugin.json               # Plugin manifest (name: "qa")
│   ├── commands/                     # Meta commands (6 slash commands)
│   │   ├── init/COMMAND.md
│   │   ├── audit/COMMAND.md
│   │   ├── sync/COMMAND.md
│   │   ├── analyze/COMMAND.md
│   │   ├── status/COMMAND.md
│   │   └── configure/COMMAND.md
│   ├── skills/                       # Internal plugin skills (not user-facing)
│   │   ├── qa-scanner/SKILL.md       # Project analysis engine
│   │   ├── qa-scaffolder/SKILL.md    # Generates artifacts into .claude/
│   │   ├── qa-differ/SKILL.md        # Drift detection
│   │   └── qa-coordinator/SKILL.md   # Next-action suggestion engine
│   ├── templates/                    # Templates customized per project
│   │   ├── skills/
│   │   │   ├── test-writer.md
│   │   │   ├── use-case-identifier.md
│   │   │   ├── coverage-analyzer.md
│   │   │   └── test-reviewer.md
│   │   ├── agents/
│   │   │   ├── test-runner.md
│   │   │   ├── coverage-checker.md
│   │   │   └── test-reviewer.md
│   │   └── commands/
│   │       ├── test.md
│   │       ├── test-coverage.md
│   │       └── test-review.md
│   ├── scripts/                      # Internal helpers (not user-facing)
│   │   ├── detect-stack.js
│   │   ├── analyze-tests.js
│   │   └── verify-setup.js
│   └── hooks/
│       └── hooks.json                # Minimal — no auto-triggers
├── tests/                            # promptfoo tests (dev-only, not shipped to users)
│   ├── promptfooconfig.yaml
│   └── skills/
│       ├── init.test.yaml
│       ├── audit.test.yaml
│       └── ...
└── docs/
    ├── getting-started.md
    └── architecture.md
```

---

## Meta Commands (6 plugin commands)

### `/qa:init` — Setup QA infrastructure
1. Runs `detect-stack.js` → identifies language, frameworks, test tools, CI, coverage tools
2. Runs `analyze-tests.js` → if tests exist, analyzes patterns, conventions, coverage
3. Invokes `qa-scanner` skill → deep analysis of project structure, entry points, modules
4. Invokes `qa-scaffolder` skill → takes templates + scan results → generates project-specific artifacts into `.claude/`:
   - `.claude/skills/qa-test-writer/SKILL.md`
   - `.claude/skills/qa-use-case-identifier/SKILL.md`
   - `.claude/skills/qa-coverage-analyzer/SKILL.md`
   - `.claude/skills/qa-test-reviewer/SKILL.md`
   - `.claude/agents/qa-test-runner/AGENT.md`
   - `.claude/agents/qa-coverage-checker/AGENT.md`
   - `.claude/agents/qa-test-reviewer/AGENT.md`
   - `.claude/commands/test/COMMAND.md`
   - `.claude/commands/test-coverage/COMMAND.md`
   - `.claude/commands/test-review/COMMAND.md`
   - `.claude/qa-config.json`
5. Runs `verify-setup.js` → validates generated artifacts
6. Prints summary + suggested next command

**Adapts automatically:** No tests → builds from scratch with recommended framework. Tests exist → analyzes patterns and builds on top.

**`qa-config.json` (smart defaults, user can edit):**
```json
{
  "stack": {
    "language": "typescript",
    "framework": "next",
    "testRunner": "jest"
  },
  "emphasis": {
    "unit": "standard",
    "integration": "standard",
    "e2e": "standard",
    "useCases": "standard"
  },
  "conventions": {
    "testLocation": "colocated",
    "namingPattern": "*.test.ts",
    "fixturePattern": "__fixtures__/"
  },
  "coverage": {
    "tool": "istanbul",
    "thresholds": { "lines": 80, "branches": 70 }
  }
}
```

User edits this file to shift emphasis, then runs `/qa:sync` to regenerate.

### `/qa:audit` — Read-only health check
- Re-scans project state (new files, changed deps, framework upgrades)
- Compares against generated QA artifacts
- Reports: CURRENT / OUTDATED / STALE / MISSING per artifact
- Identifies new modules lacking test coverage guidance
- Suggests next command
- **Never modifies files**

### `/qa:sync` — Update QA artifacts
- Runs same detection as audit
- Regenerates OUTDATED/STALE artifacts from templates + current project state
- Extends skills for new modules
- Updates `qa-config.json` with newly detected tools
- Validates with `verify-setup.js`
- Shows diff + suggests next command
- **Fully manual** — no auto-triggers

### `/qa:analyze` — Deep test health analysis
- Scans existing tests for quality signals (missing assertions, shallow tests, copy-paste, isolation issues)
- Maps codebase against test coverage to find blind spots
- Identifies untested user flows / use cases
- Produces prioritized recommendations
- Suggests next command

### `/qa:status` — QA health dashboard
- Quick snapshot: artifact freshness, last sync date, known gaps
- Shows single most impactful next action:
  - "QA artifacts outdated → run /qa:sync"
  - "3 new modules since last sync → run /qa:analyze"
  - "Coverage dropped → run /test:coverage"
  - "Everything looks good → consider /qa:audit"

### `/qa:configure` — Adjust preferences
- Opens/creates `qa-config.json`
- Lets user adjust emphasis, thresholds, conventions
- Suggests `/qa:sync` after changes

---

## Template Skills (customized per project by /qa:init)

### `test-writer`
Teaches Claude how to write tests for this project:
- Which framework/runner to use and how
- Project's assertion style and patterns
- How to set up fixtures, mocks, test data
- Naming conventions and file placement
- What types of tests to write for different code types (API, UI, utility, data layer)

### `use-case-identifier`
Teaches Claude to discover and document testable scenarios:
- Identifies user flows from routes, components, API endpoints
- Maps business logic to testable use cases
- Suggests acceptance criteria per use case
- Prioritizes by risk and impact
- Understands the project's domain context

### `coverage-analyzer`
Teaches Claude how to interpret and improve coverage:
- Which coverage tool to run and how
- How to read coverage reports for this project
- What thresholds are expected
- Distinguishing meaningful vs. meaningless coverage gaps
- Strategies for improving coverage efficiently

### `test-reviewer`
Teaches Claude to review test quality:
- Stack-specific anti-patterns
- Assertion completeness checks
- Test isolation verification
- Edge case coverage assessment
- Test performance (slow tests, redundancy)

---

## Template Agents (customized per project by /qa:init)

### `test-runner`
- Knows how to run the project's test suite
- Parses test output into structured results
- Can run targeted tests (single file, by pattern)
- Reports failures with relevant context

### `coverage-checker`
- Runs coverage tools configured for the project
- Compares against thresholds in `qa-config.json`
- Identifies new uncovered paths since last check

### `test-reviewer`
- Reviews changed/new test files
- Applies the test-reviewer skill automatically
- Provides structured feedback on test quality

---

## Template Commands (generated into project's .claude/)

### `/test` — Smart test runner
Runs relevant tests based on changed files. Uses test-runner agent.

### `/test:coverage` — Coverage analysis
Runs full coverage, compares against thresholds, identifies gaps. Uses coverage-checker agent.

### `/test:review` — Test quality review
Reviews test files for quality, anti-patterns, missing cases. Uses test-reviewer agent.

---

## Coordination System

Every command ends with a **"Suggested next step"** line:
- `/qa:init` → "Setup complete. Run `/qa:analyze` to find gaps, or `/test` to run tests."
- `/qa:audit` → "2 artifacts outdated. Run `/qa:sync` to update."
- `/qa:sync` → "Artifacts updated. Run `/qa:analyze` to check test health."
- `/qa:analyze` → "Found 5 gaps. Use test-writer skill to add tests for [module]."
- `/qa:status` → Shows the single most impactful next action.

---

## Internal Scripts (not user-facing)

### `detect-stack.js`
Mechanically reads config files (package.json, go.mod, requirements.txt, etc.) to identify language, framework, test tools, CI setup. Returns structured JSON. No external dependencies.

### `analyze-tests.js`
Scans for test file patterns, counts tests, checks structure. Returns summary of existing test setup. No external dependencies.

### `verify-setup.js`
Validates generated artifacts have correct frontmatter, required fields, no broken references. Returns pass/fail with details. No external dependencies.

---

## promptfoo Testing (development-only)

Used by plugin developers (us) to validate the plugin works correctly. Not shipped to users.

### What it tests:
- Stack detection accuracy across project types
- Template customization quality (does the generated test-writer reference the right framework?)
- Artifact structural correctness (valid frontmatter, required fields)
- Coordination suggestion accuracy (right next-step recommendations)
- Adaptation behavior (greenfield vs. existing tests)

### Example test:
```yaml
description: "qa:init correctly scaffolds for Next.js project"
tests:
  - vars:
      project_type: "typescript-next"
      has_existing_tests: false
    assert:
      - type: contains
        value: "qa-test-writer"
      - type: llm-rubric
        value: "Generated skills reference Jest and React Testing Library"
  - vars:
      project_type: "python-django"
      has_existing_tests: true
    assert:
      - type: llm-rubric
        value: "Builds on existing pytest conventions rather than replacing them"
```

### How to run:
```bash
promptfoo eval --env-file .env
```

---

## Implementation Order

1. Plugin scaffold — marketplace.json, plugin.json, directory structure
2. Scripts — detect-stack.js, analyze-tests.js, verify-setup.js
3. Internal skills — qa-scanner, qa-scaffolder, qa-differ, qa-coordinator
4. Template skills — test-writer, use-case-identifier, coverage-analyzer, test-reviewer
5. Template agents — test-runner, coverage-checker, test-reviewer
6. Template commands — test, test-coverage, test-review
7. Meta commands — /qa:init, /qa:audit, /qa:sync, /qa:analyze, /qa:status, /qa:configure
8. promptfoo tests — behavioral tests for each component
9. Docs — getting-started, architecture
