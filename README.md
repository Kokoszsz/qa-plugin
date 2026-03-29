# QA Plugin for Claude Code

A Claude Code plugin that analyzes any project and generates tailored QA testing infrastructure into `.claude/`.

## Installation

```
/plugin marketplace add Kokoszsz/qa-plugin
/plugin install qa@qa-plugin
```

## Quick Start

```
/qa:init                    # One-time setup — detects stack, picks test types, generates everything
/qa:scenarios               # Generate Gherkin user scenarios
"Write unit tests for X"    # Use generated skills to write tests
/test                       # Run tests
/qa:analyze                 # Find gaps
/qa:sync                    # Keep artifacts fresh after changes
```

## How It Works

### 1. Initialize (`/qa:init`)

Run once per project. Init will:
- Detect your language, framework, test runner, coverage tool
- Scan your code for modules, controllers, repositories, UI routes
- **Recommend test types** based on what it finds (unit, integration, e2e, API)
- **Ask you to confirm** which test types you want
- Generate project-specific skills, agents, and commands into `.claude/`

If your project has no code yet, init generates base skills only. Run `/qa:sync` later when you have code.

If you run `/qa:init` again, it tells you to use `/qa:sync` instead.

### 2. Generate Scenarios (`/qa:scenarios`)

```
/qa:scenarios                        # From code analysis
/qa:scenarios --spec docs/auth.md    # From a spec file (e.g., OpenSpec)
```

Produces Gherkin scenarios (Given/When/Then) describing what your app does from the user's perspective. These feed into e2e test writing.

### 3. Write Tests

Talk to Claude naturally — the generated skills handle the rest:

```
"Write unit tests for the payment service"
"Create integration tests for the user repository"
"Write e2e tests from .claude/scenarios/authentication.feature"
"Add API tests for the /api/orders endpoints"
```

Each skill knows your project's conventions (framework, naming, location, assertion style).

### 4. Run Tests (`/test`)

```
/test                    # Unit tests (default)
/test --integration      # Integration tests
/test --e2e              # E2E tests
/test --api              # API tests
/test --all              # All enabled types
/test --changed          # Only changed files
/test:coverage           # Coverage against thresholds
/test:review             # Test quality review
```

### 5. Analyze (`/qa:analyze`)

Deep test health check — finds coverage gaps, quality issues, untested flows. Prioritizes what to test next.

### 6. Keep Fresh (`/qa:sync`)

Run after project changes (new modules, framework migration, dependency updates). Sync will:
- Re-detect your stack and compare against saved config
- Show what's outdated, stale, or missing
- Suggest enabling new test types if it detects new signals (e.g., new controllers → API tests)
- Regenerate affected artifacts after your confirmation

## Commands

| Command | Purpose |
|---------|---------|
| `/qa:init` | One-time setup — detect stack, select test types, generate artifacts |
| `/qa:scenarios` | Generate Gherkin user scenarios for e2e testing |
| `/qa:sync` | Check health, update config, regenerate outdated artifacts |
| `/qa:analyze` | Deep analysis of test coverage gaps and quality issues |

## What Gets Generated

### Skills

**Always generated:**
- **qa-use-case-identifier** — Maps code to testable user flows
- **qa-scenario-writer** — Generates Gherkin scenarios
- **qa-coverage-analyzer** — Interprets coverage reports
- **qa-test-reviewer** — Reviews test quality

**Per selected test type:**
- **qa-test-writer** — Unit tests (if unit selected)
- **qa-integration-test-writer** — Integration tests (if integration selected)
- **qa-e2e-test-writer** — E2E tests from Gherkin scenarios (if e2e selected)
- **qa-api-test-writer** — API endpoint tests (if API selected)

### Agents

- **qa-test-runner** — Runs tests across all enabled types
- **qa-coverage-checker** — Runs coverage, compares against thresholds
- **qa-test-reviewer** — Reviews changed test files

### Commands

- `/test` — Run tests with `--integration`, `--e2e`, `--api`, `--all`, `--changed` flags
- `/test:coverage` — Coverage analysis
- `/test:review` — Test quality review

## Supported Stacks

TypeScript, JavaScript, Python, Go, Rust, Java, Ruby, PHP, Elixir, Swift, Dart — with framework-specific detection for Next.js, React, Vue, Angular, Svelte, Express, NestJS, Django, Flask, FastAPI, Rails, Spring Boot, and more.

## Contributing

```bash
npm test                       # Script tests (68 assertions)
npm run test:promptfoo         # Behavioral tests (requires ANTHROPIC_API_KEY)
npm run test:promptfoo:init    # Init tests only
npm run test:promptfoo:sync    # Sync tests only
npm run test:promptfoo:coordinator  # Coordinator tests only
npm run test:promptfoo:view    # View results in browser
```

## License

MIT
