---
description: View and edit QA configuration (emphasis, thresholds, conventions). Opens qa-config.json for adjustment.
allowed-tools: [Read, Write, Edit, Glob, Bash, Skill]
---

# /qa:configure — Adjust QA Preferences

View and modify QA configuration.

## Pre-flight

1. Check that `.claude/qa-config.json` exists
   - If not: "No QA setup found. Run `/qa:init` first." — Stop.

## Execution

### Step 1: Show Current Config

Read and display `.claude/qa-config.json`:

```
## Current QA Configuration

### Stack (auto-detected)
- Language: typescript
- Framework: next
- Test Runner: jest

### Emphasis (adjustable)
- Unit tests: standard
- Integration tests: standard
- E2E tests: standard
- Use cases: standard

### Conventions (adjustable)
- Test location: colocated
- Naming pattern: *.test.ts
- Fixture pattern: __fixtures__/

### Coverage Thresholds (adjustable)
- Lines: 80%
- Branches: 70%
```

### Step 2: Ask What to Change

Ask the user what they'd like to adjust. Apply changes to `qa-config.json`.

### Step 3: Suggest Next Step

"Configuration updated. Run `/qa:sync` to regenerate artifacts with the new settings."
