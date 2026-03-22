#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '__pycache__', 'venv', '.venv',
  '.claude', '.next', '.nuxt', 'coverage', '.nyc_output', '.tox',
  'target', 'vendor', '.bundle', 'tmp', '.cache',
]);

const LANGUAGE_CONFIG = {
  typescript: {
    testPatterns: [
      { regex: /\.test\.[tj]sx?$/, label: '*.test.ts / *.test.tsx' },
      { regex: /\.spec\.[tj]sx?$/, label: '*.spec.ts / *.spec.tsx' },
      { regex: /__tests__\/.*\.[tj]sx?$/, label: '__tests__/*.ts' },
    ],
    sourceExtensions: ['.ts', '.tsx', '.js', '.jsx'],
    sourceExclude: [/\.test\.[tj]sx?$/, /\.spec\.[tj]sx?$/, /\.d\.ts$/, /__mocks__\//],
  },
  javascript: {
    testPatterns: [
      { regex: /\.test\.[jt]sx?$/, label: '*.test.js / *.test.jsx' },
      { regex: /\.spec\.[jt]sx?$/, label: '*.spec.js / *.spec.jsx' },
      { regex: /__tests__\/.*\.[jt]sx?$/, label: '__tests__/*.js' },
    ],
    sourceExtensions: ['.js', '.jsx', '.ts', '.tsx'],
    sourceExclude: [/\.test\.[jt]sx?$/, /\.spec\.[jt]sx?$/, /\.d\.ts$/, /__mocks__\//],
  },
  python: {
    testPatterns: [
      { regex: /(?:^|[/\\])test_[^/\\]*\.py$/, label: 'test_*.py' },
      { regex: /(?:^|[/\\])[^/\\]*_test\.py$/, label: '*_test.py' },
    ],
    sourceExtensions: ['.py'],
    sourceExclude: [/(?:^|[/\\])test_[^/\\]*\.py$/, /(?:^|[/\\])[^/\\]*_test\.py$/, /(?:^|[/\\])conftest\.py$/, /(?:^|[/\\])__init__\.py$/],
  },
  go: {
    testPatterns: [
      { regex: /_test\.go$/, label: '*_test.go' },
    ],
    sourceExtensions: ['.go'],
    sourceExclude: [/_test\.go$/],
  },
  rust: {
    testPatterns: [
      { regex: /tests\/.*\.rs$/, label: 'tests/*.rs' },
    ],
    sourceExtensions: ['.rs'],
    sourceExclude: [],
  },
  java: {
    testPatterns: [
      { regex: /Test\.java$/, label: '*Test.java' },
      { regex: /Tests\.java$/, label: '*Tests.java' },
    ],
    sourceExtensions: ['.java'],
    sourceExclude: [/Test\.java$/, /Tests\.java$/],
  },
  ruby: {
    testPatterns: [
      { regex: /_spec\.rb$/, label: '*_spec.rb' },
      { regex: /_test\.rb$/, label: '*_test.rb' },
    ],
    sourceExtensions: ['.rb'],
    sourceExclude: [/_spec\.rb$/, /_test\.rb$/],
  },
  php: {
    testPatterns: [
      { regex: /Test\.php$/, label: '*Test.php' },
    ],
    sourceExtensions: ['.php'],
    sourceExclude: [/Test\.php$/],
  },
};

// ---------------------------------------------------------------------------
// Directory walker
// ---------------------------------------------------------------------------

function walkDir(dir, callback) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        walkDir(path.join(dir, entry.name), callback);
      }
    } else if (entry.isFile()) {
      callback(path.join(dir, entry.name));
    }
  }
}

// ---------------------------------------------------------------------------
// Core analyze function
// ---------------------------------------------------------------------------

function analyze(projectRoot, language) {
  const root = path.resolve(projectRoot);
  const lang = (language || '').toLowerCase();
  const config = LANGUAGE_CONFIG[lang];

  if (!config) {
    return {
      hasTests: false,
      testFileCount: 0,
      sourceFileCount: 0,
      testFiles: [],
      patterns: [],
      conventions: {},
    };
  }

  const testFiles = [];
  const sourceFiles = [];
  const allFiles = [];

  // Collect all files
  walkDir(root, (filePath) => {
    allFiles.push(filePath);
  });

  // Classify files
  const matchedPatterns = new Set();

  for (const filePath of allFiles) {
    const rel = path.relative(root, filePath).replace(/\\/g, '/');
    const ext = path.extname(filePath);

    // Check if test file
    let isTest = false;
    for (const { regex, label } of config.testPatterns) {
      if (regex.test(rel)) {
        isTest = true;
        matchedPatterns.add(label);
        break;
      }
    }

    if (isTest) {
      testFiles.push(rel);
      continue;
    }

    // Check if source file
    if (config.sourceExtensions.includes(ext)) {
      const excluded = config.sourceExclude.some(p => p.test(rel));
      if (!excluded) {
        sourceFiles.push(rel);
      }
    }
  }

  // Detect conventions
  const conventions = detectConventions(root, testFiles, sourceFiles, lang);

  return {
    hasTests: testFiles.length > 0,
    testFileCount: testFiles.length,
    sourceFileCount: sourceFiles.length,
    testFiles: testFiles.sort(),
    patterns: Array.from(matchedPatterns).sort(),
    conventions,
  };
}

// ---------------------------------------------------------------------------
// Convention detection
// ---------------------------------------------------------------------------

function detectConventions(root, testFiles, sourceFiles, language) {
  const conventions = {};

  // Detect test location: colocated vs separate
  if (testFiles.length > 0 && sourceFiles.length > 0) {
    // Check if test files live alongside non-trivial source files.
    // A directory counts as "colocated" only if it contains both test files
    // AND substantial source files (not just __init__.py or similar).
    const testDirs = new Set(testFiles.map(f => path.dirname(f)));

    // Build map of dir -> source files (excluding trivial files)
    const trivialFiles = new Set(['__init__.py']);
    const sourceDirsWithReal = new Set();
    for (const sf of sourceFiles) {
      if (!trivialFiles.has(path.basename(sf))) {
        sourceDirsWithReal.add(path.dirname(sf));
      }
    }

    let colocatedCount = 0;
    for (const td of testDirs) {
      if (sourceDirsWithReal.has(td)) {
        colocatedCount++;
      }
    }

    conventions.testLocation = colocatedCount > 0 ? 'colocated' : 'separate';
  }

  // Detect naming patterns
  const namingPatterns = new Set();
  for (const tf of testFiles) {
    const base = path.basename(tf);
    if (/\.test\.[tj]sx?$/.test(base)) namingPatterns.add('*.test.*');
    if (/\.spec\.[tj]sx?$/.test(base)) namingPatterns.add('*.spec.*');
    if (/^test_/.test(base)) namingPatterns.add('test_*');
    if (/_test\./.test(base)) namingPatterns.add('*_test.*');
    if (/Test\./.test(base)) namingPatterns.add('*Test.*');
    if (/_spec\./.test(base)) namingPatterns.add('*_spec.*');
    if (/_test\.go$/.test(base)) namingPatterns.add('*_test.go');
  }
  if (namingPatterns.size > 0) {
    conventions.namingPatterns = Array.from(namingPatterns).sort();
  }

  // Detect fixtures
  let hasFixtures = false;
  let hasMocks = false;
  let hasConftest = false;

  walkDir(root, (filePath) => {
    const rel = path.relative(root, filePath).replace(/\\/g, '/');
    if (/fixtures\//i.test(rel)) hasFixtures = true;
    if (/__mocks__\//i.test(rel) || /mocks?\//i.test(rel)) hasMocks = true;
    if (/conftest\.py$/.test(rel)) hasConftest = true;
  });

  if (hasFixtures) conventions.hasFixtures = true;
  if (hasMocks) conventions.hasMocks = true;
  if (hasConftest) conventions.hasConftest = true;

  return conventions;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

if (require.main === module) {
  const args = process.argv.slice(2);
  let projectRoot = process.cwd();
  let language = '';
  let jsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project-root' && args[i + 1]) {
      projectRoot = args[++i];
    } else if (args[i] === '--language' && args[i + 1]) {
      language = args[++i];
    } else if (args[i] === '--json') {
      jsonOutput = true;
    }
  }

  const result = analyze(projectRoot, language);

  if (jsonOutput) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    console.log(`hasTests: ${result.hasTests}`);
    console.log(`testFileCount: ${result.testFileCount}`);
    console.log(`sourceFileCount: ${result.sourceFileCount}`);
    console.log(`testFiles: ${result.testFiles.join(', ') || '(none)'}`);
    console.log(`patterns: ${result.patterns.join(', ') || '(none)'}`);
    console.log(`conventions: ${JSON.stringify(result.conventions)}`);
  }
}

// ---------------------------------------------------------------------------
// Exports for programmatic use
// ---------------------------------------------------------------------------

module.exports = { analyze };
