---
description: Run test coverage analysis using {{coverageTool}}, compare against thresholds, and identify gaps.
allowed-tools: [Read, Glob, Grep, Bash, Agent]
---

# /test:coverage — Coverage Analysis

Run coverage and identify gaps.

## Execution

1. Use the qa-coverage-checker agent to run coverage
2. Compare against thresholds in `.claude/qa-config.json`
3. Report results with uncovered areas
4. If below threshold: suggest which modules to test first
5. Suggest next step via qa-coordinator
