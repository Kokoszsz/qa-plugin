---
description: "Run tests for this project. Supports unit (default), integration, e2e, API, or all test types. Use flags to select type."
argument-hint: "[file] [--integration] [--e2e] [--api] [--all] [--changed]"
allowed-tools: [Read, Glob, Grep, Bash, Agent]
---

# /test — Smart Test Runner

Run tests for this project using the configured test runners.

## Usage

- `/test` — Run unit tests (default)
- `/test [file]` — Run tests in a specific file
- `/test --changed` — Run tests only for changed files (uses git diff)
- `/test --integration` — Run integration tests
- `/test --e2e` — Run e2e tests
- `/test --api` — Run API tests
- `/test --all` — Run all enabled test types

## Execution

1. Read `.claude/qa-config.json` to get enabled test types and their commands
2. Determine scope from flags:
   - No flag → unit tests using `testTypes.unit.command`
   - `--integration` → `testTypes.integration.command`
   - `--e2e` → `testTypes.e2e.command`
   - `--api` → `testTypes.api.command`
   - `--all` → run each enabled type sequentially
   - `--changed` → run unit tests only for files changed in git diff, filtered by `{{namingPattern}}`
   - `[file]` → run that specific test file
3. If the requested test type is not enabled in config: "Test type [type] is not enabled. Run `/qa:configure` to enable it."
4. Use the qa-test-runner agent to execute and parse results
5. Report structured results
6. Suggest next step via qa-coordinator
