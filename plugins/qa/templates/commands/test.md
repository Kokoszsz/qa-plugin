---
description: Run {{testRunner}} tests. Supports all tests, specific files, or changed-files-only mode.
allowed-tools: [Read, Glob, Grep, Bash, Agent]
---

# /test — Smart Test Runner

Run tests for this project using {{testRunner}}.

## Usage

- `/test` — Run all tests
- `/test [file]` — Run tests in a specific file
- `/test --changed` — Run tests only for changed files (uses git diff)

## Execution

1. Determine scope (all, file, or changed)
2. If `--changed`: run `git diff --name-only` and filter for test files matching `{{namingPattern}}`
3. Use the qa-test-runner agent to execute and parse results
4. Report structured results
5. Suggest next step via qa-coordinator
