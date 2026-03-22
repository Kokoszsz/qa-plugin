---
description: Deep analysis of test health — scans for quality issues, coverage gaps, untested user flows, and prioritized recommendations. Does not modify files.
allowed-tools: [Read, Glob, Grep, Bash, Skill]
---

# /qa:analyze — Deep Test Health Analysis

Comprehensive analysis of test quality and coverage.

## Execution

### Step 1: Read qa-config.json

Load project configuration and stack info.

### Step 2: Scan All Tests

Read all test files in the project. For each test file, assess:
- **Assertion quality** — meaningful assertions? testing behavior or implementation?
- **Test isolation** — shared state? order dependencies?
- **Edge case coverage** — null/empty/boundary tested?
- **Mock hygiene** — minimal mocks? mocks match real behavior?
- **Naming clarity** — descriptive test names?

### Step 3: Map Coverage Gaps

Compare source files against test files:
- Which modules have zero test coverage?
- Which modules have partial coverage?
- Which critical paths lack tests?

### Step 4: Identify Untested User Flows

Using the qa-use-case-identifier skill's knowledge:
- Which user-facing routes/endpoints have no tests?
- Which business-critical flows are untested?
- Which error paths are uncovered?

### Step 5: Produce Report

```
## Test Health Analysis

### Quality Issues (N found)
1. **WARNING** src/api.test.ts:15 — Test has no assertions
2. **WARNING** src/utils.test.ts:30 — Testing implementation detail (private method)
3. **INFO** src/db.test.ts:5 — Consider using integration test instead of mocking DB

### Coverage Gaps (N modules)
| Module | Source Files | Test Files | Est. Coverage |
|--------|-------------|------------|---------------|
| src/api/ | 5 | 2 | ~40% |
| src/services/ | 3 | 0 | 0% |
| src/utils/ | 4 | 3 | ~75% |

### Untested User Flows
1. **Critical** — POST /api/checkout — no integration test
2. **High** — User registration flow — no e2e test
3. **Medium** — Password reset — no test at all

### Prioritized Recommendations
1. Add tests for src/services/ (0% coverage, business logic)
2. Add integration test for POST /api/checkout (critical flow)
3. Fix assertion-less test in src/api.test.ts
```

### Step 6: Suggest Next Step

Invoke `qa-coordinator`.
