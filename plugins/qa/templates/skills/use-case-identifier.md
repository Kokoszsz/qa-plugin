---
name: qa-use-case-identifier
description: "Identify testable use cases, user flows, and acceptance criteria for this {{framework}} project. Maps routes, components, and API endpoints to real user scenarios. Use when asked to identify what to test, find gaps, or create test plans."
user-invocable: false
---

# Use Case Identifier — {{framework}}

Discover and document testable scenarios from the project's code.

## Project Context

- **Language:** {{language}}
- **Framework:** {{framework}}

## How to Identify Use Cases

### Step 1: Map Entry Points

Scan the project for user-facing entry points:
- **Routes/pages** — Each route represents a user flow
- **API endpoints** — Each endpoint represents a capability
- **CLI commands** — Each command is a use case
- **Event handlers** — User interactions (click, submit, etc.)

### Step 2: Trace User Flows

For each entry point, trace the flow:
1. What triggers this flow? (user action, scheduled task, API call)
2. What inputs does it accept?
3. What processing happens?
4. What outputs/side effects does it produce?
5. What can go wrong? (validation errors, auth failures, data conflicts)

### Step 3: Define Acceptance Criteria

For each use case, write acceptance criteria:
- **Happy path:** Given valid input, when action is performed, then expected result
- **Error paths:** Given invalid input, when action is performed, then appropriate error
- **Edge cases:** Given boundary/unusual input, when action is performed, then graceful handling

### Step 4: Prioritize

Rate each use case:
- **Critical** — Core business logic, payment flows, auth
- **High** — Frequently used features, data mutations
- **Medium** — Secondary features, read-only operations
- **Low** — Admin features, rarely used paths

## Output Format

```
## Use Case: [Name]
**Entry point:** [route/endpoint/component]
**Trigger:** [user action or event]
**Priority:** [Critical/High/Medium/Low]

### Acceptance Criteria
- [ ] Given [context], when [action], then [result]
- [ ] Given [error condition], when [action], then [error handling]

### Suggested Tests
- Unit: [specific function to test]
- Integration: [API endpoint or flow to test]
- E2E: [user scenario to test]
```

## Project Modules

{{modules}}
