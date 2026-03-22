#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');

const SCRIPT = path.resolve(__dirname, '..', '..', 'plugins', 'qa', 'scripts', 'verify-setup.js');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`PASS: ${message}`);
    passed++;
  } else {
    console.error(`FAIL: ${message}`);
    failed++;
  }
}

function makeTempDir(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `verify-setup-test-${label}-`));
  return dir;
}

function writeFile(dir, name, content) {
  const filePath = path.join(dir, name);
  const parentDir = path.dirname(filePath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

function runVerify(projectRoot) {
  const cmd = `node "${SCRIPT}" --project-root "${projectRoot}" --json`;
  const output = execSync(cmd, { encoding: 'utf8', timeout: 10000 });
  return JSON.parse(output.trim());
}

function runVerifyWithExit(projectRoot) {
  try {
    const cmd = `node "${SCRIPT}" --project-root "${projectRoot}" --json`;
    const output = execSync(cmd, { encoding: 'utf8', timeout: 10000 });
    return { code: 0, result: JSON.parse(output.trim()) };
  } catch (err) {
    const output = (err.stdout || '').trim();
    let result = null;
    try { result = JSON.parse(output); } catch { /* ignore */ }
    return { code: err.status, result };
  }
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Test 1: Valid setup — SKILL.md, COMMAND.md, qa-config.json all correct
// ---------------------------------------------------------------------------
(function testValidSetup() {
  const dir = makeTempDir('valid');
  try {
    writeFile(dir, '.claude/qa-config.json', JSON.stringify({
      language: 'typescript',
      testRunner: 'jest'
    }));
    writeFile(dir, '.claude/skills/SKILL.md', [
      '---',
      'name: Run Tests',
      'description: Runs the test suite',
      '---',
      '# Run Tests',
      'Execute all unit tests.'
    ].join('\n'));
    writeFile(dir, '.claude/commands/COMMAND.md', [
      '---',
      'description: Lint the codebase',
      '---',
      '# Lint',
      'Run the linter.'
    ].join('\n'));

    const { code, result } = runVerifyWithExit(dir);

    assert(result.valid === true, 'Valid setup: valid is true');
    assert(result.errors.length === 0, 'Valid setup: no errors');
    assert(result.checked.length > 0, 'Valid setup: checked list is non-empty');
    assert(code === 0, 'Valid setup: exit code is 0');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 2: Missing frontmatter in SKILL.md
// ---------------------------------------------------------------------------
(function testMissingFrontmatterInSkill() {
  const dir = makeTempDir('no-frontmatter');
  try {
    writeFile(dir, '.claude/qa-config.json', JSON.stringify({ language: 'go' }));
    writeFile(dir, '.claude/skills/SKILL.md', [
      '# No Frontmatter Here',
      'This skill file has no YAML frontmatter.'
    ].join('\n'));

    const { code, result } = runVerifyWithExit(dir);

    assert(result.valid === false, 'Missing frontmatter: valid is false');
    assert(result.errors.length > 0, 'Missing frontmatter: has errors');
    const hasError = result.errors.some(e => /frontmatter/i.test(e.error) || /name/i.test(e.error));
    assert(hasError, 'Missing frontmatter: error mentions frontmatter or name');
    assert(code === 1, 'Missing frontmatter: exit code is 1');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 3: Missing qa-config.json
// ---------------------------------------------------------------------------
(function testMissingQaConfig() {
  const dir = makeTempDir('no-config');
  try {
    writeFile(dir, '.claude/skills/SKILL.md', [
      '---',
      'name: Some Skill',
      'description: Does something',
      '---',
      '# Skill'
    ].join('\n'));

    const { code, result } = runVerifyWithExit(dir);

    assert(result.valid === false, 'Missing qa-config: valid is false');
    const hasConfigError = result.errors.some(e => /qa-config/i.test(e.error) || /qa-config/i.test(e.file));
    assert(hasConfigError, 'Missing qa-config: error references qa-config');
    assert(code === 1, 'Missing qa-config: exit code is 1');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 4: Invalid JSON in qa-config.json
// ---------------------------------------------------------------------------
(function testInvalidJsonInQaConfig() {
  const dir = makeTempDir('bad-json');
  try {
    writeFile(dir, '.claude/qa-config.json', '{ this is not valid json!!!');

    const { code, result } = runVerifyWithExit(dir);

    assert(result.valid === false, 'Invalid JSON: valid is false');
    const hasJsonError = result.errors.some(e => /json/i.test(e.error) || /parse/i.test(e.error));
    assert(hasJsonError, 'Invalid JSON: error mentions JSON or parse');
    assert(code === 1, 'Invalid JSON: exit code is 1');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 5: Programmatic API
// ---------------------------------------------------------------------------
(function testProgrammaticAPI() {
  const { verify } = require(SCRIPT);
  assert(typeof verify === 'function', 'Programmatic: verify is exported as a function');

  const dir = makeTempDir('api');
  try {
    writeFile(dir, '.claude/qa-config.json', JSON.stringify({ language: 'python' }));
    writeFile(dir, '.claude/skills/SKILL.md', [
      '---',
      'name: Test Skill',
      'description: A test skill',
      '---',
      '# Test'
    ].join('\n'));

    const result = verify(dir);
    assert(result.valid === true, 'Programmatic: verify() returns valid result');
    assert(Array.isArray(result.errors), 'Programmatic: result has errors array');
    assert(Array.isArray(result.warnings), 'Programmatic: result has warnings array');
    assert(Array.isArray(result.checked), 'Programmatic: result has checked array');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
if (failed > 0) {
  process.exit(1);
}
