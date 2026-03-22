#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

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
    const value = line.slice(idx + 1).trim();
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

// ---------------------------------------------------------------------------
// Main verify function
// ---------------------------------------------------------------------------

function verify(projectRoot) {
  const root = path.resolve(projectRoot);
  const claudeDir = path.join(root, '.claude');

  const errors = [];
  const warnings = [];
  const checked = [];

  // --- Check qa-config.json ---
  const configPath = path.join(claudeDir, 'qa-config.json');
  checked.push('qa-config.json');

  if (!fs.existsSync(configPath)) {
    errors.push({ file: 'qa-config.json', error: 'qa-config.json not found' });
  } else {
    try {
      const raw = fs.readFileSync(configPath, 'utf8');
      JSON.parse(raw);
    } catch (e) {
      errors.push({ file: 'qa-config.json', error: `Invalid JSON: ${e.message}` });
    }
  }

  // --- Check SKILL.md files ---
  const skillsDir = path.join(claudeDir, 'skills');
  const skillFiles = walkDir(skillsDir, '.md');
  for (const file of skillFiles) {
    const rel = path.relative(root, file);
    checked.push(rel);
    const content = fs.readFileSync(file, 'utf8');
    const fm = parseFrontmatter(content);

    if (!fm) {
      errors.push({ file: rel, error: 'Missing frontmatter (expected --- delimiters)' });
      continue;
    }
    if (!fm.name) {
      errors.push({ file: rel, error: 'Frontmatter missing required field: name' });
    }
    if (!fm.description) {
      errors.push({ file: rel, error: 'Frontmatter missing required field: description' });
    }
  }

  // --- Check COMMAND.md files ---
  const commandsDir = path.join(claudeDir, 'commands');
  const commandFiles = walkDir(commandsDir, '.md');
  for (const file of commandFiles) {
    const rel = path.relative(root, file);
    checked.push(rel);
    const content = fs.readFileSync(file, 'utf8');
    const fm = parseFrontmatter(content);

    if (!fm) {
      errors.push({ file: rel, error: 'Missing frontmatter (expected --- delimiters)' });
      continue;
    }
    if (!fm.description) {
      errors.push({ file: rel, error: 'Frontmatter missing required field: description' });
    }
  }

  // --- Check AGENT.md files ---
  const agentsDir = path.join(claudeDir, 'agents');
  const agentFiles = walkDir(agentsDir, '.md');
  for (const file of agentFiles) {
    const rel = path.relative(root, file);
    checked.push(rel);
    const content = fs.readFileSync(file, 'utf8');
    const fm = parseFrontmatter(content);

    if (!fm) {
      errors.push({ file: rel, error: 'Missing frontmatter (expected --- delimiters)' });
      continue;
    }
    if (!fm.name) {
      errors.push({ file: rel, error: 'Frontmatter missing required field: name' });
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

module.exports = { verify };
