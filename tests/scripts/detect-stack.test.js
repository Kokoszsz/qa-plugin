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

function project(result, projectPath) {
  return (result.projects || []).find(p => p.path === projectPath) || {};
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
    assert(result.testCommand === 'npm test', 'TS+Jest: testCommand runs package.json scripts.test through npm');
    assert(result.packageManager === 'npm', 'TS+Jest: packageManager is npm (package-lock.json)');
    assert((result.projects || []).length === 1 && (result.projects || [{}])[0].path === '.', 'TS+Jest: one project, at the root');
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
    assert(result.coverageTool === 'pytest-cov', 'Python+pytest: coverageTool is pytest-cov');
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
    assert(result.e2eRunner === null, 'Empty: e2eRunner is null');
    assert(result.e2eCommand === null, 'Empty: e2eCommand is null');
    assert(result.coverageTool === null, 'Empty: coverageTool is null');
    assert(result.ci === null, 'Empty: ci is null');
    assert(result.packageManager === null, 'Empty: packageManager is null');
    assert(Array.isArray(result.languages) && result.languages.length === 0, 'Empty: languages is empty');
    assert(Array.isArray(result.projects) && (result.projects || []).length === 0, 'Empty: projects is empty');
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
// Test 6: npm's placeholder test script is not a test command
// ---------------------------------------------------------------------------
(function testNpmDefaultTestScript() {
  const dir = makeTempDir('npm-default');
  try {
    const placeholder = 'echo "Error: no test specified" && exit 1';
    writeFile(dir, 'package.json', JSON.stringify({ scripts: { test: placeholder }, devDependencies: { jest: '^29.0.0' } }));
    let result = runDetect(dir);
    assert(result.testCommand === 'npx jest', 'npm default script: falls back to the detected runner');

    writeFile(dir, 'package.json', JSON.stringify({ scripts: { test: placeholder } }));
    result = runDetect(dir);
    assert(result.testCommand === null, 'npm default script: no runner means no test command');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 7: The test script runs through the project's package manager
// ---------------------------------------------------------------------------
(function testPackageManagerRunSyntax() {
  const dir = makeTempDir('pm-run');
  try {
    writeFile(dir, 'package.json', JSON.stringify({ scripts: { test: 'vitest run' }, devDependencies: { vitest: '^1.0.0' } }));
    writeFile(dir, 'yarn.lock', '');
    let result = runDetect(dir);
    assert(result.packageManager === 'yarn' && result.testCommand === 'yarn test', 'Run syntax: yarn.lock gives yarn test');

    fs.rmSync(path.join(dir, 'yarn.lock'));
    writeFile(dir, 'pnpm-lock.yaml', '');
    result = runDetect(dir);
    assert(result.packageManager === 'pnpm' && result.testCommand === 'pnpm test', 'Run syntax: pnpm-lock.yaml gives pnpm test');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 8: NestJS wins over the Express it builds on
// ---------------------------------------------------------------------------
(function testNestBeforeExpress() {
  const dir = makeTempDir('nest');
  try {
    writeFile(dir, 'package.json', JSON.stringify({ dependencies: { '@nestjs/core': '^10.0.0', express: '^4.18.0' } }));
    const result = runDetect(dir);
    assert(result.framework === 'nestjs', 'NestJS: framework is nestjs, not express');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 9: Unit and E2E runners are reported separately
// ---------------------------------------------------------------------------
(function testSeparateE2eRunner() {
  const dir = makeTempDir('e2e-js');
  try {
    const deps = { vitest: '^1.0.0', '@playwright/test': '^1.40.0' };
    writeFile(dir, 'package.json', JSON.stringify({ scripts: { test: 'vitest run', 'test:e2e': 'playwright test' }, devDependencies: deps }));
    let result = runDetect(dir);
    assert(result.testRunner === 'vitest', 'E2E (JS): unit runner is vitest');
    assert(result.e2eRunner === 'playwright', 'E2E (JS): e2e runner is playwright');
    assert(result.e2eCommand === 'npm run test:e2e', 'E2E (JS): e2e command uses the test:e2e script');

    writeFile(dir, 'package.json', JSON.stringify({ devDependencies: deps }));
    result = runDetect(dir);
    assert(result.e2eCommand === 'npx playwright test', 'E2E (JS): without a script, runs playwright directly');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 10: Python dependencies match by exact name
// ---------------------------------------------------------------------------
(function testExactPythonNames() {
  const dir = makeTempDir('py-names');
  try {
    writeFile(dir, 'requirements.txt', 'django-environ==0.11\nfastapi==0.110.0\nuvicorn[standard]>=0.24\n');
    const result = runDetect(dir);
    assert(result.framework === 'fastapi', 'Exact names: django-environ is not Django');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 11: requirements-dev.txt counts too
// ---------------------------------------------------------------------------
(function testRequirementsDev() {
  const dir = makeTempDir('py-dev-reqs');
  try {
    writeFile(dir, 'requirements.txt', 'Flask>=3.0.0\nFlask-SQLAlchemy>=3.1.1\n');
    writeFile(dir, 'requirements-dev.txt', '# Testing\npytest==7.4.3\npytest-cov==4.1.0\n');
    const result = runDetect(dir);
    assert(result.framework === 'flask', 'Dev requirements: framework is flask');
    assert(result.testRunner === 'pytest', 'Dev requirements: pytest found in requirements-dev.txt');
    assert(result.coverageTool === 'pytest-cov', 'Dev requirements: pytest-cov found in requirements-dev.txt');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 12: A pyproject.toml alone doesn't mean Poetry
// ---------------------------------------------------------------------------
(function testPythonPackageManagers() {
  const dir = makeTempDir('py-pm');
  try {
    writeFile(dir, 'pyproject.toml', '[tool.black]\nline-length = 120\n\n[tool.isort]\nknown_third_party = ["django", "pytest"]\n\n[tool.pytest.ini_options]\ntestpaths = ["tests"]\n');
    writeFile(dir, 'requirements.txt', 'flask==3.0.0\n');
    let result = runDetect(dir);
    assert(result.packageManager === 'pip', 'Python PM: tool-only pyproject + requirements.txt is pip');
    assert(result.testRunner === 'pytest', 'Python PM: [tool.pytest.ini_options] means pytest');
    assert(result.framework === 'flask', 'Python PM: isort config is not a dependency list');

    writeFile(dir, 'pyproject.toml', '[tool.poetry]\nname = "app"\n\n[tool.poetry.dependencies]\npython = "^3.11"\nfastapi = "^0.110"\n');
    fs.rmSync(path.join(dir, 'requirements.txt'));
    result = runDetect(dir);
    assert(result.packageManager === 'poetry', 'Python PM: [tool.poetry] is poetry');
    assert(result.framework === 'fastapi', 'Python PM: poetry dependency table is read');

    writeFile(dir, 'pyproject.toml', '[project]\nname = "app"\ndependencies = [\n  "django>=5.0",\n]\n\n[dependency-groups]\ndev = ["pytest>=8"]\n');
    writeFile(dir, 'uv.lock', '');
    result = runDetect(dir);
    assert(result.packageManager === 'uv', 'Python PM: uv.lock is uv');
    assert(result.framework === 'django' && result.testRunner === 'pytest', 'Python PM: PEP 621 and dependency-groups are read');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 13: Playwright for Python and Selenium are E2E runners
// ---------------------------------------------------------------------------
(function testPythonE2e() {
  const dir = makeTempDir('py-e2e');
  try {
    writeFile(dir, 'requirements.txt', 'playwright==1.55.0\npytest==7.4.3\npytest-playwright==0.7.1\nselenium==4.9.1\n');
    let result = runDetect(dir);
    assert(result.testRunner === 'pytest', 'Python E2E: unit runner is pytest');
    assert(result.e2eRunner === 'playwright', 'Python E2E: playwright recognised');
    assert(result.e2eCommand === 'pytest', 'Python E2E: e2e tests run through pytest');

    writeFile(dir, 'requirements.txt', 'selenium==4.9.1\npytest==7.4.3\n');
    result = runDetect(dir);
    assert(result.e2eRunner === 'selenium', 'Python E2E: selenium recognised');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 14: Kotlin with Gradle, and Maven
// ---------------------------------------------------------------------------
(function testJvm() {
  const dir = makeTempDir('jvm');
  try {
    writeFile(dir, 'build.gradle.kts', 'plugins {\n  kotlin("jvm") version "1.9.22"\n}\ndependencies {\n  testImplementation("org.junit.jupiter:junit-jupiter:5.10.0")\n}\n');
    writeFile(dir, 'gradlew', '#!/bin/sh\n');
    writeFile(dir, 'src/main/kotlin/App.kt', 'fun main() {}\n');
    let result = runDetect(dir);
    assert(result.language === 'kotlin', 'JVM: Kotlin Gradle project is kotlin, not java');
    assert(result.testRunner === 'junit', 'JVM: junit from testImplementation');
    assert(result.testCommand === './gradlew test', 'JVM: Gradle wrapper, not mvn test');
    assert(result.packageManager === 'gradle', 'JVM: packageManager is gradle');

    cleanup(dir);
    fs.mkdirSync(dir);
    writeFile(dir, 'pom.xml', '<project><!-- kotlin later --><parent><groupId>org.springframework.boot</groupId></parent>'
      + '<dependencies><dependency><artifactId>spring-boot-starter-test</artifactId></dependency></dependencies></project>');
    writeFile(dir, 'src/main/java/App.java', 'class App {}\n');
    result = runDetect(dir);
    assert(result.language === 'java', 'JVM: Maven project is java (XML comments ignored)');
    assert(result.framework === 'spring-boot', 'JVM: spring-boot detected');
    assert(result.testRunner === 'junit', 'JVM: spring-boot-starter-test brings junit');
    assert(result.testCommand === 'mvn test', 'JVM: mvn test without a wrapper');
    writeFile(dir, 'mvnw', '#!/bin/sh\n');
    result = runDetect(dir);
    assert(result.testCommand === './mvnw test', 'JVM: ./mvnw test with the Maven wrapper');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 15: No test framework means no test runner (but Gradle still has a
// test task); comments don't count as dependencies
// ---------------------------------------------------------------------------
(function testGradleWithoutTests() {
  const dir = makeTempDir('gradle-no-tests');
  try {
    writeFile(dir, 'build.gradle', "// TODO: migrate to Kotlin and add junit\napply plugin: 'java'\n");
    writeFile(dir, 'src/main/java/App.java', 'class App {}\n');
    const result = runDetect(dir);
    assert(result.language === 'java', 'Gradle no tests: comment mentioning Kotlin is ignored');
    assert(result.testRunner === null, 'Gradle no tests: no runner is assumed');
    assert(result.testCommand === 'gradle test', 'Gradle no tests: gradle test without a wrapper');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 16: Monorepo — Flask backend/ + Next.js frontend/ + a stray root
// lockfile (the SE-project layout)
// ---------------------------------------------------------------------------
(function testMonorepo() {
  const dir = makeTempDir('monorepo');
  try {
    writeFile(dir, 'package-lock.json', '{"name":"repo","lockfileVersion":3,"packages":{}}');
    writeFile(dir, '.github/workflows/ci.yml', 'on: push\n');
    writeFile(dir, 'backend/requirements.txt', 'Flask>=3.0.0\nFlask-SQLAlchemy>=3.1.1\n');
    writeFile(dir, 'backend/requirements-dev.txt', 'pytest==7.4.3\npytest-cov==4.1.0\n');
    writeFile(dir, 'backend/pyproject.toml', '[tool.isort]\nknown_third_party = ["flask", "fastapi", "pytest"]\n\n[tool.pytest.ini_options]\ntestpaths = ["tests"]\n');
    for (const f of ['app/__init__.py', 'app/routes.py', 'app/models.py', 'app/services.py', 'tests/test_routes.py']) {
      writeFile(dir, `backend/${f}`, 'x = 1\n');
    }
    writeFile(dir, 'frontend/package.json', JSON.stringify({
      scripts: { test: 'jest', 'test:e2e': 'playwright test' },
      dependencies: { next: '14.0.4', react: '^18.2.0' },
      devDependencies: { jest: '^29.7.0', '@playwright/test': '^1.57.0', typescript: '^5.3.3' },
    }));
    writeFile(dir, 'frontend/package-lock.json', '{}');
    writeFile(dir, 'frontend/tsconfig.json', '{}');
    writeFile(dir, 'frontend/src/app/page.tsx', 'export default function Page() {}\n');
    writeFile(dir, 'frontend/tests/e2e/login.spec.ts', 'test("login", async () => {});\n');

    const result = runDetect(dir);

    assert(result.language === 'python', 'Monorepo: language is python (most code files)');
    assert(JSON.stringify(result.languages) === '["python","typescript"]', 'Monorepo: languages are python, typescript');
    assert(result.framework === 'flask', 'Monorepo: framework is flask (backend/requirements.txt)');
    assert(result.testRunner === 'pytest', 'Monorepo: testRunner is pytest');
    assert(result.testCommand === 'cd backend && pytest', 'Monorepo: testCommand runs from the repo root');
    assert(result.coverageTool === 'pytest-cov', 'Monorepo: coverageTool is pytest-cov');
    assert(result.packageManager === 'pip', 'Monorepo: packageManager is pip, not npm from the stray lockfile');
    assert(result.e2eRunner === 'playwright', 'Monorepo: e2eRunner is playwright (frontend)');
    assert(result.e2eCommand === 'cd frontend && npm run test:e2e', 'Monorepo: e2eCommand runs from the repo root');
    assert(result.ci === 'github-actions', 'Monorepo: ci is github-actions');
    assert(JSON.stringify((result.projects || []).map(p => p.path).sort()) === '["backend","frontend"]', 'Monorepo: projects are backend and frontend, no root project');
    const frontend = project(result, 'frontend');
    assert(frontend.language === 'typescript' && frontend.framework === 'next', 'Monorepo: frontend is typescript/next');
    assert(frontend.testRunner === 'jest' && frontend.testCommand === 'cd frontend && npm test', 'Monorepo: frontend unit tests are jest via npm test');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 17: Kotlin Android app with an app/ module (the birthday-sms layout)
// ---------------------------------------------------------------------------
(function testAndroidModules() {
  const dir = makeTempDir('android');
  try {
    writeFile(dir, 'settings.gradle.kts', 'rootProject.name = "BirthdaySMS"\ninclude(":app")\n');
    writeFile(dir, 'build.gradle.kts', 'plugins {\n  id("com.android.application") version "8.2.2" apply false\n  id("org.jetbrains.kotlin.android") version "1.9.22" apply false\n}\n');
    writeFile(dir, 'gradlew', '#!/bin/sh\n');
    writeFile(dir, 'app/build.gradle.kts', 'plugins {\n  id("com.android.application")\n  id("org.jetbrains.kotlin.android")\n}\nandroid { namespace = "com.example" }\n'
      + 'dependencies { implementation("androidx.core:core-ktx:1.12.0") }\n');
    for (const f of ['MainActivity.kt', 'data/Contact.kt', 'data/ContactDao.kt']) {
      writeFile(dir, `app/src/main/java/com/example/${f}`, 'package com.example\n');
    }

    const result = runDetect(dir);

    assert(result.language === 'kotlin', 'Android: language is kotlin');
    assert(result.framework === 'android', 'Android: framework is android');
    assert(result.testRunner === null, 'Android: no test framework declared, so no runner');
    assert(result.testCommand === './gradlew test', 'Android: ./gradlew test from the root');
    assert(result.packageManager === 'gradle', 'Android: packageManager is gradle');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 18: Tool-only pyproject at the root, app and browser tests in
// sub-folders (the Cloth-Shop layout)
// ---------------------------------------------------------------------------
(function testRootConfigWithSubprojects() {
  const dir = makeTempDir('shop');
  try {
    writeFile(dir, 'pyproject.toml', '[tool.pytest.ini_options]\ntestpaths = ["shop/tests"]\n\n[tool.coverage.run]\nsource = ["shop"]\n');
    writeFile(dir, '.github/workflows/tests.yml', 'on: push\n');
    writeFile(dir, 'shop/requirements.txt', 'flask-smorest==0.47.0\nFlask==3.1.2\npytest-cov==4.1.0\npytest==7.4.3\n');
    for (const f of ['app.py', 'blueprints/catalogue.py', 'blueprints/basket.py', 'tests/test_catalogue.py']) {
      writeFile(dir, `shop/${f}`, 'x = 1\n');
    }
    writeFile(dir, 'automation-tests/requirements.txt', 'playwright==1.55.0\npytest==7.4.3\npytest-playwright==0.7.1\nselenium==4.9.1\n');
    writeFile(dir, 'automation-tests/selenium/test_login.py', 'x = 1\n');

    const result = runDetect(dir);

    assert(result.language === 'python', 'Root config: language is python');
    assert(result.framework === 'flask', 'Root config: framework is flask (shop/requirements.txt)');
    assert(result.testRunner === 'pytest', 'Root config: testRunner is pytest');
    assert(result.testCommand === 'pytest', 'Root config: root pytest config runs from the root');
    assert(result.coverageTool === 'pytest-cov', 'Root config: pytest-cov dependency beats bare coverage config');
    assert(result.packageManager === 'pip', 'Root config: packageManager is pip, not poetry');
    assert(result.e2eRunner === 'playwright', 'Root config: e2eRunner is playwright');
    assert(result.e2eCommand === 'cd automation-tests && pytest', 'Root config: e2e tests run in automation-tests');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 19: No manifest at all — language from file extensions, in a folder
// with a space in its name (the discord-bot layout)
// ---------------------------------------------------------------------------
(function testExtensionFallback() {
  const dir = makeTempDir('no-manifest');
  try {
    writeFile(dir, 'README.md', '# Bot\n');
    for (const f of ['bot/main.py', 'bot/dice.py', 'physics/hall.py']) {
      writeFile(dir, `discord bot/${f}`, 'x = 1\n');
    }

    const result = runDetect(dir);

    assert(result.language === 'python', 'Extension fallback: language is python');
    assert((result.projects || []).length === 1, 'Extension fallback: one project');
    assert((result.projects || [{}])[0].path === '.' && (result.projects || [{}])[0].detectedBy === 'file-extensions', 'Extension fallback: root project found by file extensions');
    assert((result.projects || [{}])[0].fileCount === 3, 'Extension fallback: counts the 3 Python files');
    assert(result.testCommand === null, 'Extension fallback: no test command is invented');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 20: requirements.txt in a docs folder, code elsewhere (the job-agent
// layout)
// ---------------------------------------------------------------------------
(function testManifestAwayFromCode() {
  const dir = makeTempDir('docs-manifest');
  try {
    writeFile(dir, 'documentation/requirements.txt', 'fastapi==0.115.12\nopenai==1.35.13\nrequests==2.31.0\n');
    for (const f of ['backend/fastapi_backend.py', 'backend/models.py', 'frontend/main.py']) {
      writeFile(dir, f, 'x = 1\n');
    }

    const result = runDetect(dir);

    assert(result.language === 'python', 'Manifest away from code: language is python');
    assert(result.framework === 'fastapi', 'Manifest away from code: framework from documentation/requirements.txt');
    assert(result.packageManager === 'pip', 'Manifest away from code: packageManager is pip');
    assert(project(result, 'documentation').detectedBy === 'manifest', 'Manifest away from code: documentation/ project from its manifest');
    assert(project(result, '.').detectedBy === 'file-extensions' && project(result, '.').fileCount === 3, 'Manifest away from code: the code itself is a root project');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 21: Virtual environments and node_modules are not the project's code
// ---------------------------------------------------------------------------
(function testSkipsEnvironments() {
  const dir = makeTempDir('venv');
  try {
    writeFile(dir, 'main.py', 'x = 1\n');
    writeFile(dir, 'utils.py', 'x = 1\n');
    writeFile(dir, 'env/pyvenv.cfg', 'home = C:/Python311\n');
    writeFile(dir, 'env/requirements.txt', 'django==5.0\n');
    for (let i = 1; i <= 5; i++) writeFile(dir, `env/Lib/site-packages/somepkg/mod${i}.py`, 'x = 1\n');
    writeFile(dir, 'node_modules/left-pad/package.json', '{"name":"left-pad"}');
    writeFile(dir, 'node_modules/left-pad/index.js', 'module.exports = 1;\n');

    const result = runDetect(dir);

    assert(JSON.stringify(result.languages) === '["python"]', 'Environments: only python is reported');
    assert((result.projects || []).length === 1 && (result.projects || [{}])[0].path === '.', 'Environments: no projects inside env/ or node_modules/');
    assert((result.projects || [{}])[0].fileCount === 2, 'Environments: only the 2 project files are counted');
    assert(result.framework === null, 'Environments: django inside the virtualenv is ignored');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 22: Sub-project paths with spaces are quoted in commands
// ---------------------------------------------------------------------------
(function testQuotedPaths() {
  const dir = makeTempDir('spaces');
  try {
    writeFile(dir, 'web app/package.json', JSON.stringify({ scripts: { test: 'vitest run' }, devDependencies: { vitest: '^1.0.0' } }));
    writeFile(dir, 'web app/src/index.js', 'export {};\n');
    const result = runDetect(dir);
    assert(result.testCommand === 'cd "web app" && npm test', 'Quoted paths: cd "web app" && npm test');
  } finally {
    cleanup(dir);
  }
})();

// ---------------------------------------------------------------------------
// Test 23: A Gradle module runs its tests through the root wrapper
// ---------------------------------------------------------------------------
(function testGradleModule() {
  const dir = makeTempDir('gradle-module');
  try {
    writeFile(dir, 'settings.gradle.kts', 'rootProject.name = "svc"\ninclude(":app")\n');
    writeFile(dir, 'gradlew', '#!/bin/sh\n');
    writeFile(dir, 'app/build.gradle.kts', 'plugins { kotlin("jvm") }\ndependencies { testImplementation("org.junit.jupiter:junit-jupiter:5.10.0") }\n');
    writeFile(dir, 'app/src/main/kotlin/Main.kt', 'fun main() {}\n');
    writeFile(dir, 'app/src/test/kotlin/MainTest.kt', 'class MainTest\n');

    const result = runDetect(dir);

    assert(result.language === 'kotlin', 'Gradle module: language is kotlin');
    assert(result.testRunner === 'junit', 'Gradle module: junit from the app module');
    assert(result.testCommand === './gradlew test', 'Gradle module: the root wrapper runs every module');
    assert(project(result, 'app').testCommand === './gradlew :app:test', 'Gradle module: the module alone runs as ./gradlew :app:test');
    assert(project(result, '.').language === 'kotlin', 'Gradle module: the root build counts its modules\' Kotlin files');
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
