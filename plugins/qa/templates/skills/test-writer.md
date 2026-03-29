---
name: qa-test-writer
description: "Write unit tests for this {{framework}} project using {{testRunner}}. Knows project conventions ({{namingPattern}}, {{testLocation}} tests), assertion patterns, fixture setup. Focuses on isolated, fast unit tests for pure functions, utilities, and business logic. Use when asked to write, add, or create unit tests."
user-invocable: false
---

# Unit Test Writer — {{framework}} / {{testRunner}}

Write **unit tests** for this project following established conventions.

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

## What to Unit Test

Unit tests cover **isolated logic with no external dependencies**:

| Code Type | Unit Test? | Why |
|-----------|-----------|-----|
| Pure functions / utilities | Yes | Fast, no side effects, easy to test |
| Business logic (with deps mocked) | Yes | Isolate from external systems |
| Data transformations / mappers | Yes | Deterministic input → output |
| Validation logic | Yes | Clear expected behavior |
| API endpoints / handlers | No → use API tests | Needs request/response cycle |
| Database operations | No → use integration tests | Needs real DB |
| User flows | No → use E2E tests | Needs full system |

## How to Write Unit Tests

### Step 1: Identify What to Test

Read the source file and identify:
- Public functions/methods and their expected behavior
- Edge cases (null, empty, boundary values)
- Error paths (what should throw/reject)
- Branching logic (if/else, switch)

### Step 2: Write the Test

Follow this structure:
1. **Arrange** — Set up test data and mock dependencies
2. **Act** — Call the function under test
3. **Assert** — Verify the result

### Step 3: Verify

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
