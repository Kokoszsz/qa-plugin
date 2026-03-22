---
name: qa-scanner
description: "Deep project analysis engine for QA setup. Scans project structure, identifies modules, entry points, API endpoints, components, business logic layers, and testing opportunities. Use when initializing or auditing QA infrastructure."
user-invocable: false
---

# QA Scanner — Project Analysis Engine

Analyze the target project to produce a structured report that the qa-scaffolder skill uses to generate project-specific QA artifacts.

## When This Skill Is Invoked

This skill is called by the `/qa:init`, `/qa:audit`, and `/qa:sync` commands. It receives pre-computed output from `detect-stack.js` and `analyze-tests.js` as context.

## Workflow

### Phase 1: Receive Script Output

You will receive JSON from two scripts:
- **Stack detection** — language, framework, test runner, coverage tool, CI, package manager
- **Test analysis** — existing test files, patterns, conventions, counts

### Phase 2: Deep Project Scan

Using the script output as a starting point, perform a deeper analysis:

1. **Module mapping** — Identify logical modules/packages in the project
   - Read the project's directory structure
   - Identify entry points (main files, route handlers, exported modules)
   - Map dependencies between modules

2. **Code classification** — For each module, classify the code type:
   - API endpoints / route handlers
   - UI components / pages
   - Business logic / services
   - Data access / models
   - Utility functions / helpers
   - Configuration / middleware
   - Type definitions / interfaces

3. **Testing opportunity analysis** — For each module:
   - What types of tests are appropriate (unit, integration, e2e)?
   - What are the key behaviors to test?
   - What are the critical paths and edge cases?
   - What dependencies need mocking?

4. **Existing test gap analysis** (if tests exist):
   - Which modules have tests?
   - Which modules lack tests?
   - What's the estimated coverage per module?
   - Are existing tests following good patterns?

### Phase 3: Produce Report

Output a structured report with these sections:

```
## Project Report

### Stack
{ language, framework, testRunner, coverageTool, ci, packageManager }

### Modules
- module_name: { path, type, entryPoints, dependencies, testStatus }

### Testing Opportunities
- High priority: [modules with no tests + high complexity]
- Medium priority: [modules with partial tests]
- Low priority: [well-tested modules or simple utilities]

### Existing Test Patterns (if tests exist)
- Naming convention: *.test.ts
- Location: colocated / separate
- Assertion style: expect/assert
- Mock patterns: jest.mock / manual
- Fixture patterns: __fixtures__ / inline

### Recommendations
- Suggested test framework (if none exists)
- Suggested directory structure
- Key areas to focus testing effort
```

## Critical Rules

1. **Read actual code** — Do not guess module structure. Read directory listings and key files.
2. **Be specific** — "The /api/users endpoint handles CRUD operations" not "there are API endpoints."
3. **Prioritize by risk** — Complex business logic > simple getters. External integrations > internal utilities.
4. **Respect existing patterns** — If the project has tests, document their conventions. Don't recommend replacing them.
5. **Stay read-only** — This skill produces a report. It does NOT modify any files.
