---
description: Generate functional user scenarios in Gherkin format for e2e testing. Works standalone (from code analysis) or with a specific spec file (--spec <path>) to append scenarios to it.
argument-hint: "[--spec <path>]"
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash, Skill, TodoWrite]
---

# /qa:scenarios — Generate User Scenarios

Generate non-technical, functional user scenarios in Gherkin format that serve as the basis for e2e tests.

## Usage

- `/qa:scenarios` — Analyze the project and generate scenarios for all major user flows
- `/qa:scenarios --spec <path>` — Generate scenarios for a specific spec file (e.g., OpenSpec) and append them to it

## Execution

### Step 1: Determine Mode

- If `--spec <path>` is provided: read the spec file, extract features/requirements, generate scenarios for each
- If no spec: use the qa-use-case-identifier skill to discover user flows from the codebase

### Step 2: Identify User Flows

For each feature or flow, identify:
- The actor (who performs this action?)
- The trigger (what starts this flow?)
- The happy path (what happens when everything works?)
- Error paths (what can go wrong?)
- Edge cases (boundary conditions, empty states, concurrent actions)

### Step 3: Generate Gherkin Scenarios

Use the qa-scenario-writer skill to produce Gherkin scenarios:

```gherkin
Feature: User Authentication

  Scenario: Successful login with valid credentials
    Given the user is on the login page
    When the user enters valid email and password
    And the user clicks the login button
    Then the user is redirected to the dashboard
    And the user sees a welcome message

  Scenario: Failed login with invalid password
    Given the user is on the login page
    When the user enters a valid email but wrong password
    And the user clicks the login button
    Then the user sees an error message "Invalid credentials"
    And the user remains on the login page

  Scenario: Login with unregistered email
    Given the user is on the login page
    When the user enters an unregistered email
    And the user clicks the login button
    Then the user sees an error message "Account not found"
```

### Step 4: Output

- If `--spec <path>` was provided: append the generated scenarios to the spec file under a `## User Scenarios` section
- If standalone: write scenarios to `.claude/scenarios/` as individual `.feature` files per feature area
- Display a summary of what was generated

### Step 5: Suggest Next Step

Invoke qa-coordinator. Typical suggestion: "Use the test-writer skill to create e2e tests from these scenarios."
