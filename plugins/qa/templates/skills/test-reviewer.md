---
name: qa-test-reviewer
description: "Review test quality for this {{framework}} project. Checks for anti-patterns, assertion completeness, test isolation, edge case coverage, and {{testRunner}}-specific issues. Use when asked to review tests, check test quality, or improve test suite."
user-invocable: false
---

# Test Reviewer — {{testRunner}}

Review test quality and provide actionable feedback.

## Project Context

- **Language:** {{language}}
- **Framework:** {{framework}}
- **Test Runner:** {{testRunner}}

## Review Checklist

### 1. Assertion Quality
- [ ] Each test has at least one meaningful assertion
- [ ] Assertions test behavior, not implementation details
- [ ] Error messages are descriptive (custom matchers where appropriate)
- [ ] No tautological assertions (always-true checks)

### 2. Test Isolation
- [ ] Tests don't depend on execution order
- [ ] No shared mutable state between tests
- [ ] Proper setup/teardown (beforeEach/afterEach or equivalent)
- [ ] Database/file system state cleaned up after tests

### 3. Edge Cases
- [ ] Null/undefined/empty inputs tested
- [ ] Boundary values tested (0, -1, MAX_INT, empty string)
- [ ] Error paths tested (invalid input, network failure, timeout)
- [ ] Concurrent/race condition scenarios (where applicable)

### 4. Test Naming
- [ ] Test names describe the behavior being tested
- [ ] Test names follow project convention: {{namingPattern}}
- [ ] Describe/it blocks are organized logically

### 5. Mock Hygiene
- [ ] Mocks are minimal — only mock what you must
- [ ] Mock implementations match real behavior
- [ ] Mocks are verified (called with expected args)
- [ ] No mocking of the module under test

### 6. Performance
- [ ] No unnecessary async/await in sync tests
- [ ] Large test data generated, not hardcoded
- [ ] Slow tests isolated or marked appropriately

## Anti-Patterns to Flag

| Pattern | Problem | Fix |
|---------|---------|-----|
| No assertions | Test always passes | Add assertions for expected behavior |
| Testing private methods | Brittle, coupled to implementation | Test through public API |
| Excessive mocking | Tests prove mocks work, not code | Reduce mocks, use integration tests |
| Snapshot overuse | Snapshots hide real assertions | Add explicit assertions alongside |
| Flaky time-dependent tests | Pass/fail based on timing | Use fake timers or time abstraction |

## Output Format

```
## Test Review: [file path]

### Issues Found
1. **[Severity]** [Description] — Line N
   - **Problem:** [what's wrong]
   - **Fix:** [how to fix]

### Positive Patterns
- [thing done well]

### Summary
- Issues: N (critical: X, warning: Y, info: Z)
- Overall quality: [Good / Needs Work / Poor]
```
