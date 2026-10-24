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

function frontmatter(fields, body = '# Body\n') {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${value}`);
  return ['---', ...lines, '---', body].join('\n');
}

const TYPE_SKILLS = {
  unit: 'qa-test-writer',
  integration: 'qa-integration-test-writer',
  e2e: 'qa-e2e-test-writer',
  api: 'qa-api-test-writer',
};

// Writes a complete setup the way /qa:init generates it. `enabled` lists the
// test types switched on in qa-config.json; their test-writer skills are
// written too.
function writeValidSetup(dir, enabled = ['unit']) {
  const testTypes = {};
  for (const type of Object.keys(TYPE_SKILLS)) {
    testTypes[type] = enabled.includes(type)
      ? { enabled: true, runner: 'jest', command: 'npm test' }
      : { enabled: false, runner: null, command: null };
  }
  writeFile(dir, '.claude/qa-config.json', JSON.stringify({
    stack: { language: 'typescript', framework: 'next', testRunner: 'jest' },
    testTypes,
    coverage: { tool: 'jest', thresholds: { lines: 80, branches: 70 } },
  }, null, 2));

  const skills = ['qa-use-case-identifier', 'qa-scenario-writer', 'qa-coverage-analyzer', 'qa-test-reviewer'];
  for (const type of enabled) skills.push(TYPE_SKILLS[type]);
  for (const name of skills) {
    writeFile(dir, `.claude/skills/${name}/SKILL.md`, frontmatter({ name, description: `${name} for this Next.js app` }));
  }
  for (const name of ['qa-test-runner', 'qa-coverage-checker', 'qa-test-reviewer']) {
    writeFile(dir, `.claude/agents/${name}.md`, frontmatter({ name, description: `${name} for this Next.js app` }));
  }
  for (const file of ['test.md', 'test/coverage.md', 'test/review.md']) {
    writeFile(dir, `.claude/commands/${file}`, frontmatter({ description: `Runs ${file}` }));
  }
}

// ---------------------------------------------------------------------------
// Test 1: Valid setup — every generated artifact present and well-formed
// ---------------------------------------------------------------------------
(function testValidSetup() {
  const dir = makeTempDir('valid');
  try {
    writeValidSetup(dir);

    const { code, result } = runVerifyWithExit(dir);

    assert(result.valid === true, 'Valid setup: valid is true');
    assert(result.errors.length === 0, 'Valid setup: no errors');
    assert(result.checked.includes('.claude/commands/test/coverage.md'), 'Valid setup: checked lists /test:coverage file');
    assert(result.checked.includes('.claude/agents/qa-test-runner.md'), 'Valid setup: checked lists the flat agent file');
    assert(result.checked.includes('.claude/skills/qa-test-writer/SKILL.md'), 'Valid setup: checked lists the unit test-writer skill');
    assert(code === 0, 'Valid setup: exit code is 0');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 2: Missing frontmatter in a generated skill
// ---------------------------------------------------------------------------
(function testMissingFrontmatterInSkill() {
  const dir = makeTempDir('no-frontmatter');
  try {
    writeValidSetup(dir);
    writeFile(dir, '.claude/skills/qa-test-reviewer/SKILL.md', [
      '# No Frontmatter Here',
      'This skill file has no YAML frontmatter.'
    ].join('\n'));

    const { code, result } = runVerifyWithExit(dir);

    assert(result.valid === false, 'Missing frontmatter: valid is false');
    const hasError = result.errors.some(e => /frontmatter/i.test(e.error) && /qa-test-reviewer/.test(e.file));
    assert(hasError, 'Missing frontmatter: error names the file and mentions frontmatter');
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
    writeValidSetup(dir);
    fs.rmSync(path.join(dir, '.claude', 'qa-config.json'));

    const { code, result } = runVerifyWithExit(dir);

    assert(result.valid === false, 'Missing qa-config: valid is false');
    const hasConfigError = result.errors.some(e => /qa-config/i.test(e.error) || /qa-config/i.test(e.file));
    assert(hasConfigError, 'Missing qa-config: error references qa-config');
    assert(result.errors.length === 1, 'Missing qa-config: reported as a single error, not one per artifact');
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
    writeValidSetup(dir);
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
    writeValidSetup(dir);

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
// Test 6: Files the plugin didn't generate are ignored (the user's own
// skills, their support files, other commands). Reporting them sent Claude
// off to "fix" unrelated files.
// ---------------------------------------------------------------------------
(function testIgnoresNonQaFiles() {
  const dir = makeTempDir('foreign');
  try {
    writeValidSetup(dir);
    writeFile(dir, '.claude/skills/my-skill/SKILL.md', frontmatter({ name: 'my-skill', description: 'Mine' }));
    writeFile(dir, '.claude/skills/my-skill/references/notes.md', '# Notes without frontmatter');
    writeFile(dir, '.claude/skills/qa-test-writer/references/examples.md', '# Support file without frontmatter');
    writeFile(dir, '.claude/commands/deploy.md', '# A user command without frontmatter');
    writeFile(dir, '.claude/agents/helper.md', '# A user agent without frontmatter');

    const { code, result } = runVerifyWithExit(dir);

    assert(result.valid === true, 'Foreign files: setup is still valid');
    assert(result.errors.length === 0, 'Foreign files: no errors reported');
    assert(!result.checked.some(f => /my-skill|references|deploy|helper/.test(f)), 'Foreign files: not in the checked list');
    assert(code === 0, 'Foreign files: exit code is 0');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 7: Agent without a description (Claude Code skips such agents)
// ---------------------------------------------------------------------------
(function testAgentNeedsDescription() {
  const dir = makeTempDir('agent-desc');
  try {
    writeValidSetup(dir);
    writeFile(dir, '.claude/agents/qa-coverage-checker.md', frontmatter({ name: 'qa-coverage-checker' }));

    const { result } = runVerifyWithExit(dir);

    assert(result.valid === false, 'Agent description: valid is false');
    assert(
      result.errors.some(e => /qa-coverage-checker\.md$/.test(e.file) && /description/.test(e.error)),
      'Agent description: error names the agent and the missing field',
    );
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 8: Leftover template placeholders are errors; other {{ }} text in a
// generated file (e.g. a Vue template example) is not
// ---------------------------------------------------------------------------
(function testLeftoverPlaceholders() {
  const dir = makeTempDir('placeholders');
  try {
    writeValidSetup(dir);
    writeFile(dir, '.claude/agents/qa-test-runner.md', frontmatter(
      { name: 'qa-test-runner', description: 'Runs tests' },
      '## Run one file\n```bash\n{{testRunnerCommand}} {{testFileArg}}\n```\n\nVue example: <p>{{ message }}</p> and {{greeting}}\n',
    ));

    const { result } = runVerifyWithExit(dir);
    const placeholderErrors = result.errors.filter(e => /qa-test-runner\.md$/.test(e.file));

    assert(result.valid === false, 'Placeholders: valid is false');
    assert(placeholderErrors.some(e => e.error.includes('{{testRunnerCommand}}')), 'Placeholders: reports {{testRunnerCommand}}');
    assert(placeholderErrors.some(e => e.error.includes('{{testFileArg}}')), 'Placeholders: reports {{testFileArg}}');
    assert(!placeholderErrors.some(e => /message|greeting/.test(e.error)), 'Placeholders: ignores {{ }} text that is not a template variable');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 9: Placeholder left in qa-config.json
// ---------------------------------------------------------------------------
(function testPlaceholderInConfig() {
  const dir = makeTempDir('config-placeholder');
  try {
    writeValidSetup(dir);
    const configPath = path.join(dir, '.claude', 'qa-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config.conventions = { fixturePattern: '{{fixturePattern}}' };
    fs.writeFileSync(configPath, JSON.stringify(config));

    const { result } = runVerifyWithExit(dir);

    assert(result.valid === false, 'Config placeholder: valid is false');
    assert(
      result.errors.some(e => /qa-config\.json$/.test(e.file) && e.error.includes('{{fixturePattern}}') && e.error.includes('conventions.fixturePattern')),
      'Config placeholder: error names the placeholder and its key',
    );
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 10: 0.1.0 layout (test/COMMAND.md registers as /test:COMMAND)
// ---------------------------------------------------------------------------
(function testLegacyLayout() {
  const dir = makeTempDir('legacy');
  try {
    writeValidSetup(dir);
    writeFile(dir, '.claude/commands/test-coverage/COMMAND.md', frontmatter({ description: 'Old coverage command' }));
    writeFile(dir, '.claude/agents/qa-test-runner/AGENT.md', frontmatter({ name: 'qa-test-runner', description: 'Old agent' }));

    const { result } = runVerifyWithExit(dir);

    assert(result.valid === false, 'Legacy layout: valid is false');
    assert(
      result.errors.some(e => /test-coverage\/COMMAND\.md$/.test(e.file) && /test-coverage:COMMAND/.test(e.error) && /test\/coverage\.md/.test(e.error)),
      'Legacy layout: command error explains the wrong name and the new path',
    );
    assert(
      result.errors.some(e => /qa-test-runner\/AGENT\.md$/.test(e.file) && /agents\/qa-test-runner\.md/.test(e.error)),
      'Legacy layout: agent error gives the new path',
    );
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 11: A base artifact is missing
// ---------------------------------------------------------------------------
(function testMissingBaseArtifact() {
  const dir = makeTempDir('missing-base');
  try {
    writeValidSetup(dir);
    fs.rmSync(path.join(dir, '.claude', 'commands', 'test', 'review.md'));

    const { result } = runVerifyWithExit(dir);

    assert(result.valid === false, 'Missing base artifact: valid is false');
    assert(
      result.errors.some(e => e.file === '.claude/commands/test/review.md' && /missing/i.test(e.error)),
      'Missing base artifact: error names the missing /test:review file',
    );
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 12: An enabled test type needs its skill and a command
// ---------------------------------------------------------------------------
(function testEnabledTestTypes() {
  const dir = makeTempDir('test-types');
  try {
    writeValidSetup(dir, ['unit', 'api']);
    fs.rmSync(path.join(dir, '.claude', 'skills', 'qa-api-test-writer'), { recursive: true });
    const configPath = path.join(dir, '.claude', 'qa-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config.testTypes.unit.command = '';
    fs.writeFileSync(configPath, JSON.stringify(config));

    const { result } = runVerifyWithExit(dir);

    assert(result.valid === false, 'Test types: valid is false');
    assert(
      result.errors.some(e => e.file === '.claude/skills/qa-api-test-writer/SKILL.md' && /missing/i.test(e.error)),
      'Test types: missing skill for the enabled api type is an error',
    );
    assert(
      result.errors.some(e => /qa-config\.json$/.test(e.file) && /testTypes\.unit/.test(e.error) && /command/.test(e.error)),
      'Test types: enabled unit type without a command is an error',
    );
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 13: Frontmatter name must match the file, or references like
// "use the qa-test-runner agent" point at nothing
// ---------------------------------------------------------------------------
(function testNameMatchesFile() {
  const dir = makeTempDir('name-mismatch');
  try {
    writeValidSetup(dir);
    writeFile(dir, '.claude/agents/qa-test-runner.md', frontmatter({ name: 'test-runner', description: 'Runs tests' }));

    const { result } = runVerifyWithExit(dir);

    assert(result.valid === false, 'Name mismatch: valid is false');
    assert(
      result.errors.some(e => /qa-test-runner\.md$/.test(e.file) && /test-runner/.test(e.error) && /qa-test-runner/.test(e.error)),
      'Name mismatch: error gives the actual and expected name',
    );
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 14: Warnings — config without testTypes, and a test-writer skill for a
// type that isn't enabled
// ---------------------------------------------------------------------------
(function testWarnings() {
  const dir = makeTempDir('warnings');
  try {
    writeValidSetup(dir);
    writeFile(dir, '.claude/skills/qa-e2e-test-writer/SKILL.md', frontmatter({ name: 'qa-e2e-test-writer', description: 'E2E tests' }));

    let { result } = runVerifyWithExit(dir);
    assert(result.valid === true, 'Warnings: an extra test-writer skill alone keeps the setup valid');
    assert(
      result.warnings.some(w => /qa-e2e-test-writer/.test(w.file) && /e2e/.test(w.warning)),
      'Warnings: skill for a disabled test type is a warning',
    );

    const configPath = path.join(dir, '.claude', 'qa-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    delete config.testTypes;
    fs.writeFileSync(configPath, JSON.stringify(config));

    ({ result } = runVerifyWithExit(dir));
    assert(result.warnings.some(w => /testTypes/.test(w.warning)), 'Warnings: config without testTypes is a warning');
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
