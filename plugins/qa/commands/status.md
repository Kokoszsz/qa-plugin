---
description: Quick QA health dashboard showing artifact freshness, test health summary, and single most impactful next action.
allowed-tools: [Read, Glob, Grep, Bash, Skill]
---

# /qa:status — QA Health Dashboard

Quick snapshot of QA infrastructure health.

## Pre-flight

1. Check that `.claude/qa-config.json` exists
   - If not: "No QA setup found. Run `/qa:init` to get started." — Stop.

## Execution

### Step 1: Read State

- Read `.claude/qa-config.json` for last sync timestamp and stack info
- Count test files in project
- Check artifact file modification dates vs. source file dates

### Step 2: Quick Health Check

Run a lightweight version of the differ (just check file existence and timestamps, not deep content comparison).

### Step 3: Display Dashboard

```
## QA Status

### Setup
- Plugin version: 0.1.0
- Last init/sync: 2026-03-22
- Stack: typescript / next / jest

### Artifacts
- Skills: 4/4 present
- Agents: 3/3 present
- Commands: 3/3 present
- Freshness: CURRENT (or: 2 OUTDATED)

### Tests
- Test files: 15
- Test naming: *.test.ts

---
**Suggested next step:** Everything looks good. Run `/qa:audit` for a detailed check.
```
