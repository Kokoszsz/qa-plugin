#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Manifests are looked for in the root and up to this many folders below it,
// which covers backend/ + frontend/ and packages/<name>/ layouts.
const MANIFEST_DEPTH = 2;

// Stop counting code files after this many files, so huge repos stay fast.
const MAX_FILES = 20000;

// Folders that hold dependencies or build output rather than the project's
// own code. Hidden folders (.git, .venv, .next, ...) and Python virtual
// environments (any folder with a pyvenv.cfg) are skipped as well.
const SKIP_DIRS = new Set([
  'node_modules', 'bower_components', 'vendor', '__pycache__', 'venv', 'site-packages',
  'dist', 'build', 'out', 'target', 'obj', 'coverage', 'tmp',
]);

// Code-file extensions per language
const LANGUAGE_EXTENSIONS = {
  typescript: ['.ts', '.tsx', '.mts', '.cts'],
  javascript: ['.js', '.jsx', '.mjs', '.cjs'],
  python: ['.py'],
  go: ['.go'],
  rust: ['.rs'],
  java: ['.java'],
  kotlin: ['.kt'],
  ruby: ['.rb'],
  php: ['.php'],
  csharp: ['.cs'],
  swift: ['.swift'],
  dart: ['.dart'],
  elixir: ['.ex', '.exs'],
};

const EXTENSION_LANGUAGE = new Map(
  Object.entries(LANGUAGE_EXTENSIONS).flatMap(([language, exts]) => exts.map(ext => [ext, language])),
);

// Languages that share one kind of project: a TypeScript project owns its
// .js files too, and Gradle/Maven projects mix Kotlin and Java.
const LANGUAGE_FAMILY = { typescript: 'js', javascript: 'js', kotlin: 'jvm', java: 'jvm' };

const JVM_BUILD_FILES = ['build.gradle.kts', 'build.gradle', 'settings.gradle.kts', 'settings.gradle', 'pom.xml'];

// What makes a folder a project, per ecosystem, and how to describe one.
// Every ecosystem found in a folder becomes its own project, so a root with
// both package.json and requirements.txt yields two.
const ECOSYSTEMS = {
  node: { family: 'js', isPresent: dir => fileExists(dir, 'package.json'), describe: detectNode },
  python: { family: 'python', isPresent: dir => hasPythonManifest(dir), describe: detectPython },
  go: { family: 'go', isPresent: dir => fileExists(dir, 'go.mod'), describe: detectGo },
  rust: { family: 'rust', isPresent: dir => fileExists(dir, 'Cargo.toml'), describe: detectRust },
  jvm: { family: 'jvm', isPresent: dir => JVM_BUILD_FILES.some(f => fileExists(dir, f)), describe: detectJvm },
  ruby: { family: 'ruby', isPresent: dir => fileExists(dir, 'Gemfile'), describe: detectRuby },
  php: { family: 'php', isPresent: dir => fileExists(dir, 'composer.json'), describe: detectPhp },
  elixir: { family: 'elixir', isPresent: dir => fileExists(dir, 'mix.exs'), describe: detectElixir },
  swift: { family: 'swift', isPresent: dir => fileExists(dir, 'Package.swift'), describe: detectSwift },
  dart: { family: 'dart', isPresent: dir => fileExists(dir, 'pubspec.yaml'), describe: detectDart },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fileExists(root, ...segments) {
  return fs.existsSync(path.join(root, ...segments));
}

function readFileOpt(root, ...segments) {
  const p = path.join(root, ...segments);
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

function readJsonOpt(root, ...segments) {
  const raw = readFileOpt(root, ...segments);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function dirExists(root, ...segments) {
  const p = path.join(root, ...segments);
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function readDirOpt(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function familyOf(language) {
  return LANGUAGE_FAMILY[language] || language;
}

function isSkippedDir(parent, name) {
  return name.startsWith('.') || SKIP_DIRS.has(name) || fileExists(parent, name, 'pyvenv.cfg');
}

function languageOfFile(name) {
  if (name.endsWith('.d.ts')) return null;
  return EXTENSION_LANGUAGE.get(path.extname(name).toLowerCase()) || null;
}

function sum(counts) {
  return Object.values(counts).reduce((total, n) => total + n, 0);
}

// Every command is reported so it runs from the repo root, so a command for a
// sub-project starts with "cd <folder> && ".
function runFrom(root, cwd, command) {
  if (!command) return null;
  const rel = path.relative(root, cwd).split(path.sep).join('/');
  if (!rel) return command;
  return `cd ${/^[\w./-]+$/.test(rel) ? rel : `"${rel}"`} && ${command}`;
}

// ---------------------------------------------------------------------------
// Node.js
// ---------------------------------------------------------------------------

// More specific frameworks first: Next.js projects also depend on React, and
// NestJS projects on Express.
const NODE_FRAMEWORKS = [
  ['next', ['next']],
  ['nuxt', ['nuxt', 'nuxt3']],
  ['angular', ['@angular/core']],
  ['svelte', ['svelte', '@sveltejs/kit']],
  ['vue', ['vue']],
  ['react', ['react']],
  ['nestjs', ['@nestjs/core']],
  ['express', ['express']],
  ['fastify', ['fastify']],
  ['koa', ['koa']],
  ['hapi', ['hapi', '@hapi/hapi']],
];

const NODE_UNIT_RUNNERS = [
  { name: 'vitest', deps: ['vitest'], configs: ['vitest.config.ts', 'vitest.config.js', 'vitest.config.mts', 'vitest.config.mjs'], command: 'npx vitest run' },
  { name: 'jest', deps: ['jest'], configs: ['jest.config.ts', 'jest.config.js', 'jest.config.mjs', 'jest.config.cjs'], command: 'npx jest' },
  { name: 'mocha', deps: ['mocha'], configs: ['.mocharc.yml', '.mocharc.yaml', '.mocharc.json', '.mocharc.js'], command: 'npx mocha' },
  { name: 'ava', deps: ['ava'], configs: [], command: 'npx ava' },
  { name: 'tap', deps: ['tap'], configs: [], command: 'npx tap' },
];

const NODE_E2E_RUNNERS = [
  { name: 'playwright', deps: ['@playwright/test'], configs: ['playwright.config.ts', 'playwright.config.js'], command: 'npx playwright test' },
  { name: 'cypress', deps: ['cypress'], configs: ['cypress.config.ts', 'cypress.config.js', 'cypress.json'], command: 'npx cypress run' },
  { name: 'selenium', deps: ['selenium-webdriver'], configs: [], command: null },
];

const NODE_E2E_SCRIPTS = ['test:e2e', 'e2e', 'test:playwright', 'test:cypress', 'cypress:run'];

const NODE_LOCKFILES = [
  ['bun.lockb', 'bun'], ['bun.lock', 'bun'], ['pnpm-lock.yaml', 'pnpm'], ['yarn.lock', 'yarn'], ['package-lock.json', 'npm'],
];

// The script `npm init` writes, which only fails
const NPM_PLACEHOLDER_TEST = /no test specified/;

function findRunner(runners, dir, deps) {
  return runners.find(r => r.deps.some(d => deps[d]) || r.configs.some(c => fileExists(dir, c))) || null;
}

// Workspaces keep one lockfile at the top, so look upward from the project.
function nodePackageManager(root, dir) {
  for (let current = dir; ; current = path.dirname(current)) {
    const hit = NODE_LOCKFILES.find(([file]) => fileExists(current, file));
    if (hit) return hit[1];
    if (current === root || path.dirname(current) === current) return 'npm';
  }
}

function runScript(packageManager, script) {
  if (packageManager === 'bun') return `bun run ${script}`;
  if (packageManager === 'yarn') return `yarn ${script}`;
  if (packageManager === 'pnpm') return script === 'test' ? 'pnpm test' : `pnpm run ${script}`;
  return script === 'test' ? 'npm test' : `npm run ${script}`;
}

function nodeCoverageTool(deps, scripts) {
  if (deps.c8) return 'c8';
  if (deps.nyc || deps.istanbul) return 'nyc';
  if (deps['@vitest/coverage-v8'] || deps['@vitest/coverage-istanbul']) return 'vitest --coverage';
  if (deps.jest && Object.values(scripts).some(s => /\bjest\b.*--coverage/.test(s))) return 'jest --coverage';
  return null;
}

function detectNode({ root, dir }) {
  const pkg = readJsonOpt(dir, 'package.json') || {};
  const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
  const scripts = pkg.scripts || {};
  const packageManager = nodePackageManager(root, dir);

  const unit = findRunner(NODE_UNIT_RUNNERS, dir, deps) || (pkg.jest ? NODE_UNIT_RUNNERS.find(r => r.name === 'jest') : null);
  const e2e = findRunner(NODE_E2E_RUNNERS, dir, deps);
  const hasTestScript = Boolean(scripts.test) && !NPM_PLACEHOLDER_TEST.test(scripts.test);
  const e2eScript = NODE_E2E_SCRIPTS.find(s => scripts[s]);

  return {
    language: fileExists(dir, 'tsconfig.json') ? 'typescript' : 'javascript',
    framework: (NODE_FRAMEWORKS.find(([, names]) => names.some(n => deps[n])) || [null])[0],
    testRunner: unit ? unit.name : null,
    testCommand: runFrom(root, dir, hasTestScript ? runScript(packageManager, 'test') : unit && unit.command),
    e2eRunner: e2e ? e2e.name : null,
    e2eCommand: runFrom(root, dir, e2eScript ? runScript(packageManager, e2eScript) : e2e && e2e.command),
    coverageTool: nodeCoverageTool(deps, scripts),
    packageManager,
  };
}

// ---------------------------------------------------------------------------
// Python
// ---------------------------------------------------------------------------

// requirements.txt, requirements-dev.txt, dev-requirements.txt, ...
const REQUIREMENTS_FILE = /^(?:[\w.-]*[-_])?requirements(?:[-_.][\w.-]*)?\.txt$/i;

const PYTHON_FRAMEWORKS = ['django', 'flask', 'fastapi'];

// PEP 503: names compare case-insensitively, with runs of - _ . equal
function normalizePythonName(name) {
  return name.toLowerCase().replace(/[-_.]+/g, '-');
}

// "Flask-SQLAlchemy>=3.1  # ORM" -> "flask-sqlalchemy"
function requirementName(spec) {
  const trimmed = spec.replace(/(^|\s)#.*$/, '').trim();
  if (!trimmed || trimmed.startsWith('-')) return null;
  const m = trimmed.match(/^([A-Za-z0-9][A-Za-z0-9._-]*)/);
  return m ? normalizePythonName(m[1]) : null;
}

function hasPythonManifest(dir) {
  return readDirOpt(dir).some(e => e.isFile() && (REQUIREMENTS_FILE.test(e.name) || ['pyproject.toml', 'setup.py', 'Pipfile'].includes(e.name)))
    || dirExists(dir, 'requirements');
}

// True once every [ in text is closed, ignoring brackets in strings and comments
function bracketsClosed(text) {
  let depth = 0;
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '#') {
      const eol = text.indexOf('\n', i);
      if (eol === -1) break;
      i = eol;
    } else if (ch === '[') {
      depth++;
    } else if (ch === ']') {
      depth--;
    }
  }
  return depth <= 0;
}

function isDependencyTable(table) {
  return /^tool\.poetry\.(?:dev-)?dependencies$/.test(table)
    || /^tool\.poetry\.group\.[\w-]+\.dependencies$/.test(table)
    || table === 'packages' || table === 'dev-packages';
}

function isDependencyArray(table, key) {
  return (table === 'project' && key === 'dependencies')
    || table === 'project.optional-dependencies'
    || table === 'dependency-groups'
    || table === 'tool.pdm.dev-dependencies'
    || (table === 'tool.uv' && key === 'dev-dependencies');
}

// Reads dependency names from pyproject.toml or a Pipfile: PEP 621 arrays,
// [dependency-groups], uv/pdm dev arrays, and Poetry/Pipfile tables whose keys
// are package names. Tool settings are ignored, so a list such as isort's
// known_third_party is not mistaken for dependencies.
function readTomlDependencies(text) {
  const deps = new Set();
  const tables = new Set();
  const lines = text.split(/\r?\n/);
  let table = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const header = line.match(/^\[\[?\s*([^\]]+?)\s*\]\]?\s*(?:#.*)?$/);
    if (header) {
      table = header[1].replace(/["\s]/g, '');
      tables.add(table);
      continue;
    }
    const kv = line.match(/^("?)([\w.-]+)\1\s*=\s*(.*)$/);
    if (!kv) continue;
    if (isDependencyTable(table)) {
      if (kv[2] !== 'python') deps.add(normalizePythonName(kv[2]));
    } else if (isDependencyArray(table, kv[2])) {
      let value = kv[3];
      while (!bracketsClosed(value) && i + 1 < lines.length) value += '\n' + lines[++i];
      for (const m of value.matchAll(/"([^"]*)"|'([^']*)'/g)) {
        const name = requirementName(m[1] !== undefined ? m[1] : m[2]);
        if (name) deps.add(name);
      }
    }
  }
  return { deps, tables };
}

function readPythonInfo(dir) {
  const deps = new Set();
  const addRequirements = text => {
    for (const line of text.split(/\r?\n/)) {
      const name = requirementName(line);
      if (name) deps.add(name);
    }
  };

  const requirementFiles = readDirOpt(dir).filter(e => e.isFile() && REQUIREMENTS_FILE.test(e.name));
  for (const entry of requirementFiles) addRequirements(readFileOpt(dir, entry.name) || '');
  for (const entry of readDirOpt(path.join(dir, 'requirements'))) {
    if (entry.isFile() && entry.name.endsWith('.txt')) addRequirements(readFileOpt(dir, 'requirements', entry.name) || '');
  }

  const { deps: pyprojectDeps, tables } = readTomlDependencies(readFileOpt(dir, 'pyproject.toml') || '');
  pyprojectDeps.forEach(d => deps.add(d));
  readTomlDependencies(readFileOpt(dir, 'Pipfile') || '').deps.forEach(d => deps.add(d));

  const setupPy = readFileOpt(dir, 'setup.py') || '';
  for (const m of setupPy.matchAll(/(?:install_requires|tests_require)\s*=\s*\[([\s\S]*?)\]/g)) {
    for (const s of m[1].matchAll(/["']([^"']+)["']/g)) {
      const name = requirementName(s[1]);
      if (name) deps.add(name);
    }
  }

  const hasTable = prefix => [...tables].some(t => t === prefix || t.startsWith(`${prefix}.`));
  const setupCfg = readFileOpt(dir, 'setup.cfg') || '';
  const toxIni = readFileOpt(dir, 'tox.ini') || '';
  return {
    deps,
    hasTable,
    hasRequirements: requirementFiles.length > 0 || dirExists(dir, 'requirements'),
    hasPytestConfig: fileExists(dir, 'pytest.ini') || fileExists(dir, 'conftest.py') || hasTable('tool.pytest')
      || /^\[tool:pytest\]/m.test(setupCfg) || /^\[pytest\]/m.test(toxIni),
    hasCoverageConfig: fileExists(dir, '.coveragerc') || hasTable('tool.coverage') || /^\[coverage:/m.test(setupCfg),
  };
}

function pythonPackageManager(dir, py) {
  if (fileExists(dir, 'uv.lock') || py.hasTable('tool.uv')) return 'uv';
  if (fileExists(dir, 'poetry.lock') || py.hasTable('tool.poetry')) return 'poetry';
  if (fileExists(dir, 'pdm.lock') || py.hasTable('tool.pdm')) return 'pdm';
  if (fileExists(dir, 'Pipfile') || fileExists(dir, 'Pipfile.lock')) return 'pipenv';
  if (py.hasTable('tool.hatch.envs')) return 'hatch';
  if (py.hasRequirements || fileExists(dir, 'setup.py') || py.hasTable('project')) return 'pip';
  return null; // a pyproject.toml that only configures tools
}

function detectPython({ root, dir }) {
  const py = readPythonInfo(dir);
  const has = name => py.deps.has(name);
  const usesPytest = has('pytest') || [...py.deps].some(d => d.startsWith('pytest-')) || py.hasPytestConfig;
  const e2eRunner = has('playwright') || has('pytest-playwright') ? 'playwright' : has('selenium') ? 'selenium' : null;

  // A [tool.coverage] section alone says coverage.py is configured, not how
  // it runs, so a pytest-cov dependency elsewhere in the repo wins over it.
  let coverageTool = null;
  let coverageFromConfig = false;
  if (has('pytest-cov')) {
    coverageTool = 'pytest-cov';
  } else if (has('coverage')) {
    coverageTool = 'coverage.py';
  } else if (py.hasCoverageConfig) {
    coverageTool = 'coverage.py';
    coverageFromConfig = true;
  }

  return {
    language: 'python',
    framework: PYTHON_FRAMEWORKS.find(has) || null,
    testRunner: usesPytest ? 'pytest' : null,
    testCommand: runFrom(root, dir, usesPytest ? 'pytest' : null),
    e2eRunner,
    // Playwright for Python and Selenium tests run through pytest
    e2eCommand: runFrom(root, dir, e2eRunner && usesPytest ? 'pytest' : null),
    coverageTool,
    coverageFromConfig,
    packageManager: pythonPackageManager(dir, py),
  };
}

// ---------------------------------------------------------------------------
// Go, Rust
// ---------------------------------------------------------------------------

function detectGo({ root, dir }) {
  return {
    language: 'go',
    framework: null,
    testRunner: 'go test',
    testCommand: runFrom(root, dir, 'go test ./...'),
    e2eRunner: null,
    e2eCommand: null,
    coverageTool: 'go test -cover', // built into the Go toolchain
    packageManager: 'go modules',
  };
}

function detectRust({ root, dir }) {
  const tarpaulin = fileExists(dir, 'tarpaulin.toml') || fileExists(dir, '.tarpaulin.toml');
  return {
    language: 'rust',
    framework: null,
    testRunner: 'cargo test',
    testCommand: runFrom(root, dir, 'cargo test'),
    e2eRunner: null,
    e2eCommand: null,
    coverageTool: tarpaulin ? 'cargo-tarpaulin' : null,
    packageManager: 'cargo',
  };
}

// ---------------------------------------------------------------------------
// JVM (Gradle, Maven)
// ---------------------------------------------------------------------------

// Gradle runs from the folder holding the wrapper (gradlew), usually the repo
// root, so a module's own tests run as ./gradlew :app:test.
function gradleTestCommand(root, dir) {
  for (let current = dir; ; current = path.dirname(current)) {
    if (fileExists(current, 'gradlew')) {
      const modulePath = path.relative(current, dir).split(path.sep).filter(Boolean);
      const task = modulePath.length ? `:${modulePath.join(':')}:test` : 'test';
      return runFrom(root, current, `./gradlew ${task}`);
    }
    if (current === root || path.dirname(current) === current) break;
  }
  return runFrom(root, dir, 'gradle test');
}

function detectJvm({ root, dir, subtreeCounts }) {
  const gradleFiles = JVM_BUILD_FILES.filter(f => f !== 'pom.xml' && fileExists(dir, f));
  const isGradle = gradleFiles.length > 0;
  // Comments are dropped so "// TODO: move to Kotlin" isn't read as a plugin
  const gradleText = gradleFiles.map(f => readFileOpt(dir, f) || '').join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const pomText = (readFileOpt(dir, 'pom.xml') || '').replace(/<!--[\s\S]*?-->/g, '');
  const build = `${gradleText}\n${pomText}`;

  const kotlin = /kotlin/i.test(build) || (subtreeCounts.kotlin || 0) > (subtreeCounts.java || 0);
  let testRunner = null;
  if (/io\.kotest/.test(build)) testRunner = 'kotest';
  else if (/junit|spring-boot-starter-test/i.test(build)) testRunner = 'junit';
  else if (/testng/i.test(build)) testRunner = 'testng';
  else if (dirExists(dir, 'src', 'test')) testRunner = 'junit';

  let framework = null;
  if (/com\.android\.(?:application|library)|libs\.plugins\.android/.test(build)) framework = 'android';
  else if (/org\.springframework\.boot/.test(build)) framework = 'spring-boot';

  let testCommand;
  if (isGradle) testCommand = gradleTestCommand(root, dir);
  else testCommand = runFrom(root, dir, fileExists(dir, 'mvnw') ? './mvnw test' : 'mvn test');

  let coverageTool = null;
  if (/jacoco/i.test(build)) coverageTool = 'jacoco';
  else if (/kover/i.test(build)) coverageTool = 'kover';

  return {
    language: kotlin ? 'kotlin' : 'java',
    framework,
    testRunner,
    testCommand,
    e2eRunner: null,
    e2eCommand: null,
    coverageTool,
    packageManager: isGradle ? 'gradle' : 'maven',
  };
}

// ---------------------------------------------------------------------------
// Ruby, PHP, Elixir, Swift, Dart
// ---------------------------------------------------------------------------

function detectRuby({ root, dir }) {
  const gemfile = readFileOpt(dir, 'Gemfile') || '';
  const gems = new Set([...gemfile.matchAll(/^\s*gem\s+['"]([^'"]+)['"]/gm)].map(m => m[1]));
  let testRunner = null;
  let testCommand = null;
  if (gems.has('rspec') || gems.has('rspec-rails')) {
    testRunner = 'rspec';
    testCommand = 'bundle exec rspec';
  } else if (gems.has('minitest') || gems.has('rails')) {
    testRunner = 'minitest'; // Rails ships with Minitest
    testCommand = gems.has('rails') ? 'bin/rails test' : 'bundle exec rake test';
  }

  let framework = null;
  if (gems.has('rails')) framework = 'rails';
  else if (gems.has('sinatra')) framework = 'sinatra';

  return {
    language: 'ruby',
    framework,
    testRunner,
    testCommand: runFrom(root, dir, testCommand),
    e2eRunner: null,
    e2eCommand: null,
    coverageTool: gems.has('simplecov') ? 'simplecov' : null,
    packageManager: 'bundler',
  };
}

function detectPhp({ root, dir }) {
  const composer = readJsonOpt(dir, 'composer.json') || {};
  const deps = { ...composer.require, ...composer['require-dev'] };
  let testRunner = null;
  if (deps['pestphp/pest']) testRunner = 'pest';
  else if (deps['phpunit/phpunit']) testRunner = 'phpunit';

  let framework = null;
  if (deps['laravel/framework']) framework = 'laravel';
  else if (deps['symfony/framework-bundle']) framework = 'symfony';

  return {
    language: 'php',
    framework,
    testRunner,
    testCommand: runFrom(root, dir, testRunner ? `vendor/bin/${testRunner}` : null),
    e2eRunner: null,
    e2eCommand: null,
    coverageTool: null,
    packageManager: 'composer',
  };
}

function detectElixir({ root, dir }) {
  const mix = readFileOpt(dir, 'mix.exs') || '';
  return {
    language: 'elixir',
    framework: /:phoenix\b/.test(mix) ? 'phoenix' : null,
    testRunner: 'exunit',
    testCommand: runFrom(root, dir, 'mix test'),
    e2eRunner: null,
    e2eCommand: null,
    coverageTool: /:excoveralls\b/.test(mix) ? 'excoveralls' : null,
    packageManager: 'mix',
  };
}

function detectSwift({ root, dir }) {
  return {
    language: 'swift',
    framework: null,
    testRunner: 'xctest',
    testCommand: runFrom(root, dir, 'swift test'),
    e2eRunner: null,
    e2eCommand: null,
    coverageTool: null,
    packageManager: 'swiftpm',
  };
}

function detectDart({ root, dir }) {
  const flutter = /sdk:\s*flutter\b/.test(readFileOpt(dir, 'pubspec.yaml') || '');
  return {
    language: 'dart',
    framework: flutter ? 'flutter' : null,
    testRunner: flutter ? 'flutter test' : 'dart test',
    testCommand: runFrom(root, dir, flutter ? 'flutter test' : 'dart test'),
    e2eRunner: null,
    e2eCommand: null,
    coverageTool: null,
    packageManager: 'pub',
  };
}

// ---------------------------------------------------------------------------
// CI
// ---------------------------------------------------------------------------

function detectCI(root) {
  if (dirExists(root, '.github', 'workflows')) return 'github-actions';
  if (fileExists(root, '.gitlab-ci.yml')) return 'gitlab-ci';
  if (fileExists(root, 'Jenkinsfile')) return 'jenkins';
  if (fileExists(root, '.circleci', 'config.yml')) return 'circleci';
  if (fileExists(root, '.travis.yml')) return 'travis-ci';
  if (fileExists(root, 'azure-pipelines.yml')) return 'azure-pipelines';
  if (fileExists(root, 'bitbucket-pipelines.yml')) return 'bitbucket-pipelines';
  if (fileExists(root, 'buildkite.yml') || dirExists(root, '.buildkite')) return 'buildkite';
  return null;
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

// Every (folder, ecosystem) pair with a manifest, from the root down to
// MANIFEST_DEPTH folders deep
function findProjects(root) {
  const projects = [];
  (function visit(dir, depth) {
    for (const [ecosystem, spec] of Object.entries(ECOSYSTEMS)) {
      if (spec.isPresent(dir)) projects.push({ dir, ecosystem, family: spec.family, counts: {}, subtreeCounts: {} });
    }
    if (depth === MANIFEST_DEPTH) return;
    for (const entry of readDirOpt(dir)) {
      if (entry.isDirectory() && !isSkippedDir(dir, entry.name)) visit(path.join(dir, entry.name), depth + 1);
    }
  })(root, 0);
  return projects;
}

// Counts code files by language. A file counts for the deepest project of
// its language family that contains it (counts), and for every such project
// above that one (subtreeCounts). Files outside every project come back as
// `unattributed`.
function countFiles(root, projects) {
  const projectsByDir = new Map();
  for (const p of projects) {
    if (!projectsByDir.has(p.dir)) projectsByDir.set(p.dir, []);
    projectsByDir.get(p.dir).push(p);
  }

  const unattributed = {};
  let seen = 0;
  (function walk(dir, owners) {
    const here = projectsByDir.get(dir);
    if (here) {
      owners = { ...owners };
      for (const p of here) owners[p.family] = [...(owners[p.family] || []), p];
    }
    for (const entry of readDirOpt(dir)) {
      if (seen >= MAX_FILES) return;
      if (entry.isDirectory()) {
        if (!isSkippedDir(dir, entry.name)) walk(path.join(dir, entry.name), owners);
        continue;
      }
      if (!entry.isFile()) continue;
      seen++;
      const language = languageOfFile(entry.name);
      if (!language) continue;
      const chain = owners[familyOf(language)];
      if (!chain) {
        unattributed[language] = (unattributed[language] || 0) + 1;
        continue;
      }
      for (const p of chain) p.subtreeCounts[language] = (p.subtreeCounts[language] || 0) + 1;
      const owner = chain[chain.length - 1];
      owner.counts[language] = (owner.counts[language] || 0) + 1;
    }
  })(root, {});
  return unattributed;
}

function describeProject(root, found) {
  const { coverageFromConfig = false, ...info } = ECOSYSTEMS[found.ecosystem].describe({
    root,
    dir: found.dir,
    subtreeCounts: found.subtreeCounts,
  });
  return {
    path: path.relative(root, found.dir).split(path.sep).join('/') || '.',
    ...info,
    fileCount: sum(found.counts),
    detectedBy: 'manifest',
    coverageFromConfig,
  };
}

// A project for code that has no manifest above it, known only by its
// file extensions
function extensionProject(counts) {
  const language = Object.keys(counts).reduce((best, lang) => (counts[lang] > counts[best] ? lang : best));
  return {
    path: '.',
    language,
    framework: null,
    testRunner: null,
    testCommand: null,
    e2eRunner: null,
    e2eCommand: null,
    coverageTool: null,
    packageManager: null,
    fileCount: sum(counts),
    detectedBy: 'file-extensions',
    coverageFromConfig: false,
  };
}

// ---------------------------------------------------------------------------
// Main detect function
// ---------------------------------------------------------------------------

function detect(projectRoot) {
  const root = path.resolve(projectRoot);
  const found = findProjects(root);
  const unattributed = countFiles(root, found);
  const projects = found.map(p => describeProject(root, p));

  // Code outside every manifest project (no manifest at all, or a
  // requirements.txt kept in documentation/) becomes a root project of its
  // own, unless a manifest project of that family already holds such code.
  const hasManifestProjects = projects.length > 0;
  const unattributedByFamily = {};
  for (const [language, count] of Object.entries(unattributed)) {
    const family = familyOf(language);
    unattributedByFamily[family] = { ...unattributedByFamily[family], [language]: count };
  }
  for (const [family, counts] of Object.entries(unattributedByFamily)) {
    const covered = projects.some(p => familyOf(p.language) === family && p.fileCount > 0);
    // A couple of stray scripts next to a real project aren't a project
    if (covered || (hasManifestProjects && sum(counts) < 3)) continue;
    projects.push(extensionProject(counts));
  }

  // Languages, most code first
  const weight = {};
  for (const p of projects) weight[p.language] = (weight[p.language] || 0) + p.fileCount;
  const languages = [...new Set(projects.map(p => p.language))].sort((a, b) => weight[b] - weight[a]);
  const language = languages[0] || null;
  const mainFamily = familyOf(language);

  // Projects in the main language come first, the root project before the
  // others (its config and commands usually cover the whole repo), then the
  // ones with the most code. Each summary field takes the first value found.
  const ordered = [...projects].sort((a, b) =>
    (familyOf(b.language) === mainFamily) - (familyOf(a.language) === mainFamily)
    || (b.path === '.') - (a.path === '.')
    || b.fileCount - a.fileCount
    || a.path.localeCompare(b.path));
  const first = field => (ordered.find(p => p[field]) || {})[field] || null;
  const coverage = ordered.find(p => p.coverageTool && !p.coverageFromConfig) || ordered.find(p => p.coverageTool);

  return {
    language,
    framework: first('framework'),
    testRunner: first('testRunner'),
    testCommand: first('testCommand'),
    e2eRunner: first('e2eRunner'),
    e2eCommand: first('e2eCommand'),
    coverageTool: coverage ? coverage.coverageTool : null,
    ci: detectCI(root),
    packageManager: first('packageManager'),
    languages,
    projects: ordered.map(({ coverageFromConfig, ...p }) => p),
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

  const result = detect(projectRoot);

  if (jsonOutput) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    const { languages, projects, ...summary } = result;
    for (const [key, value] of Object.entries(summary)) {
      console.log(`${key}: ${value ?? '(not detected)'}`);
    }
    console.log(`languages: ${languages.join(', ') || '(none)'}`);
    for (const p of projects) {
      console.log(`project ${p.path}: ${p.language}${p.framework ? `/${p.framework}` : ''}, ${p.fileCount} files (${p.detectedBy})`);
    }
  }
}

// ---------------------------------------------------------------------------
// Exports for programmatic use
// ---------------------------------------------------------------------------

module.exports = { detect };
