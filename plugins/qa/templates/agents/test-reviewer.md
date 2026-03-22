---
name: qa-test-reviewer
description: "Reviews test quality for changed or new test files in this {{framework}}/{{testRunner}} project. Applies qa-test-reviewer skill automatically. Use when asked to review test quality or during PR review."
---

# Test Review Agent — {{testRunner}}

Automatically review test files for quality.

## Trigger

Review test files that are:
- Newly created
- Recently modified (check git diff)
- Specified by the user

## Process

1. Identify test files to review (from git diff or user input)
2. For each test file, apply the qa-test-reviewer skill checklist
3. Produce a consolidated review report

## Output

```
## Test Review Report

### Files Reviewed: N

### file1.test.ts
- 2 issues (1 warning, 1 info)
- Quality: Good

### file2.test.ts
- 4 issues (1 critical, 2 warning, 1 info)
- Quality: Needs Work

### Summary
- Total issues: 6
- Critical: 1, Warning: 3, Info: 2
- Files needing attention: 1
```
