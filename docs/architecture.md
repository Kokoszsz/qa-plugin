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

/qa:audit
  → detect-stack.js + analyze-tests.js
  → qa-differ skill (drift comparison)
  → report (read-only)

/qa:sync
  → qa-differ (what changed?)
  → qa-scaffolder (regenerate)
  → verify-setup.js (validate)
```

## File Conventions

- **Commands**: flat `.md` files in `commands/` with YAML frontmatter (`description`, `allowed-tools`)
- **Skills**: `SKILL.md` in named subdirectories under `skills/` with frontmatter (`name`, `description`, `user-invocable`)
- **Agents**: `AGENT.md` in named subdirectories under `agents/` with frontmatter (`name`, `description`)
- **Scripts**: Node.js with built-in modules only, no npm dependencies
- **Templates**: Markdown files with `{{variable}}` placeholders, customized per project

## Internal Skills (not user-facing)

| Skill | Purpose | Used by |
|-------|---------|---------|
| qa-scanner | Deep project analysis | /qa:init, /qa:audit |
| qa-scaffolder | Generate artifacts from templates | /qa:init, /qa:sync |
| qa-differ | Drift detection | /qa:audit, /qa:sync |
| qa-coordinator | Next-action suggestions | All commands |

## Scripts (not user-facing)

| Script | Purpose | Used by |
|--------|---------|---------|
| detect-stack.js | Detect language, framework, test tools | /qa:init, /qa:audit, /qa:sync |
| analyze-tests.js | Analyze existing test patterns | /qa:init, /qa:audit, /qa:sync |
| verify-setup.js | Validate generated artifacts | /qa:init, /qa:sync |

## Coordination System

Every command ends with a "Suggested next step" via the qa-coordinator skill. `/qa:status` shows the single most impactful action based on current state.

## Testing

- **Script tests**: `npm test` — runs Node.js tests for detect-stack, analyze-tests, verify-setup
- **Behavioral tests**: `npm run test:promptfoo` — runs promptfoo tests against Claude to validate skill quality
