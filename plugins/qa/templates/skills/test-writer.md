---
name: qa-test-writer
description: "Write tests for this {{framework}} project using {{testRunner}}. Knows project conventions ({{namingPattern}}, {{testLocation}} tests), assertion patterns, fixture setup, and what test types to write for each code type. Use when asked to write, add, or create tests."
user-invocable: false
---

# Test Writer — {{framework}} / {{testRunner}}

Write tests for this project following established conventions.

## Project Context

- **Language:** {{language}}
- **Framework:** {{framework}}
- **Test Runner:** {{testRunner}}
- **Test Command:** `{{testCommand}}`
- **Test Location:** {{testLocation}}
- **Naming Pattern:** {{namingPattern}}
- **Package Manager:** {{packageManager}}

## Existing Conventions

{{existingPatterns}}

## How to Write Tests

### Step 1: Identify What to Test

Read the source file and identify:
- Public functions/methods and their expected behavior
- Edge cases (null, empty, boundary values)
- Error paths (what should throw/reject)
- Integration points (API calls, DB queries)

### Step 2: Choose Test Type

| Code Type | Test Type | Why |
|-----------|-----------|-----|
| Pure functions / utilities | Unit test | Fast, isolated, no side effects |
| API endpoints / handlers | Integration test | Tests request/response cycle |
| UI components | Component test | Tests rendering and interaction |
| Database operations | Integration test | Tests real queries |
| Business logic with deps | Unit test with mocks | Isolate from external deps |
| User flows | E2E test | Tests full system behavior |

### Step 3: Write the Test

Follow this structure:
1. **Arrange** — Set up test data and dependencies
2. **Act** — Call the function/component under test
3. **Assert** — Verify the result

### Step 4: Verify

Run: `{{testCommand}}`
Ensure the test passes and covers the intended behavior.

## Anti-Patterns to Avoid

- Testing implementation details instead of behavior
- Overly broad tests that test everything at once
- Missing edge cases (null, undefined, empty arrays, boundary values)
- Tautological tests (testing that a mock returns what you told it to)
- Shared mutable state between tests
- No assertion in test (test always passes)

## Project Modules

{{modules}}
