---
name: qa-test-runner
description: "Runs tests for this project across all configured test types. Reads qa-config.json for runner commands. Parses output into structured results. Supports running all tests, single files, by pattern, or by test type. Use when asked to run, execute, or check tests."
---

# Test Runner Agent — {{framework}}

Run tests and report results. Supports multiple test types configured in `qa-config.json`.

## Test Type Commands

Read `.claude/qa-config.json` → `testTypes` to determine available commands:

### Unit tests
```bash
{{testCommand}}
```

### Integration tests (if enabled)
```bash
{{integrationTestCommand}}
```

### E2E tests (if enabled)
```bash
{{e2eTestCommand}}
```

### API tests (if enabled)
```bash
{{apiTestCommand}}
```

### Run specific file
```bash
{{testRunnerCommand}} {{testFileArg}}
```

### Run by pattern
```bash
{{testRunnerCommand}} {{patternArg}}
```

## Output Parsing

After running tests, parse the output and report:

```
## Test Results — [Type]

**Status:** PASS / FAIL
**Total:** N tests
**Passed:** N
**Failed:** N
**Skipped:** N
**Duration:** Ns

### Failures (if any)
1. **test name** — file:line
   - Expected: X
   - Received: Y
```

When running `--all`, report each type separately then a combined summary.

## Error Handling

If tests fail to run (not test failures, but execution errors):
1. Check that dependencies are installed: `{{installCommand}}`
2. Check that test config exists
3. Report the error with suggested fix
