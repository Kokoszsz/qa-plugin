# Getting Started with the QA Plugin

## Installation

### Via Claude Code UI
1. Run `/plugin` command
2. Navigate to Marketplaces
3. Add this repository
4. Select `qa` plugin and install

### Via CLI
```
/plugin marketplace add <your-github-username>/qa-plugin
/plugin install qa@qa-plugin
```

## Usage

### First-time setup
```
/qa:init
```
This analyzes your project and generates QA infrastructure into `.claude/`.

### Check health
```
/qa:status
```

### After project changes
```
/qa:audit    # See what's outdated
/qa:sync     # Regenerate outdated artifacts
```

### Deep analysis
```
/qa:analyze  # Find coverage gaps and quality issues
```

### Run tests
```
/test              # Run all tests
/test:coverage     # Coverage analysis
/test:review       # Test quality review
```

### Customize
```
/qa:configure      # Adjust emphasis, thresholds, conventions
```

## What Gets Generated

After running `/qa:init`, your project gets:

### Skills (in `.claude/skills/`)
- `qa-test-writer` — Knows how to write tests for your specific project
- `qa-use-case-identifier` — Identifies testable user flows and scenarios
- `qa-coverage-analyzer` — Interprets coverage reports for your stack
- `qa-test-reviewer` — Reviews test quality with stack-specific checks

### Agents (in `.claude/agents/`)
- `qa-test-runner` — Runs your test suite and parses results
- `qa-coverage-checker` — Runs coverage and compares against thresholds
- `qa-test-reviewer` — Automatically reviews changed test files

### Commands (in `.claude/commands/`)
- `/test` — Smart test runner
- `/test:coverage` — Coverage analysis
- `/test:review` — Test quality review

### Configuration
- `.claude/qa-config.json` — Stack detection results and preferences

## Customization

Edit `.claude/qa-config.json` to adjust:
- **Emphasis** — Shift focus between unit, integration, e2e, use cases
- **Thresholds** — Set coverage targets for lines and branches
- **Conventions** — Override detected test location and naming patterns

After editing, run `/qa:sync` to regenerate artifacts with the new settings.
