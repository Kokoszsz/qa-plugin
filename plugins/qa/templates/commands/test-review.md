---
description: Review test quality for changed or specified test files. Checks for anti-patterns, missing assertions, and test isolation issues.
allowed-tools: [Read, Glob, Grep, Bash, Agent]
---

# /test:review — Test Quality Review

Review test files for quality and best practices.

## Execution

1. Determine which test files to review:
   - If file specified: review that file
   - Otherwise: review test files changed in current branch (git diff against main)
2. Use the qa-test-reviewer agent to review each file
3. Report consolidated review
4. Suggest next step via qa-coordinator
