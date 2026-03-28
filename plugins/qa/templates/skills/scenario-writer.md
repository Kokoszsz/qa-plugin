---
name: qa-scenario-writer
description: "Generate functional user scenarios in Gherkin format for this {{framework}} project. Translates features and user flows into Given/When/Then scenarios for e2e testing. Use when asked to create scenarios, user stories, or acceptance criteria."
user-invocable: false
---

# Scenario Writer — {{framework}}

Generate Gherkin user scenarios from features, specs, or code analysis.

## Project Context

- **Language:** {{language}}
- **Framework:** {{framework}}
- **E2E Runner:** {{e2eRunner}}

## How to Write Scenarios

### Principles

1. **Write from the user's perspective** — No technical implementation details. "User sees a welcome message" not "Component renders WelcomeMessage with props."
2. **One behavior per scenario** — Each scenario tests one specific thing. If you're using "And" more than twice, consider splitting.
3. **Cover the triangle** — For every happy path, write at least one error path and one edge case.
4. **Be specific** — "User enters 'john@example.com'" not "User enters an email." Use concrete examples.
5. **Independent scenarios** — Each scenario must work in isolation. No dependencies between scenarios.

### Structure

```gherkin
Feature: [Business capability]
  As a [role]
  I want to [action]
  So that [benefit]

  Background:
    Given [common precondition for all scenarios in this feature]

  Scenario: [Specific behavior being tested]
    Given [precondition / initial state]
    When [action taken by user]
    Then [expected outcome]

  Scenario Outline: [Parameterized scenario]
    Given the user has <role> permissions
    When the user tries to <action>
    Then the result is <outcome>

    Examples:
      | role    | action         | outcome        |
      | admin   | delete user    | success        |
      | viewer  | delete user    | access denied  |
```

### Scenario Categories

For each feature, generate scenarios in these categories:

| Category | Description | Example |
|----------|-------------|---------|
| **Happy path** | Everything works as expected | Successful checkout |
| **Validation** | Invalid input handling | Empty required field |
| **Authorization** | Permission checks | Non-admin accessing admin page |
| **Error handling** | System/external failures | Payment gateway timeout |
| **Edge cases** | Boundary conditions | Cart with 0 items, max quantity |
| **State transitions** | Moving between states | Draft → Published → Archived |

### From Spec Files

When working with a spec file (OpenSpec or similar):
1. Read each feature/requirement from the spec
2. Identify the actors and flows described
3. Generate scenarios that cover the acceptance criteria
4. Append scenarios under a `## User Scenarios` heading in the spec

### From Code Analysis

When no spec is provided:
1. Use route/endpoint discovery to find user-facing features
2. Read component/handler code to understand the flows
3. Check for validation rules, error handling, auth checks
4. Generate scenarios that cover what the code actually does

## Anti-Patterns to Avoid

- Testing implementation instead of behavior ("Database record is created" vs "User sees confirmation")
- Scenarios that depend on each other's state
- Too many steps in a single scenario (max 7-8 steps)
- Vague assertions ("User sees the page" — what specifically?)
- Ignoring unhappy paths

## Project Modules

{{modules}}
