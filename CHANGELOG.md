# Changelog

## 0.2.0

Upgrading: run `/qa:sync` in each project set up with 0.1.0. It moves the generated commands and
agents to their new paths.

### Fixed
- Generated commands are written to `.claude/commands/test.md`, `test/coverage.md` and `test/review.md`,
  so they show up as `/test`, `/test:coverage` and `/test:review`. Agents are flat `.claude/agents/qa-*.md` files.
- Commands and skills find the plugin's scripts and templates through `${CLAUDE_PLUGIN_ROOT}` instead of guessing.
- Every `{{placeholder}}` the templates use is defined, and `verify-setup` reports leftovers.
- `verify-setup` checks only the files the plugin generates, checks required frontmatter, and flags the 0.1.0 layout.
- `detect-stack` finds sub-projects up to two folders deep, separates unit and E2E runners, and detects
  many more stacks (Python package managers, Kotlin/Java, Ruby, PHP, Elixir, Swift, Dart).
- `npm run test:promptfoo` fails when an eval fails, and its prompts use the new paths.
- Removed references to the `/qa:audit`, `/qa:status` and `/qa:configure` commands, which don't exist.

### Added
- `tests/plugin/consistency.test.js`: static checks that the plugin's Markdown, scripts and versions agree.

## 0.1.0

First release: `/qa:init`, `/qa:sync`, stack detection, test analysis and templates.
