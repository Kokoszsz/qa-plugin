# QA Plugin for Claude Code

A Claude Code plugin that analyzes any project and generates tailored QA testing infrastructure into `.claude/` — teaching Claude how to test *your specific project*.

## What It Does

Run `/qa:init` and the plugin will:

1. **Detect your tech stack** — language, framework, test runner, coverage tool, CI
2. **Analyze existing tests** — patterns, conventions, coverage
3. **Generate project-specific QA artifacts** into `.claude/`:
   - 4 skills (test writing, use case identification, coverage analysis, test review)
   - 3 agents (test runner, coverage checker, test reviewer)
   - 3 commands (`/test`, `/test:coverage`, `/test:review`)
   - Configuration file with smart defaults

Everything is customized to your stack. A Next.js project gets Jest + React Testing Library patterns. A Django project gets pytest + Django TestCase patterns. A Go project gets table-driven test conventions.

## Supported Stacks

TypeScript, JavaScript, Python, Go, Rust, Java, Ruby, PHP, Elixir, Swift, Dart — with framework-specific detection for Next.js, React, Vue, Angular, Svelte, Express, NestJS, Django, Flask, FastAPI, Rails, Spring Boot, and more.

## Installation

```
/plugin marketplace add Kokoszsz/qa-plugin
/plugin install qa@qa-plugin
```

## Quick Start

```bash
# Generate QA setup for your project
/qa:init

# Check QA health
/qa:status

# Run tests
/test

# Analyze coverage gaps
/test:coverage

# Review test quality
/test:review
```

## Commands

| Command | What it does |
|---------|-------------|
| `/qa:init` | Detect stack, scan project, generate all QA artifacts |
| `/qa:audit` | Read-only health check — CURRENT / OUTDATED / STALE / MISSING per artifact |
| `/qa:sync` | Regenerate outdated artifacts after project changes |
| `/qa:analyze` | Deep analysis of test quality, coverage gaps, untested flows |
| `/qa:status` | Quick dashboard with suggested next action |
| `/qa:configure` | Adjust emphasis, thresholds, conventions |

## What Gets Generated

After `/qa:init`, your `.claude/` directory gets:

### Skills
- **qa-test-writer** — Writes tests following your project's conventions
- **qa-use-case-identifier** — Maps routes, APIs, components to testable user flows
- **qa-coverage-analyzer** — Interprets coverage reports, identifies meaningful gaps
- **qa-test-reviewer** — Reviews test quality (assertions, isolation, edge cases, mocks)

### Agents
- **qa-test-runner** — Runs your test suite, parses output into structured results
- **qa-coverage-checker** — Runs coverage, compares against thresholds
- **qa-test-reviewer** — Automatically reviews changed test files

### Commands
- `/test` — Smart test runner (all, single file, or changed files only)
- `/test:coverage` — Coverage analysis with gap identification
- `/test:review` — Test quality review for anti-patterns

## Customization

The plugin generates a `.claude/qa-config.json` with smart defaults:

```json
{
  "emphasis": {
    "unit": "standard",
    "integration": "standard",
    "e2e": "standard",
    "useCases": "standard"
  },
  "coverage": {
    "thresholds": { "lines": 80, "branches": 70 }
  }
}
```

Edit this file to shift emphasis (e.g., `"e2e": "heavy"`), then run `/qa:sync` to regenerate artifacts.

## Workflow

```
/qa:init  →  /qa:status  →  /test  →  /test:coverage  →  /test:review
                ↑                                              |
                └──── /qa:audit  →  /qa:sync ←─────────────────┘
                        (when project changes)
```

Every command suggests the logical next step, and `/qa:status` shows the single most impactful action.

## How It Works

The plugin has two layers:

- **Meta layer** — The 6 `/qa:*` commands that analyze your project and manage QA artifacts
- **Template layer** — Pre-built skill/agent/command templates that get customized per project

Three Node.js scripts handle mechanical detection (no AI needed for reading `package.json`):
- `detect-stack.js` — Identifies language, framework, test tools, CI, package manager
- `analyze-tests.js` — Scans existing test files for patterns and conventions
- `verify-setup.js` — Validates generated artifacts are structurally correct

## Contributing

```bash
# Run script tests (68 assertions)
npm test

# Run promptfoo behavioral tests (requires ANTHROPIC_API_KEY in .env)
npm run test:promptfoo

# Run individual promptfoo suites
npm run test:promptfoo:init
npm run test:promptfoo:audit
npm run test:promptfoo:coordinator

# View promptfoo results in browser
npm run test:promptfoo:view
```

## License

MIT
