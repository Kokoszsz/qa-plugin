#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');

const SCRIPT = path.resolve(__dirname, '..', '..', 'plugins', 'qa', 'scripts', 'analyze-tests.js');

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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `analyze-tests-test-${label}-`));
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

function runAnalyze(projectRoot, language) {
  const cmd = `node "${SCRIPT}" --project-root "${projectRoot}" --language "${language}" --json`;
  const output = execSync(cmd, { encoding: 'utf8', timeout: 10000 });
  return JSON.parse(output.trim());
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Test 1: TypeScript project with Jest tests (colocated *.test.ts files)
// ---------------------------------------------------------------------------
(function testTypescriptJestColocated() {
  const dir = makeTempDir('ts-jest');
  try {
    writeFile(dir, 'tsconfig.json', JSON.stringify({ compilerOptions: { strict: true } }));
    writeFile(dir, 'package.json', JSON.stringify({
      name: 'ts-jest-project',
      devDependencies: { jest: '^29.0.0', 'ts-jest': '^29.0.0' }
    }));

    // Source files
    writeFile(dir, 'src/app.ts', 'export function hello() { return "hi"; }');
    writeFile(dir, 'src/utils.ts', 'export function add(a: number, b: number) { return a + b; }');
    writeFile(dir, 'src/index.ts', 'import { hello } from "./app"; console.log(hello());');

    // Colocated test files
    writeFile(dir, 'src/app.test.ts', 'import { hello } from "./app"; test("hello", () => { expect(hello()).toBe("hi"); });');
    writeFile(dir, 'src/utils.test.ts', 'import { add } from "./utils"; test("add", () => { expect(add(1,2)).toBe(3); });');

    // A mock directory
    writeFile(dir, 'src/__mocks__/fs.ts', 'export default {};');

    const result = runAnalyze(dir, 'typescript');

    assert(result.hasTests === true, 'TS+Jest: hasTests is true');
    assert(result.testFileCount === 2, 'TS+Jest: testFileCount is 2');
    assert(result.sourceFileCount === 3, 'TS+Jest: sourceFileCount is 3');
    assert(Array.isArray(result.testFiles), 'TS+Jest: testFiles is array');
    assert(result.testFiles.length === 2, 'TS+Jest: testFiles has 2 entries');
    assert(result.testFiles.some(f => f.endsWith('app.test.ts')), 'TS+Jest: testFiles includes app.test.ts');
    assert(result.testFiles.some(f => f.endsWith('utils.test.ts')), 'TS+Jest: testFiles includes utils.test.ts');
    assert(Array.isArray(result.patterns), 'TS+Jest: patterns is array');
    assert(result.patterns.some(p => p.includes('.test.ts')), 'TS+Jest: patterns includes .test.ts pattern');
    assert(result.conventions.testLocation === 'colocated', 'TS+Jest: convention testLocation is colocated');
    assert(result.conventions.hasMocks === true, 'TS+Jest: convention hasMocks is true');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 2: Project with no tests
// ---------------------------------------------------------------------------
(function testNoTests() {
  const dir = makeTempDir('no-tests');
  try {
    writeFile(dir, 'package.json', JSON.stringify({ name: 'no-tests-project' }));
    writeFile(dir, 'src/index.ts', 'console.log("hello");');
    writeFile(dir, 'src/utils.ts', 'export const x = 1;');

    const result = runAnalyze(dir, 'typescript');

    assert(result.hasTests === false, 'NoTests: hasTests is false');
    assert(result.testFileCount === 0, 'NoTests: testFileCount is 0');
    assert(result.sourceFileCount === 2, 'NoTests: sourceFileCount is 2');
    assert(Array.isArray(result.testFiles), 'NoTests: testFiles is array');
    assert(result.testFiles.length === 0, 'NoTests: testFiles is empty');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 3: Python project with pytest tests (tests/ directory)
// ---------------------------------------------------------------------------
(function testPythonPytest() {
  const dir = makeTempDir('py-pytest');
  try {
    writeFile(dir, 'requirements.txt', 'pytest==7.4.0\n');
    writeFile(dir, 'setup.py', 'from setuptools import setup\nsetup(name="myapp")');

    // Source files
    writeFile(dir, 'myapp/__init__.py', '');
    writeFile(dir, 'myapp/core.py', 'def compute(): return 42');
    writeFile(dir, 'myapp/utils.py', 'def helper(): pass');

    // Separate tests directory
    writeFile(dir, 'tests/__init__.py', '');
    writeFile(dir, 'tests/test_core.py', 'from myapp.core import compute\ndef test_compute():\n    assert compute() == 42');
    writeFile(dir, 'tests/test_utils.py', 'from myapp.utils import helper\ndef test_helper():\n    assert helper() is None');
    writeFile(dir, 'tests/conftest.py', 'import pytest\n@pytest.fixture\ndef sample():\n    return 1');

    // Fixtures directory
    writeFile(dir, 'tests/fixtures/sample.json', '{"key": "value"}');

    const result = runAnalyze(dir, 'python');

    assert(result.hasTests === true, 'Python: hasTests is true');
    assert(result.testFileCount === 2, 'Python: testFileCount is 2 (test_core.py, test_utils.py)');
    assert(result.sourceFileCount >= 2, 'Python: sourceFileCount >= 2');
    assert(result.testFiles.some(f => f.endsWith('test_core.py')), 'Python: testFiles includes test_core.py');
    assert(result.testFiles.some(f => f.endsWith('test_utils.py')), 'Python: testFiles includes test_utils.py');
    assert(result.patterns.some(p => p.includes('test_')), 'Python: patterns includes test_ pattern');
    assert(result.conventions.testLocation === 'separate', 'Python: convention testLocation is separate');
    assert(result.conventions.hasFixtures === true, 'Python: convention hasFixtures is true');
    assert(result.conventions.hasConftest === true, 'Python: convention hasConftest is true');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 4: Programmatic API
// ---------------------------------------------------------------------------
(function testProgrammaticAPI() {
  const { analyze } = require(SCRIPT);
  assert(typeof analyze === 'function', 'Programmatic: analyze is exported as a function');

  const dir = makeTempDir('api');
  try {
    writeFile(dir, 'src/index.ts', 'export const x = 1;');
    writeFile(dir, 'src/index.test.ts', 'test("x", () => {});');

    const result = analyze(dir, 'typescript');
    assert(result.hasTests === true, 'Programmatic: analyze() returns correct result');
    assert(result.testFileCount === 1, 'Programmatic: testFileCount is 1');
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
