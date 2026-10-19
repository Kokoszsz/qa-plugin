#!/usr/bin/env node
'use strict';

// Static checks over the plugin's own Markdown. Claude follows these files as
// instructions, so a wrong path or an undefined placeholder here becomes a
// broken artifact in every project. The script tests can't see these files.

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PLUGIN_ROOT = path.join(REPO_ROOT, 'plugins', 'qa');

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

function read(...segments) {
  return fs.readFileSync(path.join(...segments), 'utf8');
}

function listMarkdown(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listMarkdown(full));
    } else if (entry.name.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

function rel(file) {
  return path.relative(REPO_ROOT, file).replace(/\\/g, '/');
}

// Returns [{ heading, line, text }] for every line, tagged with the nearest
// Markdown heading above it.
function linesWithHeadings(content) {
  let heading = '';
  return content.split(/\r?\n/).map((text, i) => {
    const m = text.match(/^#{1,6}\s+(.*)$/);
    if (m) heading = m[1];
    return { heading, line: i + 1, text };
  });
}

const SCAFFOLDER = read(PLUGIN_ROOT, 'skills', 'qa-scaffolder', 'SKILL.md');

// ---------------------------------------------------------------------------
// Test 1: generated artifacts use paths Claude Code registers under the
// documented names (/test, /test:coverage, /test:review)
// ---------------------------------------------------------------------------
(function testGeneratedPaths() {
  const expected = [
    '.claude/commands/test.md',
    '.claude/commands/test/coverage.md',
    '.claude/commands/test/review.md',
    '.claude/agents/qa-test-runner.md',
    '.claude/agents/qa-coverage-checker.md',
    '.claude/agents/qa-test-reviewer.md',
  ];
  for (const p of expected) {
    assert(SCAFFOLDER.includes(p), `Scaffolder writes ${p}`);
  }
})();

// ---------------------------------------------------------------------------
// Test 2: only a "0.1.0" migration section may name the old COMMAND.md /
// AGENT.md layout, which registers as /test:COMMAND instead of /test
// ---------------------------------------------------------------------------
(function testNoLegacyLayout() {
  for (const file of listMarkdown(PLUGIN_ROOT)) {
    const offending = linesWithHeadings(read(file))
      .filter(({ text }) => /\b(COMMAND|AGENT)\.md\b/.test(text))
      .filter(({ heading }) => !heading.includes('0.1.0'));
    assert(
      offending.length === 0,
      `${rel(file)} names COMMAND.md/AGENT.md only in a 0.1.0 migration section` +
        (offending.length ? ` (line ${offending.map(o => o.line).join(', ')})` : ''),
    );
  }
})();

// ---------------------------------------------------------------------------
// Test 3: bundled scripts and templates are referenced through
// ${CLAUDE_PLUGIN_ROOT}, which Claude Code replaces with the install path
// when it loads the Markdown. Anything else leaves Claude guessing.
// ---------------------------------------------------------------------------
(function testPluginRootReferences() {
  const ROOT = '${CLAUDE_PLUGIN_ROOT}/';
  for (const file of listMarkdown(PLUGIN_ROOT)) {
    const content = read(file);
    assert(!content.includes('<plugin-dir>'), `${rel(file)} has no <plugin-dir> placeholder`);

    // Path prefixes stop at whitespace, quotes, backticks and brackets, so
    // "${CLAUDE_PLUGIN_ROOT}/scripts/x.js" (quoted for paths with spaces) passes.
    const bad = [];
    const scriptRef = /(?:[^\s"'`([]*\/)?(?:detect-stack|analyze-tests|verify-setup)\.js/g;
    for (const m of content.matchAll(scriptRef)) {
      if (!m[0].startsWith(`${ROOT}scripts/`)) bad.push(m[0]);
    }
    const templateRef = /[^\s"'`([]*templates\//g;
    for (const m of content.matchAll(templateRef)) {
      if (m[0] !== `${ROOT}templates/`) bad.push(m[0]);
    }
    assert(
      bad.length === 0,
      `${rel(file)} references scripts/templates via ${ROOT}` + (bad.length ? ` (found: ${bad.join(', ')})` : ''),
    );
  }
})();

// ---------------------------------------------------------------------------
// Test 4: no references to commands removed in b096ed5. Every generated
// project would otherwise tell users to run a command that doesn't exist.
// (docs/plans/ is a dated design record and is left as written.)
// ---------------------------------------------------------------------------
(function testNoRemovedCommands() {
  const files = [
    ...listMarkdown(PLUGIN_ROOT),
    path.join(REPO_ROOT, 'README.md'),
    ...fs.readdirSync(path.join(REPO_ROOT, 'docs'))
      .filter(name => name.endsWith('.md'))
      .map(name => path.join(REPO_ROOT, 'docs', name)),
    ...fs.readdirSync(path.join(REPO_ROOT, 'tests', 'skills'))
      .filter(name => name.endsWith('.yaml'))
      .map(name => path.join(REPO_ROOT, 'tests', 'skills', name)),
  ];
  for (const file of files) {
    const found = read(file).match(/\/qa:(?:audit|status|configure)\b/g) || [];
    assert(
      found.length === 0,
      `${rel(file)} doesn't mention removed commands` + (found.length ? ` (found: ${[...new Set(found)].join(', ')})` : ''),
    );
  }
})();

// ---------------------------------------------------------------------------
// Test 5: every {{placeholder}} used in a template (or in the scaffolder's own
// qa-config.json example) is defined in the scaffolder's variable list.
// Otherwise Claude has to guess the value or leaves the placeholder in.
// ---------------------------------------------------------------------------
(function testPlaceholdersDefined() {
  const defined = new Set(
    [...SCAFFOLDER.matchAll(/^\s*-\s+`\{\{(\w+)\}\}`/gm)].map(m => m[1]),
  );
  const usedIn = new Map();
  const sources = [
    ...listMarkdown(path.join(PLUGIN_ROOT, 'templates')),
    path.join(PLUGIN_ROOT, 'skills', 'qa-scaffolder', 'SKILL.md'),
  ];
  for (const file of sources) {
    for (const m of read(file).matchAll(/\{\{(\w+)\}\}/g)) {
      if (!usedIn.has(m[1])) usedIn.set(m[1], new Set());
      usedIn.get(m[1]).add(path.basename(file));
    }
  }
  assert(usedIn.size > 0, 'Found placeholders in the templates');
  for (const [name, files] of usedIn) {
    assert(defined.has(name), `{{${name}}} (used in ${[...files].join(', ')}) is defined in the scaffolder's variable list`);
  }
})();

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
if (failed > 0) {
  process.exit(1);
}
