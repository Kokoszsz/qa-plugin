# QA Plugin Architecture

## Two-Layer Design

### Meta Layer
Plugin commands (`/qa:*`) that analyze projects and generate/maintain QA artifacts.

### Template Layer
Pre-built skill/agent/command templates customized per project by the meta commands.

## Data Flow

```
/qa:init
  → detect-stack.js (mechanical detection)
  → analyze-tests.js (test pattern analysis)
  → qa-scanner skill (deep AI analysis)
  → qa-scaffolder skill (template customization)
  → verify-setup.js (validation)
  → .claude/ artifacts written

/qa:sync
  → detect-stack.js + analyze-tests.js
  → qa-differ (what changed?)
  → qa-scaffolder (regenerate)
  → verify-setup.js (validate)
```

## File Conventions

### Plugin files (`plugins/qa/`)
- **Commands**: flat `.md` files in `commands/` with YAML frontmatter (`description`, `allowed-tools`)
- **Skills**: `SKILL.md` in named subdirectories under `skills/` with frontmatter (`name`, `description`, `user-invocable`)
- **Scripts**: Node.js with built-in modules only, no npm dependencies. Commands and skills call them as
  `${CLAUDE_PLUGIN_ROOT}/scripts/<name>.js`; Claude Code fills in the install path when it loads the Markdown
- **Templates**: Markdown files with `{{variable}}` placeholders, customized per project

### Generated files (the user's project, `.claude/`)
- **Skills**: `skills/qa-<name>/SKILL.md`
- **Agents**: flat `agents/qa-<name>.md` files; the frontmatter `name` matches the file name
- **Commands**: Claude Code derives a command's name from its path under `commands/` (each `/` becomes `:`),
  so `/test` is `test.md`, `/test:coverage` is `test/coverage.md` and `/test:review` is `test/review.md`
- **Config**: `qa-config.json`

## Internal Skills (not user-facing)

| Skill | Purpose | Used by |
|-------|---------|---------|
| qa-scanner | Deep project analysis | /qa:init, /qa:sync |
| qa-scaffolder | Generate artifacts from templates | /qa:init, /qa:sync |
| qa-differ | Drift detection | /qa:sync |
| qa-coordinator | Next-action suggestions | All commands |

## Scripts (not user-facing)

| Script | Purpose | Used by |
|--------|---------|---------|
| detect-stack.js | Detect language, framework, test tools | /qa:init, /qa:sync |
| analyze-tests.js | Analyze existing test patterns | /qa:init, /qa:sync |
| verify-setup.js | Validate generated artifacts | /qa:init, /qa:sync |

## Coordination System

Every command ends with a "Suggested next step" via the qa-coordinator skill.

## Testing

- **Script and consistency tests**: `npm test` — Node.js tests for detect-stack, analyze-tests and
  verify-setup, plus static checks over the plugin's own Markdown (paths, script references, removed commands)
- **Behavioral tests**: `npm run test:promptfoo` — runs promptfoo tests against Claude to validate skill quality
