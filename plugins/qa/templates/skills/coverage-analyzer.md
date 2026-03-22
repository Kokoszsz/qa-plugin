---
name: qa-coverage-analyzer
description: "Analyze test coverage for this {{framework}} project using {{coverageTool}}. Interprets coverage reports, identifies meaningful gaps, and suggests improvement strategies. Use when asked about coverage, gaps, or untested code."
user-invocable: false
---

# Coverage Analyzer — {{coverageTool}}

Interpret and improve test coverage for this project.

## Project Context

- **Language:** {{language}}
- **Test Runner:** {{testRunner}}
- **Coverage Tool:** {{coverageTool}}
- **Thresholds:** Lines: {{coverageThresholdLines}}%, Branches: {{coverageThresholdBranches}}%

## How to Run Coverage

```bash
{{coverageCommand}}
```

## How to Analyze Coverage

### Step 1: Run Coverage Report

Execute the coverage command and read the output.

### Step 2: Identify Meaningful Gaps

Not all uncovered code is equally important. Prioritize:

**Must cover:**
- Business logic and calculations
- Error handling paths
- Security-related code (auth, validation, sanitization)
- Data transformations and mappings

**Nice to cover:**
- Utility functions
- Configuration code
- Middleware

**Skip covering:**
- Type definitions / interfaces
- Re-exports / barrel files
- Framework boilerplate
- Generated code

### Step 3: Recommend Improvements

For each significant gap:
1. Identify which module is uncovered
2. Suggest specific test type (unit/integration/e2e)
3. Suggest specific test cases
4. Estimate coverage improvement from adding tests

## Project Modules

{{modules}}
