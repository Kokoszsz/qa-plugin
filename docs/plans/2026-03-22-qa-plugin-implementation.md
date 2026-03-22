# QA Plugin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Claude Code plugin (`qa`) that analyzes projects and generates tailored QA infrastructure into `.claude/`.

**Architecture:** Two-layer plugin — meta commands (init/audit/sync/analyze/status/configure) that use internal skills to customize template skills/agents/commands per project. Scripts handle mechanical detection. promptfoo validates everything.

**Tech Stack:** Claude Code plugin system (marketplace.json, plugin.json, SKILL.md, commands), Node.js built-in modules for scripts, promptfoo for testing.

---

## Corrected Directory Structure

```
qa-plugin/
├── .claude-plugin/
│   └── marketplace.json
├── plugins/qa/
│   ├── .claude-plugin/
│   │   └── plugin.json
│   ├── commands/
│   │   ├── init.md
│   │   ├── audit.md
│   │   ├── sync.md
│   │   ├── analyze.md
│   │   ├── status.md
│   │   └── configure.md
│   ├── skills/
│   │   ├── qa-scanner/SKILL.md
│   │   ├── qa-scaffolder/SKILL.md
│   │   ├── qa-differ/SKILL.md
│   │   └── qa-coordinator/SKILL.md
│   ├── templates/
│   │   ├── skills/
│   │   │   ├── test-writer.md
│   │   │   ├── use-case-identifier.md
│   │   │   ├── coverage-analyzer.md
│   │   │   └── test-reviewer.md
│   │   ├── agents/
│   │   │   ├── test-runner.md
│   │   │   ├── coverage-checker.md
│   │   │   └── test-reviewer.md
│   │   └── commands/
│   │       ├── test.md
│   │       ├── test-coverage.md
│   │       └── test-review.md
│   ├── scripts/
│   │   ├── detect-stack.js
│   │   ├── analyze-tests.js
│   │   └── verify-setup.js
│   └── hooks/
│       └── hooks.json
├── tests/
│   ├── promptfooconfig.yaml
│   └── skills/
│       ├── init.test.yaml
│       ├── audit.test.yaml
│       ├── sync.test.yaml
│       ├── analyze.test.yaml
│       ├── status.test.yaml
│       └── configure.test.yaml
├── docs/
│   ├── getting-started.md
│   └── architecture.md
├── package.json
└── README.md
```

---

### Task 1: Initialize Git Repository and Plugin Scaffold

**Files:**
- Create: `.claude-plugin/marketplace.json`
- Create: `plugins/qa/.claude-plugin/plugin.json`
- Create: `plugins/qa/hooks/hooks.json`
- Create: `package.json`

**Step 1: Initialize git repo**

Run: `git init`
Expected: Initialized empty Git repository

**Step 2: Create package.json**

```json
{
  "name": "qa-plugin",
  "version": "0.1.0",
  "description": "Claude Code plugin for comprehensive AI QA testing setup",
  "private": true,
  "engines": {
    "node": ">=16"
  }
}
```

**Step 3: Create marketplace.json**

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "qa-plugin",
  "description": "Marketplace for AI QA testing automation. Install to get tools that analyze projects and generate tailored QA infrastructure.",
  "owner": {
    "name": "your-github-username"
  },
  "plugins": [
    {
      "name": "qa",
      "source": "./plugins/qa"
    }
  ]
}
```

**Step 4: Create plugin.json**

```json
{
  "name": "qa",
  "description": "Skills, commands, and hooks for analyzing projects and generating comprehensive QA testing infrastructure. Scaffolds test-writing skills, coverage analysis, use-case identification, and test review into any project's .claude/ directory.",
  "version": "0.1.0",
  "author": {
    "name": "your-github-username"
  }
}
```

**Step 5: Create hooks.json (minimal — no auto-triggers)**

```json
{
  "hooks": {}
}
```

**Step 6: Create .gitignore**

```
node_modules/
.env
.promptfoo/
```

**Step 7: Commit**

```bash
git add .claude-plugin/ plugins/qa/.claude-plugin/ plugins/qa/hooks/ package.json .gitignore
git commit -m "feat: initialize qa plugin scaffold with marketplace and plugin config"
```

---

### Task 2: Build `detect-stack.js` Script

**Files:**
- Create: `plugins/qa/scripts/detect-stack.js`

**Step 1: Write the test for detect-stack**

Create `tests/scripts/detect-stack.test.js`:

```javascript
#!/usr/bin/env node
'use strict';

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

function createTempProject(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-test-'));
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(dir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
  return dir;
}

function runDetect(projectRoot) {
  const script = path.resolve(__dirname, '../../plugins/qa/scripts/detect-stack.js');
  const output = execSync(`node "${script}" --project-root "${projectRoot}" --json`, {
    encoding: 'utf-8'
  });
  return JSON.parse(output);
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// Test: Node.js + TypeScript + Jest project
{
  const dir = createTempProject({
    'package.json': JSON.stringify({
      name: 'test-project',
      devDependencies: {
        jest: '^29.0.0',
        typescript: '^5.0.0',
        '@types/jest': '^29.0.0'
      },
      scripts: { test: 'jest' }
    }),
    'tsconfig.json': '{}',
    'jest.config.ts': 'export default { preset: "ts-jest" };',
    'src/index.ts': 'export const main = () => {};',
    'src/__tests__/index.test.ts': 'test("works", () => {});'
  });
  const result = runDetect(dir);
  console.assert(result.language === 'typescript', `Expected typescript, got ${result.language}`);
  console.assert(result.testRunner === 'jest', `Expected jest, got ${result.testRunner}`);
  console.assert(result.framework === null || result.framework === undefined || typeof result.framework === 'string', 'Framework should be null/undefined or string');
  console.assert(result.testCommand === 'jest' || result.testCommand === 'npm test', `Unexpected testCommand: ${result.testCommand}`);
  cleanup(dir);
  console.log('PASS: Node.js + TypeScript + Jest detection');
}

// Test: Python + pytest project
{
  const dir = createTempProject({
    'requirements.txt': 'pytest>=7.0\nflask>=2.0\n',
    'setup.py': 'from setuptools import setup; setup(name="myapp")',
    'pytest.ini': '[pytest]\ntestpaths = tests\n',
    'src/app.py': 'from flask import Flask',
    'tests/test_app.py': 'def test_app(): pass'
  });
  const result = runDetect(dir);
  console.assert(result.language === 'python', `Expected python, got ${result.language}`);
  console.assert(result.testRunner === 'pytest', `Expected pytest, got ${result.testRunner}`);
  cleanup(dir);
  console.log('PASS: Python + pytest detection');
}

// Test: Go project
{
  const dir = createTempProject({
    'go.mod': 'module example.com/myapp\n\ngo 1.21\n',
    'main.go': 'package main\nfunc main() {}',
    'handler_test.go': 'package main\nimport "testing"\nfunc TestHandler(t *testing.T) {}'
  });
  const result = runDetect(dir);
  console.assert(result.language === 'go', `Expected go, got ${result.language}`);
  console.assert(result.testRunner === 'go test', `Expected "go test", got ${result.testRunner}`);
  cleanup(dir);
  console.log('PASS: Go detection');
}

// Test: Empty project
{
  const dir = createTempProject({});
  const result = runDetect(dir);
  console.assert(result.language === null || result.language === 'unknown', `Expected null/unknown, got ${result.language}`);
  cleanup(dir);
  console.log('PASS: Empty project detection');
}

console.log('\nAll detect-stack tests passed.');
```

**Step 2: Run test to verify it fails**

Run: `node tests/scripts/detect-stack.test.js`
Expected: FAIL with "Cannot find module" or similar

**Step 3: Write detect-stack.js**

```javascript
#!/usr/bin/env node
/**
 * detect-stack.js
 * Mechanically detects project tech stack by reading config files.
 *
 * Usage:
 *   node detect-stack.js --project-root <path> [--json]
 *
 * Output: JSON object with detected stack info:
 *   { language, framework, testRunner, testCommand, coverageTool, ci, packageManager }
 *
 * Exit codes: 0 = success, 2 = script error
 * Uses only Node.js built-in modules. No npm install required.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

function parseArgs(argv) {
  const args = { projectRoot: process.cwd(), json: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--project-root' && argv[i + 1]) {
      args.projectRoot = path.resolve(argv[++i]);
    } else if (argv[i] === '--json') {
      args.json = true;
    }
  }
  return args;
}

function fileExists(root, ...segments) {
  return fs.existsSync(path.join(root, ...segments));
}

function readFileOr(root, filePath, fallback) {
  try {
    return fs.readFileSync(path.join(root, filePath), 'utf-8');
  } catch {
    return fallback;
  }
}

function readJsonOr(root, filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, filePath), 'utf-8'));
  } catch {
    return fallback;
  }
}

function detectLanguage(root) {
  if (fileExists(root, 'tsconfig.json')) return 'typescript';
  if (fileExists(root, 'package.json')) return 'javascript';
  if (fileExists(root, 'go.mod')) return 'go';
  if (fileExists(root, 'Cargo.toml')) return 'rust';
  if (fileExists(root, 'requirements.txt') || fileExists(root, 'setup.py') ||
      fileExists(root, 'pyproject.toml') || fileExists(root, 'Pipfile')) return 'python';
  if (fileExists(root, 'pom.xml') || fileExists(root, 'build.gradle') ||
      fileExists(root, 'build.gradle.kts')) return 'java';
  if (fileExists(root, 'mix.exs')) return 'elixir';
  if (fileExists(root, 'Gemfile')) return 'ruby';
  if (fileExists(root, 'Package.swift')) return 'swift';
  if (fileExists(root, 'composer.json')) return 'php';
  return null;
}

function detectFramework(root, language) {
  if (language === 'typescript' || language === 'javascript') {
    const pkg = readJsonOr(root, 'package.json', {});
    const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    if (allDeps.next) return 'next';
    if (allDeps.nuxt) return 'nuxt';
    if (allDeps['@angular/core']) return 'angular';
    if (allDeps.svelte || allDeps['@sveltejs/kit']) return 'svelte';
    if (allDeps.vue) return 'vue';
    if (allDeps.react && !allDeps.next) return 'react';
    if (allDeps.express) return 'express';
    if (allDeps.fastify) return 'fastify';
    if (allDeps.nestjs || allDeps['@nestjs/core']) return 'nestjs';
    return null;
  }
  if (language === 'python') {
    const reqs = readFileOr(root, 'requirements.txt', '') +
                 readFileOr(root, 'setup.py', '') +
                 readFileOr(root, 'pyproject.toml', '');
    if (reqs.includes('django')) return 'django';
    if (reqs.includes('flask')) return 'flask';
    if (reqs.includes('fastapi')) return 'fastapi';
    return null;
  }
  if (language === 'ruby') {
    const gemfile = readFileOr(root, 'Gemfile', '');
    if (gemfile.includes('rails')) return 'rails';
    return null;
  }
  return null;
}

function detectTestRunner(root, language) {
  if (language === 'typescript' || language === 'javascript') {
    const pkg = readJsonOr(root, 'package.json', {});
    const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    if (allDeps.vitest || fileExists(root, 'vitest.config.ts') || fileExists(root, 'vitest.config.js')) return 'vitest';
    if (allDeps.jest || fileExists(root, 'jest.config.ts') || fileExists(root, 'jest.config.js') || fileExists(root, 'jest.config.mjs')) return 'jest';
    if (allDeps.mocha) return 'mocha';
    if (allDeps['@playwright/test']) return 'playwright';
    if (allDeps.cypress) return 'cypress';
    return null;
  }
  if (language === 'python') {
    const reqs = readFileOr(root, 'requirements.txt', '') +
                 readFileOr(root, 'setup.py', '') +
                 readFileOr(root, 'pyproject.toml', '');
    if (reqs.includes('pytest')) return 'pytest';
    if (fileExists(root, 'pytest.ini') || fileExists(root, 'setup.cfg')) return 'pytest';
    return 'unittest';
  }
  if (language === 'go') return 'go test';
  if (language === 'rust') return 'cargo test';
  if (language === 'java') {
    if (fileExists(root, 'pom.xml')) {
      const pom = readFileOr(root, 'pom.xml', '');
      if (pom.includes('junit-jupiter')) return 'junit5';
      if (pom.includes('junit')) return 'junit4';
    }
    return 'junit5';
  }
  if (language === 'ruby') return 'rspec';
  if (language === 'elixir') return 'exunit';
  if (language === 'php') return 'phpunit';
  return null;
}

function detectTestCommand(root, language, testRunner) {
  if (language === 'typescript' || language === 'javascript') {
    const pkg = readJsonOr(root, 'package.json', {});
    if (pkg.scripts && pkg.scripts.test) return pkg.scripts.test;
    if (testRunner === 'vitest') return 'npx vitest';
    if (testRunner === 'jest') return 'npx jest';
    if (testRunner === 'playwright') return 'npx playwright test';
    if (testRunner === 'cypress') return 'npx cypress run';
    return null;
  }
  if (language === 'python') return testRunner === 'pytest' ? 'pytest' : 'python -m unittest discover';
  if (language === 'go') return 'go test ./...';
  if (language === 'rust') return 'cargo test';
  if (language === 'java') return fileExists(root, 'gradlew') ? './gradlew test' : 'mvn test';
  if (language === 'ruby') return 'bundle exec rspec';
  if (language === 'elixir') return 'mix test';
  if (language === 'php') return 'vendor/bin/phpunit';
  return null;
}

function detectCoverageTool(root, language) {
  if (language === 'typescript' || language === 'javascript') {
    const pkg = readJsonOr(root, 'package.json', {});
    const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    if (allDeps['@vitest/coverage-v8'] || allDeps['@vitest/coverage-istanbul']) return 'vitest-coverage';
    if (allDeps['istanbul'] || allDeps['nyc'] || allDeps['c8']) return 'istanbul';
    return 'istanbul';
  }
  if (language === 'python') return 'coverage.py';
  if (language === 'go') return 'go cover';
  if (language === 'rust') return 'tarpaulin';
  if (language === 'java') return 'jacoco';
  return null;
}

function detectCI(root) {
  if (fileExists(root, '.github/workflows')) return 'github-actions';
  if (fileExists(root, '.gitlab-ci.yml')) return 'gitlab-ci';
  if (fileExists(root, 'Jenkinsfile')) return 'jenkins';
  if (fileExists(root, '.circleci')) return 'circleci';
  if (fileExists(root, '.travis.yml')) return 'travis';
  if (fileExists(root, 'azure-pipelines.yml')) return 'azure-devops';
  if (fileExists(root, 'bitbucket-pipelines.yml')) return 'bitbucket';
  return null;
}

function detectPackageManager(root, language) {
  if (language === 'typescript' || language === 'javascript') {
    if (fileExists(root, 'pnpm-lock.yaml')) return 'pnpm';
    if (fileExists(root, 'yarn.lock')) return 'yarn';
    if (fileExists(root, 'bun.lockb') || fileExists(root, 'bun.lock')) return 'bun';
    if (fileExists(root, 'package-lock.json')) return 'npm';
    return 'npm';
  }
  if (language === 'python') {
    if (fileExists(root, 'Pipfile.lock')) return 'pipenv';
    if (fileExists(root, 'poetry.lock')) return 'poetry';
    if (fileExists(root, 'uv.lock')) return 'uv';
    return 'pip';
  }
  if (language === 'ruby') return 'bundler';
  if (language === 'elixir') return 'hex';
  if (language === 'php') return 'composer';
  return null;
}

function detect(root) {
  const language = detectLanguage(root);
  const framework = language ? detectFramework(root, language) : null;
  const testRunner = language ? detectTestRunner(root, language) : null;
  const testCommand = language ? detectTestCommand(root, language, testRunner) : null;
  const coverageTool = language ? detectCoverageTool(root, language) : null;
  const ci = detectCI(root);
  const packageManager = language ? detectPackageManager(root, language) : null;

  return { language, framework, testRunner, testCommand, coverageTool, ci, packageManager };
}

if (require.main === module) {
  const args = parseArgs(process.argv);
  try {
    const result = detect(args.projectRoot);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(2);
  }
}

module.exports = { detect };
```

**Step 4: Run test to verify it passes**

Run: `node tests/scripts/detect-stack.test.js`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add plugins/qa/scripts/detect-stack.js tests/scripts/detect-stack.test.js
git commit -m "feat: add detect-stack.js script for tech stack detection"
```

---

### Task 3: Build `analyze-tests.js` Script

**Files:**
- Create: `plugins/qa/scripts/analyze-tests.js`
- Create: `tests/scripts/analyze-tests.test.js`

**Step 1: Write the test**

```javascript
#!/usr/bin/env node
'use strict';

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

function createTempProject(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-test-'));
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(dir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
  return dir;
}

function runAnalyze(projectRoot, language) {
  const script = path.resolve(__dirname, '../../plugins/qa/scripts/analyze-tests.js');
  const output = execSync(
    `node "${script}" --project-root "${projectRoot}" --language "${language}" --json`,
    { encoding: 'utf-8' }
  );
  return JSON.parse(output);
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// Test: Project with Jest tests
{
  const dir = createTempProject({
    'src/utils.ts': 'export function add(a, b) { return a + b; }',
    'src/utils.test.ts': `
      import { add } from './utils';
      describe('add', () => {
        it('adds two numbers', () => { expect(add(1, 2)).toBe(3); });
        it('handles negatives', () => { expect(add(-1, 1)).toBe(0); });
      });
    `,
    'src/api/handler.ts': 'export function handler() {}',
    'src/api/__tests__/handler.test.ts': `
      test('handler returns 200', () => { expect(true).toBe(true); });
    `
  });
  const result = runAnalyze(dir, 'typescript');
  console.assert(result.testFileCount >= 2, `Expected >= 2 test files, got ${result.testFileCount}`);
  console.assert(result.sourceFileCount >= 2, `Expected >= 2 source files, got ${result.sourceFileCount}`);
  console.assert(result.patterns.length > 0, 'Expected at least one test pattern detected');
  console.assert(result.hasTests === true, 'Expected hasTests to be true');
  cleanup(dir);
  console.log('PASS: Jest test analysis');
}

// Test: Project with no tests
{
  const dir = createTempProject({
    'src/index.ts': 'export const main = () => {};',
    'src/utils.ts': 'export function add(a, b) { return a + b; }'
  });
  const result = runAnalyze(dir, 'typescript');
  console.assert(result.hasTests === false, 'Expected hasTests to be false');
  console.assert(result.testFileCount === 0, `Expected 0 test files, got ${result.testFileCount}`);
  cleanup(dir);
  console.log('PASS: No tests detected');
}

// Test: Python pytest project
{
  const dir = createTempProject({
    'src/app.py': 'def hello(): return "hello"',
    'tests/test_app.py': 'def test_hello(): assert hello() == "hello"',
    'tests/conftest.py': 'import pytest'
  });
  const result = runAnalyze(dir, 'python');
  console.assert(result.hasTests === true, 'Expected hasTests to be true');
  console.assert(result.testFileCount >= 1, `Expected >= 1 test files, got ${result.testFileCount}`);
  cleanup(dir);
  console.log('PASS: Python pytest analysis');
}

console.log('\nAll analyze-tests tests passed.');
```

**Step 2: Run test to verify it fails**

Run: `node tests/scripts/analyze-tests.test.js`
Expected: FAIL

**Step 3: Write analyze-tests.js**

```javascript
#!/usr/bin/env node
/**
 * analyze-tests.js
 * Scans project for existing test files, patterns, and conventions.
 *
 * Usage:
 *   node analyze-tests.js --project-root <path> --language <lang> [--json]
 *
 * Output: JSON with test analysis:
 *   { hasTests, testFileCount, sourceFileCount, patterns, conventions }
 *
 * Exit codes: 0 = success, 2 = script error
 * Uses only Node.js built-in modules.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

function parseArgs(argv) {
  const args = { projectRoot: process.cwd(), language: 'unknown', json: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--project-root' && argv[i + 1]) args.projectRoot = path.resolve(argv[++i]);
    else if (argv[i] === '--language' && argv[i + 1]) args.language = argv[++i];
    else if (argv[i] === '--json') args.json = true;
  }
  return args;
}

const TEST_PATTERNS = {
  typescript: [/\.test\.tsx?$/, /\.spec\.tsx?$/, /__tests__\/.*\.tsx?$/],
  javascript: [/\.test\.jsx?$/, /\.spec\.jsx?$/, /__tests__\/.*\.jsx?$/],
  python: [/^test_.*\.py$/, /.*_test\.py$/, /^tests\/.*\.py$/],
  go: [/_test\.go$/],
  rust: [/tests\/.*\.rs$/],
  java: [/Test\.java$/, /Tests\.java$/, /.*IT\.java$/],
  ruby: [/_spec\.rb$/, /_test\.rb$/],
  php: [/Test\.php$/],
  elixir: [/_test\.exs$/]
};

const SOURCE_EXTENSIONS = {
  typescript: ['.ts', '.tsx'],
  javascript: ['.js', '.jsx', '.mjs'],
  python: ['.py'],
  go: ['.go'],
  rust: ['.rs'],
  java: ['.java'],
  ruby: ['.rb'],
  php: ['.php'],
  elixir: ['.ex', '.exs']
};

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
  '.venv', 'venv', 'vendor', 'target', '.claude', '.idea', '.vscode'
]);

function walkDir(dir, callback) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, callback);
    } else if (entry.isFile()) {
      callback(fullPath);
    }
  }
}

function isTestFile(filePath, language) {
  const patterns = TEST_PATTERNS[language] || [];
  const relativePath = filePath;
  const fileName = path.basename(filePath);
  return patterns.some(p => p.test(fileName) || p.test(relativePath));
}

function isSourceFile(filePath, language) {
  const extensions = SOURCE_EXTENSIONS[language] || [];
  return extensions.some(ext => filePath.endsWith(ext));
}

function detectConventions(testFiles, root) {
  const conventions = {
    testLocation: 'unknown',
    namingPatterns: [],
    hasFixtures: false,
    hasMocks: false,
    hasConftest: false
  };

  const colocatedCount = testFiles.filter(f => {
    const dir = path.dirname(f);
    const relDir = path.relative(root, dir);
    return !relDir.startsWith('tests') && !relDir.startsWith('test') &&
           !relDir.startsWith('__tests__') && !relDir.includes('__tests__');
  }).length;

  const separateCount = testFiles.length - colocatedCount;

  if (testFiles.length > 0) {
    conventions.testLocation = colocatedCount > separateCount ? 'colocated' : 'separate';
  }

  const patterns = new Set();
  for (const f of testFiles) {
    const name = path.basename(f);
    if (name.match(/\.test\./)) patterns.add('*.test.*');
    if (name.match(/\.spec\./)) patterns.add('*.spec.*');
    if (name.match(/^test_/)) patterns.add('test_*');
    if (name.match(/_test\./)) patterns.add('*_test.*');
    if (name.match(/Test\./)) patterns.add('*Test.*');
  }
  conventions.namingPatterns = [...patterns];

  walkDir(root, (filePath) => {
    const rel = path.relative(root, filePath);
    if (rel.includes('__fixtures__') || rel.includes('fixtures')) conventions.hasFixtures = true;
    if (rel.includes('__mocks__') || rel.includes('mocks')) conventions.hasMocks = true;
    if (path.basename(filePath) === 'conftest.py') conventions.hasConftest = true;
  });

  return conventions;
}

function analyze(root, language) {
  const testFiles = [];
  const sourceFiles = [];

  walkDir(root, (filePath) => {
    const relPath = path.relative(root, filePath);
    if (isSourceFile(filePath, language)) {
      if (isTestFile(relPath, language)) {
        testFiles.push(filePath);
      } else {
        sourceFiles.push(filePath);
      }
    }
  });

  const conventions = detectConventions(testFiles, root);
  const matchedPatterns = [];

  for (const [lang, patterns] of Object.entries(TEST_PATTERNS)) {
    if (lang === language) {
      for (const pattern of patterns) {
        if (testFiles.some(f => pattern.test(path.relative(root, f)) || pattern.test(path.basename(f)))) {
          matchedPatterns.push(pattern.source);
        }
      }
    }
  }

  return {
    hasTests: testFiles.length > 0,
    testFileCount: testFiles.length,
    sourceFileCount: sourceFiles.length,
    testFiles: testFiles.map(f => path.relative(root, f)),
    patterns: matchedPatterns,
    conventions
  };
}

if (require.main === module) {
  const args = parseArgs(process.argv);
  try {
    const result = analyze(args.projectRoot, args.language);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(2);
  }
}

module.exports = { analyze };
```

**Step 4: Run test to verify it passes**

Run: `node tests/scripts/analyze-tests.test.js`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add plugins/qa/scripts/analyze-tests.js tests/scripts/analyze-tests.test.js
git commit -m "feat: add analyze-tests.js script for existing test analysis"
```

---

### Task 4: Build `verify-setup.js` Script

**Files:**
- Create: `plugins/qa/scripts/verify-setup.js`
- Create: `tests/scripts/verify-setup.test.js`

**Step 1: Write the test**

```javascript
#!/usr/bin/env node
'use strict';

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

function createTempProject(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-verify-'));
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(dir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
  return dir;
}

function runVerify(projectRoot) {
  const script = path.resolve(__dirname, '../../plugins/qa/scripts/verify-setup.js');
  const output = execSync(`node "${script}" --project-root "${projectRoot}" --json`, {
    encoding: 'utf-8'
  });
  return JSON.parse(output);
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// Test: Valid setup passes
{
  const dir = createTempProject({
    '.claude/skills/qa-test-writer/SKILL.md': `---\nname: qa-test-writer\ndescription: "Test writer"\nuser-invocable: false\n---\n\n# Test Writer\nContent here.`,
    '.claude/commands/test/COMMAND.md': `---\ndescription: "Run tests"\nallowed-tools: [Bash]\n---\n\n# Test Command`,
    '.claude/qa-config.json': JSON.stringify({ stack: { language: 'typescript' } })
  });
  const result = runVerify(dir);
  console.assert(result.valid === true, `Expected valid, got ${JSON.stringify(result)}`);
  cleanup(dir);
  console.log('PASS: Valid setup passes verification');
}

// Test: Missing frontmatter fails
{
  const dir = createTempProject({
    '.claude/skills/qa-test-writer/SKILL.md': '# No frontmatter here\nJust content.',
    '.claude/qa-config.json': '{}'
  });
  const result = runVerify(dir);
  console.assert(result.valid === false, 'Expected invalid for missing frontmatter');
  console.assert(result.errors.length > 0, 'Expected errors');
  cleanup(dir);
  console.log('PASS: Missing frontmatter detected');
}

// Test: No qa-config.json fails
{
  const dir = createTempProject({
    '.claude/skills/qa-test-writer/SKILL.md': `---\nname: qa-test-writer\ndescription: "Test writer"\n---\n\n# Content`
  });
  const result = runVerify(dir);
  console.assert(result.valid === false, 'Expected invalid for missing qa-config.json');
  cleanup(dir);
  console.log('PASS: Missing qa-config.json detected');
}

console.log('\nAll verify-setup tests passed.');
```

**Step 2: Run test to verify it fails**

Run: `node tests/scripts/verify-setup.test.js`
Expected: FAIL

**Step 3: Write verify-setup.js**

```javascript
#!/usr/bin/env node
/**
 * verify-setup.js
 * Validates that generated QA artifacts in .claude/ are structurally correct.
 *
 * Usage:
 *   node verify-setup.js --project-root <path> [--json]
 *
 * Checks:
 *   - qa-config.json exists and is valid JSON
 *   - All SKILL.md files have valid YAML frontmatter (name, description)
 *   - All COMMAND.md files have valid frontmatter (description, allowed-tools)
 *   - All AGENT.md files have valid frontmatter
 *
 * Exit codes: 0 = all valid, 1 = issues found, 2 = script error
 * Uses only Node.js built-in modules.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

function parseArgs(argv) {
  const args = { projectRoot: process.cwd(), json: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--project-root' && argv[i + 1]) args.projectRoot = path.resolve(argv[++i]);
    else if (argv[i] === '--json') args.json = true;
  }
  return args;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      let value = line.slice(colonIdx + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map(s => s.trim());
      }
      fm[key] = value;
    }
  }
  return fm;
}

function walkDir(dir, callback) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, callback);
    } else if (entry.isFile()) {
      callback(fullPath);
    }
  }
}

function verify(root) {
  const claudeDir = path.join(root, '.claude');
  const errors = [];
  const warnings = [];
  const checked = [];

  // Check qa-config.json
  const configPath = path.join(claudeDir, 'qa-config.json');
  if (!fs.existsSync(configPath)) {
    errors.push({ file: 'qa-config.json', error: 'Missing qa-config.json' });
  } else {
    try {
      JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      checked.push('qa-config.json');
    } catch (e) {
      errors.push({ file: 'qa-config.json', error: `Invalid JSON: ${e.message}` });
    }
  }

  // Check SKILL.md files
  const skillsDir = path.join(claudeDir, 'skills');
  if (fs.existsSync(skillsDir)) {
    walkDir(skillsDir, (filePath) => {
      if (path.basename(filePath) !== 'SKILL.md') return;
      const rel = path.relative(claudeDir, filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      const fm = parseFrontmatter(content);
      if (!fm) {
        errors.push({ file: rel, error: 'Missing YAML frontmatter' });
        return;
      }
      if (!fm.name) errors.push({ file: rel, error: 'Frontmatter missing "name" field' });
      if (!fm.description) errors.push({ file: rel, error: 'Frontmatter missing "description" field' });
      checked.push(rel);
    });
  }

  // Check COMMAND.md files
  const commandsDir = path.join(claudeDir, 'commands');
  if (fs.existsSync(commandsDir)) {
    walkDir(commandsDir, (filePath) => {
      if (path.basename(filePath) !== 'COMMAND.md') return;
      const rel = path.relative(claudeDir, filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      const fm = parseFrontmatter(content);
      if (!fm) {
        errors.push({ file: rel, error: 'Missing YAML frontmatter' });
        return;
      }
      if (!fm.description) errors.push({ file: rel, error: 'Frontmatter missing "description" field' });
      checked.push(rel);
    });
  }

  // Check AGENT.md files
  const agentsDir = path.join(claudeDir, 'agents');
  if (fs.existsSync(agentsDir)) {
    walkDir(agentsDir, (filePath) => {
      if (path.basename(filePath) !== 'AGENT.md') return;
      const rel = path.relative(claudeDir, filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      const fm = parseFrontmatter(content);
      if (!fm) {
        errors.push({ file: rel, error: 'Missing YAML frontmatter' });
        return;
      }
      if (!fm.name) errors.push({ file: rel, error: 'Frontmatter missing "name" field' });
      checked.push(rel);
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    checked
  };
}

if (require.main === module) {
  const args = parseArgs(process.argv);
  try {
    const result = verify(args.projectRoot);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.valid ? 0 : 1);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(2);
  }
}

module.exports = { verify };
```

**Step 4: Run test to verify it passes**

Run: `node tests/scripts/verify-setup.test.js`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add plugins/qa/scripts/verify-setup.js tests/scripts/verify-setup.test.js
git commit -m "feat: add verify-setup.js for QA artifact validation"
```

---

### Task 5: Create Internal Skill — `qa-scanner`

**Files:**
- Create: `plugins/qa/skills/qa-scanner/SKILL.md`

**Step 1: Write the skill**

```markdown
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
```

**Step 2: Commit**

```bash
git add plugins/qa/skills/qa-scanner/SKILL.md
git commit -m "feat: add qa-scanner internal skill for project analysis"
```

---

### Task 6: Create Internal Skill — `qa-scaffolder`

**Files:**
- Create: `plugins/qa/skills/qa-scaffolder/SKILL.md`

**Step 1: Write the skill**

```markdown
---
name: qa-scaffolder
description: "Generates project-specific QA artifacts into .claude/ directory. Takes qa-scanner report + templates and produces customized skills, agents, commands, and qa-config.json. Use during /qa:init or /qa:sync rebuild."
user-invocable: false
---

# QA Scaffolder — Artifact Generator

Generate the complete QA infrastructure for a project's `.claude/` directory using the scanner report and template files.

## When This Skill Is Invoked

Called by `/qa:init` after the qa-scanner produces its report. Receives:
- The scanner report (project structure, modules, testing opportunities)
- The stack detection output (language, framework, test runner)
- The test analysis output (existing patterns, conventions)

## Workflow

### Phase 1: Read Templates

Read all template files from the plugin's `templates/` directory:
- `templates/skills/test-writer.md`
- `templates/skills/use-case-identifier.md`
- `templates/skills/coverage-analyzer.md`
- `templates/skills/test-reviewer.md`
- `templates/agents/test-runner.md`
- `templates/agents/coverage-checker.md`
- `templates/agents/test-reviewer.md`
- `templates/commands/test.md`
- `templates/commands/test-coverage.md`
- `templates/commands/test-review.md`

### Phase 2: Customize Templates

For each template, substitute project-specific details:

**Variables to replace:**
- `{{language}}` — detected language (e.g., "typescript")
- `{{framework}}` — detected framework (e.g., "next")
- `{{testRunner}}` — detected test runner (e.g., "jest")
- `{{testCommand}}` — detected test command (e.g., "npm test")
- `{{coverageTool}}` — detected coverage tool (e.g., "istanbul")
- `{{packageManager}}` — detected package manager (e.g., "npm")
- `{{testLocation}}` — test location convention (e.g., "colocated")
- `{{namingPattern}}` — test naming pattern (e.g., "*.test.ts")
- `{{modules}}` — list of project modules from scanner
- `{{existingPatterns}}` — existing test patterns (if any)

**Beyond simple substitution:**
- Add project-specific examples based on actual module names
- Reference real file paths from the scanner report
- Include framework-specific testing patterns (e.g., React Testing Library for Next.js)
- Adapt recommendations based on existing test conventions

### Phase 3: Generate qa-config.json

```json
{
  "stack": {
    "language": "{{language}}",
    "framework": "{{framework}}",
    "testRunner": "{{testRunner}}",
    "testCommand": "{{testCommand}}",
    "coverageTool": "{{coverageTool}}",
    "packageManager": "{{packageManager}}"
  },
  "emphasis": {
    "unit": "standard",
    "integration": "standard",
    "e2e": "standard",
    "useCases": "standard"
  },
  "conventions": {
    "testLocation": "{{testLocation}}",
    "namingPattern": "{{namingPattern}}",
    "fixturePattern": "{{fixturePattern}}"
  },
  "coverage": {
    "tool": "{{coverageTool}}",
    "thresholds": { "lines": 80, "branches": 70 }
  },
  "generatedAt": "{{timestamp}}",
  "pluginVersion": "0.1.0"
}
```

### Phase 4: Write Files

Write all generated files to the project's `.claude/` directory:

1. `.claude/qa-config.json`
2. `.claude/skills/qa-test-writer/SKILL.md`
3. `.claude/skills/qa-use-case-identifier/SKILL.md`
4. `.claude/skills/qa-coverage-analyzer/SKILL.md`
5. `.claude/skills/qa-test-reviewer/SKILL.md`
6. `.claude/agents/qa-test-runner/AGENT.md`
7. `.claude/agents/qa-coverage-checker/AGENT.md`
8. `.claude/agents/qa-test-reviewer/AGENT.md`
9. `.claude/commands/test/COMMAND.md`
10. `.claude/commands/test-coverage/COMMAND.md`
11. `.claude/commands/test-review/COMMAND.md`

### Phase 5: Validate

Run `verify-setup.js --project-root <path>` to confirm all artifacts are valid.

If validation fails → fix the failing artifacts before completing.

## Critical Rules

1. **Specificity test** — For each generated file, ask: "Could this have been generated without analyzing THIS project?" If yes → rewrite with more project-specific details.
2. **Respect existing** — If the project already has tests, the test-writer skill MUST reference existing conventions, not override them.
3. **Complete files** — Every generated file must be a complete, working artifact. No placeholders like "TODO" or "fill in later."
4. **Ask before overwriting** — If `.claude/skills/qa-*` files already exist, ask the user before overwriting.
```

**Step 2: Commit**

```bash
git add plugins/qa/skills/qa-scaffolder/SKILL.md
git commit -m "feat: add qa-scaffolder internal skill for artifact generation"
```

---

### Task 7: Create Internal Skill — `qa-differ`

**Files:**
- Create: `plugins/qa/skills/qa-differ/SKILL.md`

**Step 1: Write the skill**

```markdown
---
name: qa-differ
description: "Detects drift between project's current state and generated QA artifacts. Compares stack, modules, and test patterns to identify CURRENT, OUTDATED, STALE, or MISSING artifacts. Used by /qa:audit and /qa:sync."
user-invocable: false
---

# QA Differ — Drift Detection

Compare the project's current state against previously generated QA artifacts to detect what needs updating.

## When This Skill Is Invoked

Called by `/qa:audit` (read-only report) and `/qa:sync` (to determine what to regenerate).

## Workflow

### Phase 1: Gather Current State

1. Run `detect-stack.js` → get current stack info
2. Run `analyze-tests.js` → get current test analysis
3. Read `.claude/qa-config.json` → get saved state from last init/sync

### Phase 2: Compare

For each dimension, compare current vs. saved:

**Stack drift:**
- Language changed? (rare but possible)
- Framework changed or added?
- Test runner changed (e.g., Jest → Vitest)?
- New coverage tool?
- New CI setup?

**Module drift:**
- New source directories/modules added?
- Modules removed?
- Significant new files (new API routes, new components)?

**Test drift:**
- New test files added outside QA plugin guidance?
- Test conventions changed?
- New testing patterns detected?

### Phase 3: Classify Artifacts

For each generated artifact, assign a status:

- **CURRENT** — No relevant drift detected. Artifact is still accurate.
- **OUTDATED** — Minor drift. Artifact mostly correct but missing new modules or patterns.
- **STALE** — Major drift. Stack or framework changed. Artifact needs full regeneration.
- **MISSING** — Expected artifact doesn't exist (e.g., new module type needs new guidance).

### Phase 4: Produce Report

```
## Drift Report

### Stack Changes
- testRunner: jest → vitest (CHANGED)
- framework: react → next (CHANGED)

### Artifact Status
| Artifact | Status | Reason |
|----------|--------|--------|
| qa-test-writer/SKILL.md | STALE | Test runner changed from jest to vitest |
| qa-use-case-identifier/SKILL.md | OUTDATED | 3 new API routes not covered |
| qa-coverage-analyzer/SKILL.md | CURRENT | — |
| qa-test-reviewer/SKILL.md | CURRENT | — |
| test-runner/AGENT.md | STALE | Test runner changed |
| test/COMMAND.md | STALE | Test command changed |

### Recommended Actions
1. Run /qa:sync to regenerate STALE artifacts
2. Run /qa:sync to extend OUTDATED artifacts
```

## Critical Rules

1. **Read actual files** — Compare against real `.claude/qa-config.json`, not assumptions.
2. **Be conservative** — If unsure whether something drifted, mark as OUTDATED (not STALE).
3. **Stay read-only** — This skill produces a report. It does NOT modify files. `/qa:sync` acts on this report.
```

**Step 2: Commit**

```bash
git add plugins/qa/skills/qa-differ/SKILL.md
git commit -m "feat: add qa-differ internal skill for drift detection"
```

---

### Task 8: Create Internal Skill — `qa-coordinator`

**Files:**
- Create: `plugins/qa/skills/qa-coordinator/SKILL.md`

**Step 1: Write the skill**

```markdown
---
name: qa-coordinator
description: "Generates contextual next-action suggestions based on current QA state. Appends 'Suggested next step' to command output. Used by all /qa:* commands to maintain workflow coherence."
user-invocable: false
---

# QA Coordinator — Next-Action Engine

Determine the most helpful next action for the user based on current QA state.

## When This Skill Is Invoked

Called at the end of every `/qa:*` command to append a "Suggested next step" line.

## Decision Logic

### After `/qa:init`
- If tests exist: "Setup complete. Run `/qa:analyze` to check test health, or `/test` to run your tests."
- If no tests: "Setup complete. Use the test-writer skill to create your first tests, or `/qa:analyze` for a coverage roadmap."

### After `/qa:audit`
- If all CURRENT: "All QA artifacts are up to date. Consider `/qa:analyze` for a deeper test health check."
- If any STALE: "N artifacts are stale. Run `/qa:sync` to regenerate them."
- If any OUTDATED: "N artifacts need updates. Run `/qa:sync` to refresh them."
- If any MISSING: "N artifacts are missing. Run `/qa:sync` to generate them."

### After `/qa:sync`
- "Artifacts updated. Run `/qa:analyze` to check test health against the new configuration."

### After `/qa:analyze`
- If gaps found: "Found N coverage gaps. Highest priority: [module]. Use the test-writer skill to add tests."
- If quality issues: "Found N test quality issues. Run `/test:review` for detailed recommendations."
- If healthy: "Test health looks good. Run `/test:coverage` to verify coverage thresholds."

### After `/qa:status`
- Show the single most impactful action from the decision tree above.

### After `/qa:configure`
- "Configuration updated. Run `/qa:sync` to regenerate artifacts with new settings."

## Output Format

Always output exactly one suggestion line at the end of the command output:

```
---
**Suggested next step:** Run `/qa:sync` to update 3 outdated artifacts.
```
```

**Step 2: Commit**

```bash
git add plugins/qa/skills/qa-coordinator/SKILL.md
git commit -m "feat: add qa-coordinator internal skill for next-action suggestions"
```

---

### Task 9: Create Template Skills

**Files:**
- Create: `plugins/qa/templates/skills/test-writer.md`
- Create: `plugins/qa/templates/skills/use-case-identifier.md`
- Create: `plugins/qa/templates/skills/coverage-analyzer.md`
- Create: `plugins/qa/templates/skills/test-reviewer.md`

**Step 1: Write test-writer template**

```markdown
---
name: qa-test-writer
description: "Write tests for this {{framework}} project using {{testRunner}}. Knows project conventions ({{namingPattern}}, {{testLocation}} tests), assertion patterns, fixture setup, and what test types to write for each code type. Use when asked to write, add, or create tests."
user-invocable: false
---

# Test Writer — {{framework}} / {{testRunner}}

Write tests for this project following established conventions.

## Project Context

- **Language:** {{language}}
- **Framework:** {{framework}}
- **Test Runner:** {{testRunner}}
- **Test Command:** `{{testCommand}}`
- **Test Location:** {{testLocation}}
- **Naming Pattern:** {{namingPattern}}
- **Package Manager:** {{packageManager}}

## Existing Conventions

{{existingPatterns}}

## How to Write Tests

### Step 1: Identify What to Test

Read the source file and identify:
- Public functions/methods and their expected behavior
- Edge cases (null, empty, boundary values)
- Error paths (what should throw/reject)
- Integration points (API calls, DB queries)

### Step 2: Choose Test Type

| Code Type | Test Type | Why |
|-----------|-----------|-----|
| Pure functions / utilities | Unit test | Fast, isolated, no side effects |
| API endpoints / handlers | Integration test | Tests request/response cycle |
| UI components | Component test | Tests rendering and interaction |
| Database operations | Integration test | Tests real queries |
| Business logic with deps | Unit test with mocks | Isolate from external deps |
| User flows | E2E test | Tests full system behavior |

### Step 3: Write the Test

Follow this structure:
1. **Arrange** — Set up test data and dependencies
2. **Act** — Call the function/component under test
3. **Assert** — Verify the result

### Step 4: Verify

Run: `{{testCommand}}`
Ensure the test passes and covers the intended behavior.

## Anti-Patterns to Avoid

- Testing implementation details instead of behavior
- Overly broad tests that test everything at once
- Missing edge cases (null, undefined, empty arrays, boundary values)
- Tautological tests (testing that a mock returns what you told it to)
- Shared mutable state between tests
- No assertion in test (test always passes)

## Project Modules

{{modules}}
```

**Step 2: Write use-case-identifier template**

```markdown
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
```

**Step 3: Write coverage-analyzer template**

```markdown
---
name: qa-coverage-analyzer
description: "Analyze test coverage for this {{framework}} project using {{coverageTool}}. Interprets coverage reports, identifies meaningful gaps, and suggests improvement strategies. Use when asked about coverage, gaps, or untested code."
user-invocable: false
---

# Coverage Analyzer — {{coverageTool}}

Interpret and improve test coverage for this project.

## Project Context

- **Language:** {{language}}
- **Test Runner:** {{testRunner}}
- **Coverage Tool:** {{coverageTool}}
- **Thresholds:** Lines: {{coverageThresholdLines}}%, Branches: {{coverageThresholdBranches}}%

## How to Run Coverage

```bash
{{coverageCommand}}
```

## How to Analyze Coverage

### Step 1: Run Coverage Report

Execute the coverage command and read the output.

### Step 2: Identify Meaningful Gaps

Not all uncovered code is equally important. Prioritize:

**Must cover:**
- Business logic and calculations
- Error handling paths
- Security-related code (auth, validation, sanitization)
- Data transformations and mappings

**Nice to cover:**
- Utility functions
- Configuration code
- Middleware

**Skip covering:**
- Type definitions / interfaces
- Re-exports / barrel files
- Framework boilerplate
- Generated code

### Step 3: Recommend Improvements

For each significant gap:
1. Identify which module is uncovered
2. Suggest specific test type (unit/integration/e2e)
3. Suggest specific test cases
4. Estimate coverage improvement from adding tests

## Project Modules

{{modules}}
```

**Step 4: Write test-reviewer template**

```markdown
---
name: qa-test-reviewer
description: "Review test quality for this {{framework}} project. Checks for anti-patterns, assertion completeness, test isolation, edge case coverage, and {{testRunner}}-specific issues. Use when asked to review tests, check test quality, or improve test suite."
user-invocable: false
---

# Test Reviewer — {{testRunner}}

Review test quality and provide actionable feedback.

## Project Context

- **Language:** {{language}}
- **Framework:** {{framework}}
- **Test Runner:** {{testRunner}}

## Review Checklist

### 1. Assertion Quality
- [ ] Each test has at least one meaningful assertion
- [ ] Assertions test behavior, not implementation details
- [ ] Error messages are descriptive (custom matchers where appropriate)
- [ ] No tautological assertions (always-true checks)

### 2. Test Isolation
- [ ] Tests don't depend on execution order
- [ ] No shared mutable state between tests
- [ ] Proper setup/teardown (beforeEach/afterEach or equivalent)
- [ ] Database/file system state cleaned up after tests

### 3. Edge Cases
- [ ] Null/undefined/empty inputs tested
- [ ] Boundary values tested (0, -1, MAX_INT, empty string)
- [ ] Error paths tested (invalid input, network failure, timeout)
- [ ] Concurrent/race condition scenarios (where applicable)

### 4. Test Naming
- [ ] Test names describe the behavior being tested
- [ ] Test names follow project convention: {{namingPattern}}
- [ ] Describe/it blocks are organized logically

### 5. Mock Hygiene
- [ ] Mocks are minimal — only mock what you must
- [ ] Mock implementations match real behavior
- [ ] Mocks are verified (called with expected args)
- [ ] No mocking of the module under test

### 6. Performance
- [ ] No unnecessary async/await in sync tests
- [ ] Large test data generated, not hardcoded
- [ ] Slow tests isolated or marked appropriately

## Anti-Patterns to Flag

| Pattern | Problem | Fix |
|---------|---------|-----|
| No assertions | Test always passes | Add assertions for expected behavior |
| Testing private methods | Brittle, coupled to implementation | Test through public API |
| Excessive mocking | Tests prove mocks work, not code | Reduce mocks, use integration tests |
| Snapshot overuse | Snapshots hide real assertions | Add explicit assertions alongside |
| Flaky time-dependent tests | Pass/fail based on timing | Use fake timers or time abstraction |

## Output Format

```
## Test Review: [file path]

### Issues Found
1. **[Severity]** [Description] — Line N
   - **Problem:** [what's wrong]
   - **Fix:** [how to fix]

### Positive Patterns
- [thing done well]

### Summary
- Issues: N (critical: X, warning: Y, info: Z)
- Overall quality: [Good / Needs Work / Poor]
```
```

**Step 5: Commit**

```bash
git add plugins/qa/templates/skills/
git commit -m "feat: add template skills for test-writer, use-case-id, coverage, reviewer"
```

---

### Task 10: Create Template Agents

**Files:**
- Create: `plugins/qa/templates/agents/test-runner.md`
- Create: `plugins/qa/templates/agents/coverage-checker.md`
- Create: `plugins/qa/templates/agents/test-reviewer.md`

**Step 1: Write test-runner agent template**

```markdown
---
name: qa-test-runner
description: "Runs {{testRunner}} tests for this project. Parses output into structured results. Supports running all tests, single files, or by pattern. Use when asked to run, execute, or check tests."
---

# Test Runner Agent — {{testRunner}}

Run tests and report results.

## Commands

### Run all tests
```bash
{{testCommand}}
```

### Run specific file
```bash
{{testRunnerCommand}} {{testFileArg}}
```

### Run by pattern
```bash
{{testRunnerCommand}} {{patternArg}}
```

## Output Parsing

After running tests, parse the output and report:

```
## Test Results

**Status:** PASS / FAIL
**Total:** N tests
**Passed:** N
**Failed:** N
**Skipped:** N
**Duration:** Ns

### Failures (if any)
1. **test name** — file:line
   - Expected: X
   - Received: Y
```

## Error Handling

If tests fail to run (not test failures, but execution errors):
1. Check that dependencies are installed: `{{installCommand}}`
2. Check that test config exists
3. Report the error with suggested fix
```

**Step 2: Write coverage-checker agent template**

```markdown
---
name: qa-coverage-checker
description: "Runs coverage analysis using {{coverageTool}} for this project. Compares against configured thresholds. Identifies uncovered paths. Use when asked to check or analyze coverage."
---

# Coverage Checker Agent — {{coverageTool}}

Run coverage and compare against thresholds.

## Run Coverage

```bash
{{coverageCommand}}
```

## Thresholds (from qa-config.json)

- Lines: {{coverageThresholdLines}}%
- Branches: {{coverageThresholdBranches}}%

## Output

```
## Coverage Report

**Overall:** N% lines, N% branches
**Threshold Status:** PASS / FAIL

### Below Threshold
| File | Lines | Branches | Status |
|------|-------|----------|--------|
| path/to/file | 45% | 30% | FAIL |

### Uncovered Modules
- module_name — 0% coverage, N source files
```
```

**Step 3: Write test-reviewer agent template**

```markdown
---
name: qa-test-reviewer
description: "Reviews test quality for changed or new test files in this {{framework}}/{{testRunner}} project. Applies qa-test-reviewer skill automatically. Use when asked to review test quality or during PR review."
---

# Test Review Agent — {{testRunner}}

Automatically review test files for quality.

## Trigger

Review test files that are:
- Newly created
- Recently modified (check git diff)
- Specified by the user

## Process

1. Identify test files to review (from git diff or user input)
2. For each test file, apply the qa-test-reviewer skill checklist
3. Produce a consolidated review report

## Output

```
## Test Review Report

### Files Reviewed: N

### file1.test.ts
- 2 issues (1 warning, 1 info)
- Quality: Good

### file2.test.ts
- 4 issues (1 critical, 2 warning, 1 info)
- Quality: Needs Work

### Summary
- Total issues: 6
- Critical: 1, Warning: 3, Info: 2
- Files needing attention: 1
```
```

**Step 4: Commit**

```bash
git add plugins/qa/templates/agents/
git commit -m "feat: add template agents for test-runner, coverage-checker, test-reviewer"
```

---

### Task 11: Create Template Commands

**Files:**
- Create: `plugins/qa/templates/commands/test.md`
- Create: `plugins/qa/templates/commands/test-coverage.md`
- Create: `plugins/qa/templates/commands/test-review.md`

**Step 1: Write test command template**

```markdown
---
description: Run {{testRunner}} tests. Supports all tests, specific files, or changed-files-only mode.
allowed-tools: [Read, Glob, Grep, Bash, Agent]
---

# /test — Smart Test Runner

Run tests for this project using {{testRunner}}.

## Usage

- `/test` — Run all tests
- `/test [file]` — Run tests in a specific file
- `/test --changed` — Run tests only for changed files (uses git diff)

## Execution

1. Determine scope (all, file, or changed)
2. If `--changed`: run `git diff --name-only` and filter for test files matching `{{namingPattern}}`
3. Use the qa-test-runner agent to execute and parse results
4. Report structured results
5. Suggest next step via qa-coordinator
```

**Step 2: Write test-coverage command template**

```markdown
---
description: Run test coverage analysis using {{coverageTool}}, compare against thresholds, and identify gaps.
allowed-tools: [Read, Glob, Grep, Bash, Agent]
---

# /test:coverage — Coverage Analysis

Run coverage and identify gaps.

## Execution

1. Use the qa-coverage-checker agent to run coverage
2. Compare against thresholds in `.claude/qa-config.json`
3. Report results with uncovered areas
4. If below threshold: suggest which modules to test first
5. Suggest next step via qa-coordinator
```

**Step 3: Write test-review command template**

```markdown
---
description: Review test quality for changed or specified test files. Checks for anti-patterns, missing assertions, and test isolation issues.
allowed-tools: [Read, Glob, Grep, Bash, Agent]
---

# /test:review — Test Quality Review

Review test files for quality and best practices.

## Execution

1. Determine which test files to review:
   - If file specified: review that file
   - Otherwise: review test files changed in current branch (git diff against main)
2. Use the qa-test-reviewer agent to review each file
3. Report consolidated review
4. Suggest next step via qa-coordinator
```

**Step 4: Commit**

```bash
git add plugins/qa/templates/commands/
git commit -m "feat: add template commands for test, test-coverage, test-review"
```

---

### Task 12: Create Meta Command — `/qa:init`

**Files:**
- Create: `plugins/qa/commands/init.md`

**Step 1: Write the command**

```markdown
---
description: Analyze project and generate comprehensive QA testing infrastructure into .claude/. Detects tech stack, analyzes existing tests, creates project-specific skills, agents, and commands.
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash, TodoWrite, Skill]
---

# /qa:init — Setup QA Infrastructure

Generate a complete QA testing setup tailored to this project.

## Pre-flight

1. Check if `.claude/qa-config.json` already exists
   - If yes: "QA setup already exists. Would you like to:"
     - **Audit** — Run `/qa:audit` to check health (non-destructive)
     - **Rebuild** — Regenerate all artifacts (will overwrite existing)
   - Wait for user confirmation before proceeding with rebuild
2. If no existing setup: proceed with fresh initialization

## Execution

### Step 1: Detect Stack

Run the detection script:
```bash
node <plugin-dir>/scripts/detect-stack.js --project-root <project-root> --json
```

Save the JSON output for later steps.

### Step 2: Analyze Existing Tests

Run the analysis script:
```bash
node <plugin-dir>/scripts/analyze-tests.js --project-root <project-root> --language <detected-language> --json
```

Save the JSON output for later steps.

### Step 3: Deep Project Scan

Invoke the `qa-scanner` skill with the script outputs as context.
This produces a detailed project report with modules, entry points, and testing opportunities.

### Step 4: Generate QA Artifacts

Invoke the `qa-scaffolder` skill with:
- Scanner report
- Stack detection output
- Test analysis output

This generates all project-specific files into `.claude/`:
- 4 skills (test-writer, use-case-identifier, coverage-analyzer, test-reviewer)
- 3 agents (test-runner, coverage-checker, test-reviewer)
- 3 commands (test, test-coverage, test-review)
- qa-config.json

### Step 5: Verify

Run the verification script:
```bash
node <plugin-dir>/scripts/verify-setup.js --project-root <project-root> --json
```

If verification fails: fix issues and re-verify.

### Step 6: Report

Print a summary:

```
## QA Setup Complete

### Detected Stack
- Language: typescript
- Framework: next
- Test Runner: jest
- Coverage: istanbul

### Generated Artifacts
- 4 skills in .claude/skills/qa-*
- 3 agents in .claude/agents/qa-*
- 3 commands: /test, /test:coverage, /test:review
- Configuration: .claude/qa-config.json

### Existing Tests
- Found 15 test files following *.test.ts pattern
- Conventions preserved in generated skills
```

### Step 7: Suggest Next Step

Invoke the `qa-coordinator` skill to append the appropriate next-step suggestion.
```

**Step 2: Commit**

```bash
git add plugins/qa/commands/init.md
git commit -m "feat: add /qa:init meta command"
```

---

### Task 13: Create Meta Command — `/qa:audit`

**Files:**
- Create: `plugins/qa/commands/audit.md`

**Step 1: Write the command**

```markdown
---
description: Non-destructive health check of QA artifacts. Compares current project state against generated .claude/ QA setup, reports CURRENT/OUTDATED/STALE/MISSING per artifact.
allowed-tools: [Read, Glob, Grep, Bash, Skill]
---

# /qa:audit — QA Artifact Health Check

Read-only review of QA setup accuracy.

## Pre-flight

1. Check that `.claude/qa-config.json` exists
   - If not: "No QA setup found. Run `/qa:init` first."
   - Stop execution.

## Execution

### Step 1: Run Drift Detection

Invoke the `qa-differ` skill to compare current project state against saved QA artifacts.

### Step 2: Report Results

Display the drift report:

```
## QA Audit Report

### Artifact Status
| Artifact | Status | Reason |
|----------|--------|--------|
| qa-test-writer | CURRENT | — |
| qa-use-case-identifier | OUTDATED | 2 new API routes |
| qa-coverage-analyzer | CURRENT | — |
| qa-test-reviewer | CURRENT | — |
| test-runner agent | CURRENT | — |
| test command | CURRENT | — |

### Stack Changes
- No changes detected (or list changes)

### Summary
- 5 CURRENT, 1 OUTDATED, 0 STALE, 0 MISSING
```

### Step 3: Suggest Next Step

Invoke `qa-coordinator` to suggest the appropriate action.

## Critical Rules

- **Never modify files** — This command is read-only.
- **Always run full comparison** — Don't skip artifacts.
```

**Step 2: Commit**

```bash
git add plugins/qa/commands/audit.md
git commit -m "feat: add /qa:audit meta command"
```

---

### Task 14: Create Meta Commands — `/qa:sync`, `/qa:analyze`, `/qa:status`, `/qa:configure`

**Files:**
- Create: `plugins/qa/commands/sync.md`
- Create: `plugins/qa/commands/analyze.md`
- Create: `plugins/qa/commands/status.md`
- Create: `plugins/qa/commands/configure.md`

**Step 1: Write sync command**

```markdown
---
description: Regenerate outdated QA artifacts. Re-scans project, identifies drift, updates stale skills/agents/commands, and validates results. Fully manual — never auto-triggered.
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash, TodoWrite, Skill]
---

# /qa:sync — Update QA Artifacts

Regenerate QA artifacts that have drifted from current project state.

## Pre-flight

1. Check that `.claude/qa-config.json` exists
   - If not: "No QA setup found. Run `/qa:init` first." — Stop.

## Execution

### Step 1: Run Drift Detection

Invoke `qa-differ` to get the drift report.

### Step 2: Show Plan

Display what will be updated:

```
## Sync Plan

Will update:
- qa-test-writer/SKILL.md (STALE — test runner changed)
- qa-use-case-identifier/SKILL.md (OUTDATED — new modules)
- test-runner/AGENT.md (STALE — test runner changed)
- test/COMMAND.md (STALE — test command changed)

Will keep:
- qa-coverage-analyzer/SKILL.md (CURRENT)
- qa-test-reviewer/SKILL.md (CURRENT)

Proceed? (yes/no)
```

Wait for user confirmation.

### Step 3: Regenerate

For STALE artifacts: invoke `qa-scaffolder` to fully regenerate from templates.
For OUTDATED artifacts: invoke `qa-scaffolder` to extend with new information while preserving existing customizations.

### Step 4: Update qa-config.json

Update the saved stack info and timestamp in `.claude/qa-config.json`.

### Step 5: Verify

Run `verify-setup.js` to validate all artifacts.

### Step 6: Show Diff Summary

Show what changed in each file (high-level summary, not full diff).

### Step 7: Suggest Next Step

Invoke `qa-coordinator`.
```

**Step 2: Write analyze command**

```markdown
---
description: Deep analysis of test health — scans for quality issues, coverage gaps, untested user flows, and prioritized recommendations. Does not modify files.
allowed-tools: [Read, Glob, Grep, Bash, Skill]
---

# /qa:analyze — Deep Test Health Analysis

Comprehensive analysis of test quality and coverage.

## Execution

### Step 1: Read qa-config.json

Load project configuration and stack info.

### Step 2: Scan All Tests

Read all test files in the project. For each test file, assess:
- **Assertion quality** — meaningful assertions? testing behavior or implementation?
- **Test isolation** — shared state? order dependencies?
- **Edge case coverage** — null/empty/boundary tested?
- **Mock hygiene** — minimal mocks? mocks match real behavior?
- **Naming clarity** — descriptive test names?

### Step 3: Map Coverage Gaps

Compare source files against test files:
- Which modules have zero test coverage?
- Which modules have partial coverage?
- Which critical paths lack tests?

### Step 4: Identify Untested User Flows

Using the qa-use-case-identifier skill's knowledge:
- Which user-facing routes/endpoints have no tests?
- Which business-critical flows are untested?
- Which error paths are uncovered?

### Step 5: Produce Report

```
## Test Health Analysis

### Quality Issues (N found)
1. **WARNING** src/api.test.ts:15 — Test has no assertions
2. **WARNING** src/utils.test.ts:30 — Testing implementation detail (private method)
3. **INFO** src/db.test.ts:5 — Consider using integration test instead of mocking DB

### Coverage Gaps (N modules)
| Module | Source Files | Test Files | Est. Coverage |
|--------|-------------|------------|---------------|
| src/api/ | 5 | 2 | ~40% |
| src/services/ | 3 | 0 | 0% |
| src/utils/ | 4 | 3 | ~75% |

### Untested User Flows
1. **Critical** — POST /api/checkout — no integration test
2. **High** — User registration flow — no e2e test
3. **Medium** — Password reset — no test at all

### Prioritized Recommendations
1. Add tests for src/services/ (0% coverage, business logic)
2. Add integration test for POST /api/checkout (critical flow)
3. Fix assertion-less test in src/api.test.ts
```

### Step 6: Suggest Next Step

Invoke `qa-coordinator`.
```

**Step 3: Write status command**

```markdown
---
description: Quick QA health dashboard showing artifact freshness, test health summary, and single most impactful next action.
allowed-tools: [Read, Glob, Grep, Bash, Skill]
---

# /qa:status — QA Health Dashboard

Quick snapshot of QA infrastructure health.

## Pre-flight

1. Check that `.claude/qa-config.json` exists
   - If not: "No QA setup found. Run `/qa:init` to get started." — Stop.

## Execution

### Step 1: Read State

- Read `.claude/qa-config.json` for last sync timestamp and stack info
- Count test files in project
- Check artifact file modification dates vs. source file dates

### Step 2: Quick Health Check

Run a lightweight version of the differ (just check file existence and timestamps, not deep content comparison).

### Step 3: Display Dashboard

```
## QA Status

### Setup
- Plugin version: 0.1.0
- Last init/sync: 2026-03-22
- Stack: typescript / next / jest

### Artifacts
- Skills: 4/4 present ✓
- Agents: 3/3 present ✓
- Commands: 3/3 present ✓
- Freshness: CURRENT (or: 2 OUTDATED)

### Tests
- Test files: 15
- Test naming: *.test.ts

---
**Suggested next step:** Everything looks good. Run `/qa:audit` for a detailed check.
```
```

**Step 4: Write configure command**

```markdown
---
description: View and edit QA configuration (emphasis, thresholds, conventions). Opens qa-config.json for adjustment.
allowed-tools: [Read, Write, Edit, Glob, Bash, Skill]
---

# /qa:configure — Adjust QA Preferences

View and modify QA configuration.

## Pre-flight

1. Check that `.claude/qa-config.json` exists
   - If not: "No QA setup found. Run `/qa:init` first." — Stop.

## Execution

### Step 1: Show Current Config

Read and display `.claude/qa-config.json`:

```
## Current QA Configuration

### Stack (auto-detected)
- Language: typescript
- Framework: next
- Test Runner: jest

### Emphasis (adjustable)
- Unit tests: standard
- Integration tests: standard
- E2E tests: standard
- Use cases: standard

### Conventions (adjustable)
- Test location: colocated
- Naming pattern: *.test.ts
- Fixture pattern: __fixtures__/

### Coverage Thresholds (adjustable)
- Lines: 80%
- Branches: 70%
```

### Step 2: Ask What to Change

Ask the user what they'd like to adjust. Apply changes to `qa-config.json`.

### Step 3: Suggest Next Step

"Configuration updated. Run `/qa:sync` to regenerate artifacts with the new settings."
```

**Step 5: Commit**

```bash
git add plugins/qa/commands/
git commit -m "feat: add /qa:sync, /qa:analyze, /qa:status, /qa:configure commands"
```

---

### Task 15: Set Up promptfoo Testing

**Files:**
- Create: `tests/promptfooconfig.yaml`
- Create: `tests/skills/init.test.yaml`
- Create: `.env.example`

**Step 1: Install promptfoo**

Run: `npm install --save-dev promptfoo`
Expected: Added to devDependencies

**Step 2: Create .env.example**

```
ANTHROPIC_API_KEY=your-api-key-here
```

**Step 3: Create promptfooconfig.yaml**

```yaml
description: "QA Plugin Behavioral Tests"

providers:
  - id: anthropic:messages:claude-sonnet-4-20250514
    config:
      temperature: 0

defaultTest:
  options:
    provider:
      id: anthropic:messages:claude-sonnet-4-20250514
    timeout: 60000

tests: "skills/*.test.yaml"
```

**Step 4: Create init test**

```yaml
description: "qa:init scaffolds correctly for different project types"

prompts:
  - |
    You are the qa:init command. Given the following project detection results, describe what QA artifacts you would generate.

    Stack detection: {{stackJson}}
    Test analysis: {{testAnalysisJson}}

    List the exact files you would create in .claude/ and briefly describe what each would contain.

tests:
  - description: "TypeScript + Next.js + Jest (no existing tests)"
    vars:
      stackJson: '{"language":"typescript","framework":"next","testRunner":"jest","testCommand":"npm test","coverageTool":"istanbul","ci":"github-actions","packageManager":"npm"}'
      testAnalysisJson: '{"hasTests":false,"testFileCount":0,"sourceFileCount":12,"patterns":[]}'
    assert:
      - type: contains
        value: "qa-test-writer"
      - type: contains
        value: "qa-config.json"
      - type: llm-rubric
        value: "The response mentions Jest as the test runner and references Next.js or React Testing Library patterns"
      - type: llm-rubric
        value: "The response creates skills, agents, and commands — not just one type of artifact"

  - description: "Python + Django + pytest (existing tests)"
    vars:
      stackJson: '{"language":"python","framework":"django","testRunner":"pytest","testCommand":"pytest","coverageTool":"coverage.py","ci":null,"packageManager":"pip"}'
      testAnalysisJson: '{"hasTests":true,"testFileCount":8,"sourceFileCount":20,"patterns":["test_.*\\.py"],"conventions":{"testLocation":"separate","namingPatterns":["test_*"]}}'
    assert:
      - type: llm-rubric
        value: "The response acknowledges existing pytest tests and builds on them rather than replacing them"
      - type: llm-rubric
        value: "The response references Django-specific testing patterns (TestCase, Client, etc.)"

  - description: "Go project (no existing tests)"
    vars:
      stackJson: '{"language":"go","framework":null,"testRunner":"go test","testCommand":"go test ./...","coverageTool":"go cover","ci":null,"packageManager":null}'
      testAnalysisJson: '{"hasTests":false,"testFileCount":0,"sourceFileCount":5,"patterns":[]}'
    assert:
      - type: llm-rubric
        value: "The response references Go testing conventions (_test.go files, testing.T, table-driven tests)"

  - description: "Empty/unknown project"
    vars:
      stackJson: '{"language":null,"framework":null,"testRunner":null,"testCommand":null,"coverageTool":null,"ci":null,"packageManager":null}'
      testAnalysisJson: '{"hasTests":false,"testFileCount":0,"sourceFileCount":0,"patterns":[]}'
    assert:
      - type: llm-rubric
        value: "The response asks for more information or suggests a common stack rather than generating incorrect artifacts"
```

**Step 5: Add test script to package.json**

Update `package.json` to add:
```json
{
  "scripts": {
    "test": "node tests/scripts/detect-stack.test.js && node tests/scripts/analyze-tests.test.js && node tests/scripts/verify-setup.test.js",
    "test:promptfoo": "promptfoo eval --env-file .env",
    "test:promptfoo:view": "promptfoo view"
  }
}
```

**Step 6: Run script tests**

Run: `npm test`
Expected: All script tests pass

**Step 7: Commit**

```bash
git add tests/ .env.example package.json
git commit -m "feat: add promptfoo test infrastructure and init test cases"
```

---

### Task 16: Add Documentation

**Files:**
- Create: `docs/getting-started.md`
- Create: `docs/architecture.md`

**Step 1: Write getting-started.md**

```markdown
# Getting Started with the QA Plugin

## Installation

### Via Claude Code UI
1. Run `/plugin` command
2. Navigate to Marketplaces
3. Add this repository
4. Select `qa` plugin and install

### Via CLI
```
/plugin marketplace add <your-github-username>/qa-plugin
/plugin install qa@qa-plugin
```

## Usage

### First-time setup
```
/qa:init
```
This analyzes your project and generates QA infrastructure into `.claude/`.

### Check health
```
/qa:status
```

### After project changes
```
/qa:audit    # See what's outdated
/qa:sync     # Regenerate outdated artifacts
```

### Deep analysis
```
/qa:analyze  # Find coverage gaps and quality issues
```

### Run tests
```
/test              # Run all tests
/test:coverage     # Coverage analysis
/test:review       # Test quality review
```

### Customize
```
/qa:configure      # Adjust emphasis, thresholds, conventions
```
```

**Step 2: Write architecture.md**

```markdown
# QA Plugin Architecture

## Two-Layer Design

### Meta Layer
Plugin commands (`/qa:*`) that analyze projects and generate/maintain QA artifacts.

### Template Layer
Pre-built skill/agent/command templates customized per project.

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

- Commands: flat `.md` files in `commands/`
- Skills: `SKILL.md` in named subdirectories under `skills/`
- Agents: `AGENT.md` in named subdirectories under `agents/`
- Scripts: Node.js with built-in modules only
```

**Step 3: Commit**

```bash
git add docs/
git commit -m "docs: add getting-started and architecture documentation"
```

---

## Final Verification

After all tasks are complete:

1. Run all script tests: `npm test`
2. Verify plugin structure: `find . -type f | grep -v node_modules | grep -v .git | sort`
3. Check all frontmatter is valid: `node plugins/qa/scripts/verify-setup.js` (on a test project after running init)
4. Run promptfoo tests (requires API key): `npm run test:promptfoo`
