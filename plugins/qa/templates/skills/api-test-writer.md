---
name: qa-api-test-writer
description: "Write API tests for this {{framework}} project using {{testRunner}}. Tests REST endpoints, GraphQL resolvers, and API contracts. Validates request/response cycles, status codes, payloads, headers, and error responses. Use when asked to write API tests or test endpoints."
user-invocable: false
---

# API Test Writer — {{framework}} / {{testRunner}}

Write **API tests** that verify endpoint behavior, contracts, and error handling.

## Project Context

- **Language:** {{language}}
- **Framework:** {{framework}}
- **Test Runner:** {{testRunner}}
- **API Test Command:** `{{apiTestCommand}}`
- **Package Manager:** {{packageManager}}

## Existing Conventions

{{existingPatterns}}

## What to API Test

API tests verify **endpoint behavior from the HTTP/request level**:

| Endpoint Type | What to Verify |
|--------------|----------------|
| REST endpoints (GET, POST, PUT, DELETE) | Status codes, response body, headers |
| GraphQL queries/mutations | Response shape, error handling, field resolution |
| Authentication endpoints | Token issuance, validation, refresh, rejection |
| File upload/download | Multipart handling, streaming, content types |
| Pagination / filtering | Correct page sizes, filter application, ordering |
| Rate-limited endpoints | Correct 429 responses, retry-after headers |

## How to Write API Tests

### Step 1: Map the Endpoint

For each endpoint, identify:
- HTTP method and path (or GraphQL operation)
- Required and optional parameters
- Authentication requirements
- Expected response schema
- Error responses

### Step 2: Write Test Cases

For each endpoint, cover:

| Category | Example |
|----------|---------|
| **Happy path** | Valid request → correct response + status |
| **Validation** | Missing required field → 400 with error details |
| **Authentication** | No token → 401; invalid token → 401; expired → 401 |
| **Authorization** | Wrong role → 403 |
| **Not found** | Invalid ID → 404 |
| **Edge cases** | Empty body, max-length strings, special characters |

### Step 3: Write the Test

1. **Set up** — Prepare test data, authentication tokens
2. **Request** — Make the HTTP/GraphQL call with specific inputs
3. **Assert status** — Verify the HTTP status code
4. **Assert body** — Verify the response payload structure and values
5. **Assert headers** — Verify content-type, cache headers, etc. (when relevant)
6. **Assert side effects** — Verify state changes (for POST/PUT/DELETE)

### Step 4: Verify

Run: `{{apiTestCommand}}`

## Key Principles

- **Test the contract** — What does the API promise? Test that.
- **Test at the HTTP boundary** — Send real HTTP requests, don't call handlers directly (that's a unit test)
- **Cover error responses thoroughly** — Users hit errors more often than happy paths
- **Validate response schemas** — Ensure the shape matches what clients expect
- **Independent tests** — Each test creates its own data, no shared state

## Anti-Patterns to Avoid

- Calling controller methods directly instead of making HTTP requests
- Only testing happy paths
- Not testing authentication/authorization
- Hardcoded IDs or data that may not exist
- Ignoring response headers and status codes
- Tests that mutate shared data without cleanup

## Project Modules

{{modules}}
