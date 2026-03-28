# QA Plugin for Claude Code

A Claude Code plugin that analyzes any project and generates tailored QA testing infrastructure into `.claude/` — teaching Claude how to test *your specific project*.

## What It Does

Run `/qa:init` and the plugin will:

1. **Detect your tech stack** — language, framework, test runner, coverage tool, CI
2. **Analyze existing tests** — patterns, conventions, coverage
3. **Generate project-specific QA artifacts** into `.claude/`:
   - 5 skills (test writing, scenario generation, use case identification, coverage analysis, test review)
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
/qa:init        # Generate QA setup for your project
/qa:status      # Check QA health
```

## Usage Guide

### Step 1: Initialize

```
/qa:init
```

Run this first in any project. It detects your stack, analyzes existing tests (if any), and generates all QA artifacts into `.claude/`. Works on greenfield projects and projects with existing tests.

### Step 2: Generate User Scenarios

```
/qa:scenarios                    # From code analysis
/qa:scenarios --spec docs/auth.md   # From a spec file (e.g., OpenSpec)
```

Generates functional user scenarios in Gherkin format (Given/When/Then). These describe what your app should do from a user's perspective — no technical details. When used with `--spec`, the scenarios are appended directly to the spec file.

### Step 3: Write Tests

Use the generated skills directly in conversation:

```
"Write tests for the authentication module"
"Create e2e tests from the scenarios in .claude/scenarios/authentication.feature"
"Add unit tests for the payment service"
```

The qa-test-writer skill knows your project's conventions (framework, naming, location, assertion style) and writes tests that fit.

### Step 4: Run and Analyze

```
/test                # Run all tests (or /test --changed for only modified files)
/test:coverage       # Check coverage against thresholds
/test:review         # Review test quality for anti-patterns
```

### Step 5: Deep Analysis

```
/qa:analyze          # Find coverage gaps, quality issues, untested flows
```

Scans all existing tests and produces a prioritized report of what needs attention.

### Step 6: Keep It Fresh

After making changes to your project (new modules, framework migration, etc.):

```
/qa:audit            # See what's outdated (read-only)
/qa:sync             # Regenerate outdated artifacts
```

### Step 7: Customize

```
/qa:configure        # Adjust emphasis, thresholds, conventions
```

Edit `.claude/qa-config.json` to shift testing emphasis, then `/qa:sync` to regenerate.

### Recommended Workflow

```
/qa:init                          # One-time setup
  ↓
/qa:scenarios [--spec <path>]     # Define what to test
  ↓
Write tests using skills          # Create tests from scenarios
  ↓
/test → /test:coverage → /test:review   # Run, check, review
  ↓
/qa:analyze                       # Find remaining gaps
  ↓
/qa:audit → /qa:sync              # Keep artifacts fresh after changes
```

Every command suggests the logical next step. `/qa:status` shows the single most impactful action at any time.

## Commands

| Command | What it does |
|---------|-------------|
| `/qa:init` | Detect stack, scan project, generate all QA artifacts |
| `/qa:scenarios` | Generate Gherkin user scenarios for e2e testing |
| `/qa:audit` | Read-only health check — CURRENT / OUTDATED / STALE / MISSING per artifact |
| `/qa:sync` | Regenerate outdated artifacts after project changes |
| `/qa:analyze` | Deep analysis of test quality, coverage gaps, untested flows |
| `/qa:status` | Quick dashboard with suggested next action |
| `/qa:configure` | Adjust emphasis, thresholds, conventions |

## What Gets Generated

After `/qa:init`, your `.claude/` directory gets:

### Skills
| Skill | Purpose |
|-------|---------|
| **qa-test-writer** | Writes tests following your project's conventions |
| **qa-scenario-writer** | Generates Gherkin user scenarios for e2e testing |
| **qa-use-case-identifier** | Maps routes, APIs, components to testable user flows |
| **qa-coverage-analyzer** | Interprets coverage reports, identifies meaningful gaps |
| **qa-test-reviewer** | Reviews test quality (assertions, isolation, edge cases, mocks) |

### Agents
| Agent | Purpose |
|-------|---------|
| **qa-test-runner** | Runs your test suite, parses output into structured results |
| **qa-coverage-checker** | Runs coverage, compares against thresholds |
| **qa-test-reviewer** | Automatically reviews changed test files |

### Commands
| Command | Purpose |
|---------|---------|
| `/test` | Smart test runner (all, single file, or changed files only) |
| `/test:coverage` | Coverage analysis with gap identification |
| `/test:review` | Test quality review for anti-patterns |

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

## How It Works

The plugin has two layers:

- **Meta layer** — The `/qa:*` commands that analyze your project and manage QA artifacts
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
