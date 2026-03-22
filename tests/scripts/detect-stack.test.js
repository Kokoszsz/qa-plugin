#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');

const SCRIPT = path.resolve(__dirname, '..', '..', 'plugins', 'qa', 'scripts', 'detect-stack.js');

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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `detect-stack-test-${label}-`));
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

function runDetect(projectRoot) {
  const cmd = `node "${SCRIPT}" --project-root "${projectRoot}" --json`;
  const output = execSync(cmd, { encoding: 'utf8', timeout: 10000 });
  return JSON.parse(output.trim());
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Test 1: TypeScript + Jest project
// ---------------------------------------------------------------------------
(function testTypescriptJest() {
  const dir = makeTempDir('ts-jest');
  try {
    writeFile(dir, 'tsconfig.json', JSON.stringify({ compilerOptions: { strict: true } }));
    writeFile(dir, 'jest.config.ts', 'export default { preset: "ts-jest" };');
    writeFile(dir, 'package.json', JSON.stringify({
      name: 'ts-jest-project',
      scripts: { test: 'jest --coverage' },
      devDependencies: {
        typescript: '^5.0.0',
        jest: '^29.0.0',
        'ts-jest': '^29.0.0'
      }
    }));
    writeFile(dir, 'package-lock.json', '{}');

    const result = runDetect(dir);

    assert(result.language === 'typescript', 'TS+Jest: language is typescript');
    assert(result.testRunner === 'jest', 'TS+Jest: testRunner is jest');
    assert(result.testCommand === 'jest --coverage', 'TS+Jest: testCommand from package.json scripts.test');
    assert(result.packageManager === 'npm', 'TS+Jest: packageManager is npm (package-lock.json)');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 2: Python + pytest project
// ---------------------------------------------------------------------------
(function testPythonPytest() {
  const dir = makeTempDir('py-pytest');
  try {
    writeFile(dir, 'requirements.txt', 'flask==2.3.0\npytest==7.4.0\npytest-cov==4.1.0\n');
    writeFile(dir, 'setup.py', 'from setuptools import setup\nsetup(name="myapp")');
    writeFile(dir, 'pytest.ini', '[pytest]\ntestpaths = tests\n');

    const result = runDetect(dir);

    assert(result.language === 'python', 'Python+pytest: language is python');
    assert(result.framework === 'flask', 'Python+pytest: framework is flask');
    assert(result.testRunner === 'pytest', 'Python+pytest: testRunner is pytest');
    assert(result.packageManager === 'pip', 'Python+pytest: packageManager is pip');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 3: Go project
// ---------------------------------------------------------------------------
(function testGo() {
  const dir = makeTempDir('go');
  try {
    writeFile(dir, 'go.mod', 'module example.com/myapp\n\ngo 1.21\n');
    writeFile(dir, 'main.go', 'package main\nfunc main() {}\n');
    writeFile(dir, 'handler_test.go', 'package main\nimport "testing"\nfunc TestHandler(t *testing.T) {}\n');

    const result = runDetect(dir);

    assert(result.language === 'go', 'Go: language is go');
    assert(result.testRunner === 'go test', 'Go: testRunner is go test');
    assert(result.testCommand === 'go test ./...', 'Go: testCommand is go test ./...');
    assert(result.packageManager === 'go modules', 'Go: packageManager is go modules');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 4: Empty project
// ---------------------------------------------------------------------------
(function testEmpty() {
  const dir = makeTempDir('empty');
  try {
    const result = runDetect(dir);

    assert(result.language === null, 'Empty: language is null');
    assert(result.framework === null, 'Empty: framework is null');
    assert(result.testRunner === null, 'Empty: testRunner is null');
    assert(result.testCommand === null, 'Empty: testCommand is null');
    assert(result.coverageTool === null, 'Empty: coverageTool is null');
    assert(result.ci === null, 'Empty: ci is null');
    assert(result.packageManager === null, 'Empty: packageManager is null');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 5: Programmatic API
// ---------------------------------------------------------------------------
(function testProgrammaticAPI() {
  const { detect } = require(SCRIPT);
  assert(typeof detect === 'function', 'Programmatic: detect is exported as a function');

  const dir = makeTempDir('api');
  try {
    writeFile(dir, 'go.mod', 'module example.com/app\n\ngo 1.22\n');
    const result = detect(dir);
    assert(result.language === 'go', 'Programmatic: detect() returns correct result');
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
