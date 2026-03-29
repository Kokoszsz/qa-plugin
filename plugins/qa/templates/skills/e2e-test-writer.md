---
name: qa-e2e-test-writer
description: "Write end-to-end tests for this {{framework}} project using {{e2eRunner}}. Translates Gherkin user scenarios into automated browser/UI tests. Tests complete user flows from the user's perspective. Use when asked to write e2e tests or automate user scenarios."
user-invocable: false
---

# E2E Test Writer — {{framework}} / {{e2eRunner}}

Write **end-to-end tests** that verify complete user flows from the user's perspective.

## Project Context

- **Language:** {{language}}
- **Framework:** {{framework}}
- **E2E Runner:** {{e2eRunner}}
- **E2E Command:** `{{e2eTestCommand}}`
- **Package Manager:** {{packageManager}}

## Existing Conventions

{{existingPatterns}}

## What to E2E Test

E2E tests verify **complete user flows through the real application**:

| Flow Type | E2E Test? | What to Verify |
|-----------|----------|----------------|
| User authentication (login, register, logout) | Yes | Full flow from form to authenticated state |
| Core business workflows | Yes | The main things users do (checkout, create post, etc.) |
| Multi-page flows | Yes | Navigation, state preservation across pages |
| Critical error handling | Yes | User sees correct error messages, can recover |
| Onboarding / first-use | Yes | New user can complete setup |

## Working with Gherkin Scenarios

E2E tests should be driven by user scenarios from `/qa:scenarios` or `.claude/scenarios/*.feature` files.

### Translating Gherkin to Tests

```gherkin
Scenario: Successful login with valid credentials
  Given the user is on the login page
  When the user enters valid email and password
  And the user clicks the login button
  Then the user is redirected to the dashboard
  And the user sees a welcome message
```

Becomes a test that:
1. Navigates to the login page
2. Fills in email and password fields
3. Clicks the login button
4. Asserts the URL changed to dashboard
5. Asserts a welcome message is visible

### If No Scenarios Exist

Suggest the user run `/qa:scenarios` first to generate them. You can still write e2e tests from code analysis, but scenarios ensure coverage of real user flows.

## How to Write E2E Tests

### Step 1: Identify the User Flow

What is the user trying to accomplish? Start from their perspective:
- What page/screen do they start on?
- What actions do they take?
- What do they expect to see?

### Step 2: Write the Test

1. **Navigate** — Go to the starting page
2. **Interact** — Fill forms, click buttons, select options (as a real user would)
3. **Wait** — Handle loading states, animations, network requests
4. **Assert** — Verify what the user should see (text, elements, navigation)

### Step 3: Handle Test Data

- Use seeded test data or create data as part of the test setup
- Clean up after tests (or use isolated test environments)
- Never depend on data from other tests

### Step 4: Verify

Run: `{{e2eTestCommand}}`

## Key Principles

- **Write from the user's perspective** — No CSS selectors in test names, no implementation details
- **Use accessible selectors** — Prefer `role`, `label`, `text` over CSS classes or test IDs
- **One flow per test** — Each test verifies one complete user journey
- **Independent tests** — No test depends on another test's state
- **Handle async** — Wait for elements, network calls, transitions properly

## Anti-Patterns to Avoid

- Testing implementation instead of user behavior
- Fragile selectors that break on styling changes
- Tests that depend on execution order
- Skipping error/edge case flows
- Not waiting for async operations (flaky tests)
- Testing API responses instead of what the user sees

## Project Modules

{{modules}}
