# Getting Started with the QA Plugin

## Installation

### Via Claude Code UI
1. Run `/plugin` command
2. Navigate to Marketplaces
3. Add this repository
4. Select `qa` plugin and install

### Via CLI
```
/plugin marketplace add Kokoszsz/qa-plugin
/plugin install qa@qa-plugin
```

## Usage

### First-time setup
```
/qa:init
```
This analyzes your project and generates QA infrastructure into `.claude/`.

### Check health and keep artifacts current
```
/qa:sync     # Shows what's outdated, then regenerates it after you confirm
```

### Deep analysis
```
/qa:analyze  # Find coverage gaps and quality issues
```

### Run tests
```
/test              # Run unit tests (add --integration, --e2e, --api or --all)
/test:coverage     # Coverage analysis
/test:review       # Test quality review
```

## What Gets Generated

After running `/qa:init`, your project gets:

### Skills (in `.claude/skills/`)
- `qa-use-case-identifier` — Identifies testable user flows and scenarios
- `qa-scenario-writer` — Writes Gherkin user scenarios
- `qa-coverage-analyzer` — Interprets coverage reports for your stack
- `qa-test-reviewer` — Reviews test quality with stack-specific checks
- One test-writer skill per test type you enable: `qa-test-writer` (unit), `qa-integration-test-writer`,
  `qa-e2e-test-writer`, `qa-api-test-writer`

### Agents (in `.claude/agents/`)
- `qa-test-runner.md` — Runs your test suite and parses results
- `qa-coverage-checker.md` — Runs coverage and compares against thresholds
- `qa-test-reviewer.md` — Reviews changed test files

### Commands (in `.claude/commands/`)
Claude Code names a command after its path, so:
- `test.md` — `/test`, the smart test runner
- `test/coverage.md` — `/test:coverage`, coverage analysis
- `test/review.md` — `/test:review`, test quality review

### Configuration
- `.claude/qa-config.json` — Stack detection results and preferences

## Customization

Edit `.claude/qa-config.json` to adjust:
- **Emphasis** — Shift focus between unit, integration, e2e, use cases
- **Thresholds** — Set coverage targets for lines and branches
- **Conventions** — Override detected test location and naming patterns

After editing, run `/qa:sync` to regenerate artifacts with the new settings. `/qa:sync` can also enable or
disable test types for you.

## Upgrading from 0.1.0

0.1.0 generated its commands at paths that Claude Code registered as `/test:COMMAND` instead of `/test`.
After updating the plugin, run `/qa:sync` once: it moves the old files to the new paths and keeps your edits.
