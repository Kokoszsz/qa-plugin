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
// Summary
// ---------------------------------------------------------------------------
console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
if (failed > 0) {
  process.exit(1);
}
