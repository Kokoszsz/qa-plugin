---
name: qa-integration-test-writer
description: "Write integration tests for this {{framework}} project using {{testRunner}}. Tests real interactions between components: database queries, service-to-service calls, message queues, external API clients. Use when asked to write integration tests or test component interactions."
user-invocable: false
---

# Integration Test Writer — {{framework}} / {{testRunner}}

Write **integration tests** that verify real interactions between components.

## Project Context

- **Language:** {{language}}
- **Framework:** {{framework}}
- **Test Runner:** {{testRunner}}
- **Test Command:** `{{integrationTestCommand}}`
- **Package Manager:** {{packageManager}}

## Existing Conventions

{{existingPatterns}}

## What to Integration Test

Integration tests verify that **components work together correctly**:

| Code Type | Integration Test? | What to Verify |
|-----------|------------------|----------------|
| DB repositories / DAOs | Yes | Queries return correct data, transactions work |
| Service layer with DB | Yes | Business logic + persistence together |
| External API clients | Yes | HTTP calls, serialization, error handling |
| Message queue producers/consumers | Yes | Messages sent/received correctly |
| Cache layer | Yes | Cache hits, misses, invalidation |
| Auth middleware + service | Yes | Token validation, role checks end-to-end |

## How to Write Integration Tests

### Step 1: Identify the Integration Boundary

Determine which components interact:
- What calls what?
- What external systems are involved (DB, API, cache, queue)?
- What state needs to be set up beforehand?

### Step 2: Set Up Test Infrastructure

Depending on the integration:
- **Database:** Use test database, run migrations, seed data. Clean up after each test.
- **External APIs:** Use test servers, recorded responses, or sandbox environments. Only mock when the external system is truly unavailable.
- **Message queues:** Use embedded/in-memory queue or test instance.
- **Cache:** Use test cache instance, flush between tests.

### Step 3: Write the Test

1. **Set up** — Prepare the database/external state
2. **Execute** — Run the real operation (no mocks for the integration boundary)
3. **Verify** — Check the result AND the side effects (DB state, messages sent, etc.)
4. **Clean up** — Reset state for the next test

### Step 4: Verify

Run: `{{integrationTestCommand}}`

## Key Principles

- **Use real dependencies at the integration boundary** — Don't mock the thing you're testing
- **Isolate tests from each other** — Each test sets up and tears down its own state
- **Test the contract, not internals** — Verify inputs and outputs at the boundary
- **Handle test data carefully** — Use factories/fixtures, never share mutable state

## Anti-Patterns to Avoid

- Mocking the very dependency you're trying to integration-test
- Tests that depend on execution order
- Using production databases or external services
- Not cleaning up test data (tests leak state)
- Testing too many layers at once (that's an e2e test)

## Project Modules

{{modules}}
