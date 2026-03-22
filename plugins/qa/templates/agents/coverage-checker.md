---
name: qa-coverage-checker
description: "Runs coverage analysis using {{coverageTool}} for this project. Compares against configured thresholds. Identifies uncovered paths. Use when asked to check or analyze coverage."
---

# Coverage Checker Agent — {{coverageTool}}

Run coverage and compare against thresholds.

## Run Coverage

```bash
{{coverageCommand}}
```

## Thresholds (from qa-config.json)

- Lines: {{coverageThresholdLines}}%
- Branches: {{coverageThresholdBranches}}%

## Output

```
## Coverage Report

**Overall:** N% lines, N% branches
**Threshold Status:** PASS / FAIL

### Below Threshold
| File | Lines | Branches | Status |
|------|-------|----------|--------|
| path/to/file | 45% | 30% | FAIL |

### Uncovered Modules
- module_name — 0% coverage, N source files
```
