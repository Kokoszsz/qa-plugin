#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

// ---------------------------------------------------------------------------
// What /qa:init generates (paths are relative to the project's .claude/)
// ---------------------------------------------------------------------------

// Claude Code names a command after its path under .claude/commands/ ("/"
// becomes ":"), and an agent or skill after its frontmatter name, which the
// other QA files use to refer to it.
const BASE_ARTIFACTS = [
  { path: 'skills/qa-use-case-identifier/SKILL.md', kind: 'skill', name: 'qa-use-case-identifier' },
  { path: 'skills/qa-scenario-writer/SKILL.md', kind: 'skill', name: 'qa-scenario-writer' },
  { path: 'skills/qa-coverage-analyzer/SKILL.md', kind: 'skill', name: 'qa-coverage-analyzer' },
  { path: 'skills/qa-test-reviewer/SKILL.md', kind: 'skill', name: 'qa-test-reviewer' },
  { path: 'agents/qa-test-runner.md', kind: 'agent', name: 'qa-test-runner' },
  { path: 'agents/qa-coverage-checker.md', kind: 'agent', name: 'qa-coverage-checker' },
  { path: 'agents/qa-test-reviewer.md', kind: 'agent', name: 'qa-test-reviewer' },
  { path: 'commands/test.md', kind: 'command' },
  { path: 'commands/test/coverage.md', kind: 'command' },
  { path: 'commands/test/review.md', kind: 'command' },
];

// One test-writer skill per test type enabled in qa-config.json
const TEST_TYPE_SKILLS = {
  unit: { path: 'skills/qa-test-writer/SKILL.md', kind: 'skill', name: 'qa-test-writer' },
  integration: { path: 'skills/qa-integration-test-writer/SKILL.md', kind: 'skill', name: 'qa-integration-test-writer' },
  e2e: { path: 'skills/qa-e2e-test-writer/SKILL.md', kind: 'skill', name: 'qa-e2e-test-writer' },
  api: { path: 'skills/qa-api-test-writer/SKILL.md', kind: 'skill', name: 'qa-api-test-writer' },
};

// Paths written by 0.1.0, and why each one is wrong
const LEGACY_PATHS = [
  { path: 'commands/test/COMMAND.md', newPath: 'commands/test.md', problem: 'Claude Code registers it as /test:COMMAND, not /test' },
  { path: 'commands/test-coverage/COMMAND.md', newPath: 'commands/test/coverage.md', problem: 'Claude Code registers it as /test-coverage:COMMAND, not /test:coverage' },
  { path: 'commands/test-review/COMMAND.md', newPath: 'commands/test/review.md', problem: 'Claude Code registers it as /test-review:COMMAND, not /test:review' },
  { path: 'agents/qa-test-runner/AGENT.md', newPath: 'agents/qa-test-runner.md', problem: 'agents are flat files now' },
  { path: 'agents/qa-coverage-checker/AGENT.md', newPath: 'agents/qa-coverage-checker.md', problem: 'agents are flat files now' },
  { path: 'agents/qa-test-reviewer/AGENT.md', newPath: 'agents/qa-test-reviewer.md', problem: 'agents are flat files now' },
];

const REQUIRED_FIELDS = {
  skill: ['name', 'description'],
  agent: ['name', 'description'], // Claude Code skips an agent that has no description
  command: ['description'],
};

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const raw = match[1];
  const result = {};
  for (const line of raw.split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
    result[key] = value;
  }
  return result;
}

function walkDir(dir, ext) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full, ext));
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

// Names of the {{placeholders}} the plugin's templates use. Flagging only
// these leaves other {{ }} text alone, such as Vue or Jinja examples.
function templateVariables() {
  const names = new Set();
  for (const file of walkDir(TEMPLATES_DIR, '.md')) {
    for (const m of fs.readFileSync(file, 'utf8').matchAll(/\{\{(\w+)\}\}/g)) {
      names.add(m[1]);
    }
  }
  return names;
}

// Map of placeholder name -> first line it appears on
function findPlaceholders(content, isPlaceholder) {
  const found = new Map();
  content.split(/\r?\n/).forEach((line, i) => {
    for (const m of line.matchAll(/\{\{(\w+)\}\}/g)) {
      if (isPlaceholder(m[1]) && !found.has(m[1])) found.set(m[1], i + 1);
    }
  });
  return found;
}

// Every {{placeholder}} left in a string value of qa-config.json, with its key
function configPlaceholders(value, keyPath, out = []) {
  if (typeof value === 'string') {
    for (const m of value.matchAll(/\{\{\w+\}\}/g)) out.push({ key: keyPath, placeholder: m[0] });
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => configPlaceholders(item, `${keyPath}[${i}]`, out));
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      configPlaceholders(item, keyPath ? `${keyPath}.${key}` : key, out);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Main verify function
// ---------------------------------------------------------------------------

// Checks only the files /qa:init generates. Everything else in .claude/ (the
// user's own skills, their support files, other commands) is left alone.
function verify(projectRoot) {
  const root = path.resolve(projectRoot);
  const claudeDir = path.join(root, '.claude');
  const display = relPath => `.claude/${relPath}`;

  const errors = [];
  const warnings = [];
  const checked = [];

  // --- Check qa-config.json ---
  const configFile = display('qa-config.json');
  const configPath = path.join(claudeDir, 'qa-config.json');
  checked.push(configFile);

  if (!fs.existsSync(configPath)) {
    errors.push({ file: configFile, error: 'qa-config.json not found. Run /qa:init to set up QA.' });
    return { valid: false, errors, warnings, checked };
  }

  let config = null;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    errors.push({ file: configFile, error: `Invalid JSON: ${e.message}` });
  }

  const artifacts = [...BASE_ARTIFACTS];
  if (config) {
    for (const { key, placeholder } of configPlaceholders(config, '')) {
      errors.push({ file: configFile, error: `Unfilled placeholder ${placeholder} at ${key}` });
    }
    if (!config.stack || typeof config.stack !== 'object') {
      warnings.push({ file: configFile, warning: 'No "stack" section, so /qa:sync has nothing to compare the detected stack against' });
    }

    const testTypes = config.testTypes;
    if (!testTypes || typeof testTypes !== 'object') {
      warnings.push({ file: configFile, warning: 'No "testTypes" section, so the per-type test-writer skills were not checked' });
    } else {
      for (const [type, skill] of Object.entries(TEST_TYPE_SKILLS)) {
        const settings = testTypes[type];
        if (settings && settings.enabled === true) {
          artifacts.push(skill);
          if (typeof settings.command !== 'string' || !settings.command.trim()) {
            errors.push({ file: configFile, error: `testTypes.${type} is enabled but has no command` });
          }
        } else if (fs.existsSync(path.join(claudeDir, skill.path))) {
          artifacts.push(skill);
          warnings.push({
            file: display(skill.path),
            warning: `testTypes.${type} isn't enabled in qa-config.json, so nothing uses this skill. Enable ${type} tests with /qa:sync or delete it.`,
          });
        }
      }
    }
  }

  // --- Check each generated artifact ---
  const known = templateVariables();
  const isTemplateVariable = name => known.size === 0 || known.has(name);

  for (const artifact of artifacts) {
    const file = display(artifact.path);
    const fullPath = path.join(claudeDir, artifact.path);
    checked.push(file);

    if (!fs.existsSync(fullPath)) {
      errors.push({ file, error: `Missing ${artifact.kind}. /qa:init generates it; /qa:sync restores it.` });
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const fm = parseFrontmatter(content);
    if (!fm) {
      errors.push({ file, error: 'Missing frontmatter (expected --- delimiters)' });
    } else {
      for (const field of REQUIRED_FIELDS[artifact.kind]) {
        if (!fm[field]) {
          errors.push({ file, error: `Frontmatter missing required field: ${field}` });
        }
      }
      if (artifact.name && fm.name && fm.name !== artifact.name) {
        errors.push({ file, error: `Frontmatter name is "${fm.name}" but must be "${artifact.name}", the name other QA files use for it` });
      }
    }

    for (const [name, line] of findPlaceholders(content, isTemplateVariable)) {
      errors.push({ file, error: `Unfilled template placeholder {{${name}}} on line ${line}` });
    }
  }

  // --- Check for the 0.1.0 layout ---
  for (const legacy of LEGACY_PATHS) {
    if (fs.existsSync(path.join(claudeDir, legacy.path))) {
      const file = display(legacy.path);
      checked.push(file);
      errors.push({ file, error: `0.1.0 layout: ${legacy.problem}. Move it to ${display(legacy.newPath)} (/qa:sync does this).` });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    checked,
  };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

if (require.main === module) {
  const args = process.argv.slice(2);
  let projectRoot = process.cwd();
  let jsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project-root' && args[i + 1]) {
      projectRoot = args[++i];
    } else if (args[i] === '--json') {
      jsonOutput = true;
    }
  }

  try {
    const result = verify(projectRoot);

    if (jsonOutput) {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    } else {
      if (result.valid) {
        console.log('Setup is valid.');
      } else {
        console.log('Setup has issues:');
      }
      for (const err of result.errors) {
        console.log(`  ERROR: [${err.file}] ${err.error}`);
      }
      for (const warn of result.warnings) {
        console.log(`  WARN: [${warn.file}] ${warn.warning}`);
      }
      console.log(`Checked: ${result.checked.join(', ')}`);
    }

    process.exit(result.valid ? 0 : 1);
  } catch (err) {
    if (jsonOutput) {
      process.stdout.write(JSON.stringify({ valid: false, errors: [{ file: '', error: err.message }], warnings: [], checked: [] }, null, 2) + '\n');
    } else {
      console.error(`Script error: ${err.message}`);
    }
    process.exit(2);
  }
}

// ---------------------------------------------------------------------------
// Exports for programmatic use
// ---------------------------------------------------------------------------

module.exports = { verify, BASE_ARTIFACTS, TEST_TYPE_SKILLS, LEGACY_PATHS };
