#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

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

// ---------------------------------------------------------------------------
// Detectors
// ---------------------------------------------------------------------------

function detectLanguage(root) {
  if (fileExists(root, 'tsconfig.json')) return 'typescript';
  if (fileExists(root, 'package.json')) return 'javascript';
  if (fileExists(root, 'go.mod')) return 'go';
  if (fileExists(root, 'Cargo.toml')) return 'rust';
  if (fileExists(root, 'requirements.txt') || fileExists(root, 'setup.py') || fileExists(root, 'pyproject.toml') || fileExists(root, 'Pipfile')) return 'python';
  if (fileExists(root, 'pom.xml') || fileExists(root, 'build.gradle') || fileExists(root, 'build.gradle.kts')) return 'java';
  if (fileExists(root, 'Gemfile')) return 'ruby';
  if (fileExists(root, 'composer.json')) return 'php';
  if (fileExists(root, 'mix.exs')) return 'elixir';
  if (fileExists(root, 'Package.swift')) return 'swift';
  if (fileExists(root, 'pubspec.yaml')) return 'dart';
  return null;
}

function detectFramework(root) {
  const pkg = readJsonOpt(root, 'package.json');
  if (pkg) {
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies
    };
    // Order matters: more specific first
    if (allDeps['next']) return 'next';
    if (allDeps['nuxt'] || allDeps['nuxt3']) return 'nuxt';
    if (allDeps['@angular/core']) return 'angular';
    if (allDeps['svelte'] || allDeps['@sveltejs/kit']) return 'svelte';
    if (allDeps['vue']) return 'vue';
    if (allDeps['react']) return 'react';
    if (allDeps['express']) return 'express';
    if (allDeps['fastify']) return 'fastify';
    if (allDeps['koa']) return 'koa';
    if (allDeps['hapi'] || allDeps['@hapi/hapi']) return 'hapi';
    if (allDeps['nestjs'] || allDeps['@nestjs/core']) return 'nestjs';
  }

  // Python frameworks
  const reqTxt = readFileOpt(root, 'requirements.txt');
  const pyprojectRaw = readFileOpt(root, 'pyproject.toml');
  const pyDeps = (reqTxt || '') + '\n' + (pyprojectRaw || '');
  if (/django/i.test(pyDeps)) return 'django';
  if (/flask/i.test(pyDeps)) return 'flask';
  if (/fastapi/i.test(pyDeps)) return 'fastapi';

  // Ruby
  const gemfile = readFileOpt(root, 'Gemfile');
  if (gemfile && /rails/i.test(gemfile)) return 'rails';
  if (gemfile && /sinatra/i.test(gemfile)) return 'sinatra';

  return null;
}

function detectTestRunner(root) {
  const pkg = readJsonOpt(root, 'package.json');
  if (pkg) {
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies
    };
    // Check config files first for specificity
    if (fileExists(root, 'vitest.config.ts') || fileExists(root, 'vitest.config.js') || allDeps['vitest']) return 'vitest';
    if (fileExists(root, 'playwright.config.ts') || fileExists(root, 'playwright.config.js') || allDeps['@playwright/test']) return 'playwright';
    if (fileExists(root, 'cypress.config.ts') || fileExists(root, 'cypress.config.js') || fileExists(root, 'cypress.json') || allDeps['cypress']) return 'cypress';
    if (fileExists(root, 'jest.config.ts') || fileExists(root, 'jest.config.js') || fileExists(root, 'jest.config.mjs') || allDeps['jest']) return 'jest';
    if (fileExists(root, '.mocharc.yml') || fileExists(root, '.mocharc.json') || allDeps['mocha']) return 'mocha';
    if (allDeps['ava']) return 'ava';
    if (allDeps['tap']) return 'tap';
  }

  // Python
  if (fileExists(root, 'pytest.ini') || fileExists(root, 'conftest.py')) return 'pytest';
  const reqTxt = readFileOpt(root, 'requirements.txt');
  const pyprojectRaw = readFileOpt(root, 'pyproject.toml');
  const pyDeps = (reqTxt || '') + '\n' + (pyprojectRaw || '');
  if (/pytest/i.test(pyDeps)) return 'pytest';
  if (/unittest/i.test(pyDeps)) return 'unittest';

  // Go
  if (fileExists(root, 'go.mod')) return 'go test';

  // Rust
  if (fileExists(root, 'Cargo.toml')) return 'cargo test';

  // Java
  if (fileExists(root, 'pom.xml') || fileExists(root, 'build.gradle') || fileExists(root, 'build.gradle.kts')) return 'junit';

  // Ruby
  const gemfile = readFileOpt(root, 'Gemfile');
  if (gemfile && /rspec/i.test(gemfile)) return 'rspec';
  if (gemfile && /minitest/i.test(gemfile)) return 'minitest';

  return null;
}

function detectTestCommand(root) {
  const pkg = readJsonOpt(root, 'package.json');
  if (pkg && pkg.scripts && pkg.scripts.test) {
    return pkg.scripts.test;
  }

  const testRunner = detectTestRunner(root);
  const defaults = {
    'jest': 'jest',
    'vitest': 'vitest',
    'mocha': 'mocha',
    'playwright': 'npx playwright test',
    'cypress': 'npx cypress run',
    'pytest': 'pytest',
    'unittest': 'python -m unittest discover',
    'go test': 'go test ./...',
    'cargo test': 'cargo test',
    'junit': 'mvn test',
    'rspec': 'bundle exec rspec',
    'minitest': 'bundle exec rake test',
    'ava': 'ava',
    'tap': 'tap',
  };

  return defaults[testRunner] || null;
}

function detectCoverageTool(root) {
  const pkg = readJsonOpt(root, 'package.json');
  if (pkg) {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (allDeps['c8']) return 'c8';
    if (allDeps['nyc'] || allDeps['istanbul']) return 'nyc';
    // Jest has built-in coverage
    const testCmd = (pkg.scripts && pkg.scripts.test) || '';
    if (allDeps['jest'] && /--coverage/.test(testCmd)) return 'jest --coverage';
  }

  const reqTxt = readFileOpt(root, 'requirements.txt');
  if (reqTxt && /pytest-cov/i.test(reqTxt)) return 'pytest-cov';
  if (reqTxt && /coverage/i.test(reqTxt)) return 'coverage.py';

  if (fileExists(root, 'go.mod')) return 'go test -cover';
  if (fileExists(root, 'Cargo.toml')) return 'cargo-tarpaulin';

  return null;
}

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

function detectPackageManager(root) {
  // JS ecosystem — lock files
  if (fileExists(root, 'bun.lockb') || fileExists(root, 'bun.lock')) return 'bun';
  if (fileExists(root, 'pnpm-lock.yaml')) return 'pnpm';
  if (fileExists(root, 'yarn.lock')) return 'yarn';
  if (fileExists(root, 'package-lock.json')) return 'npm';
  if (fileExists(root, 'package.json')) return 'npm'; // default for JS

  // Python
  if (fileExists(root, 'uv.lock')) return 'uv';
  if (fileExists(root, 'poetry.lock') || fileExists(root, 'pyproject.toml')) return 'poetry';
  if (fileExists(root, 'Pipfile') || fileExists(root, 'Pipfile.lock')) return 'pipenv';
  if (fileExists(root, 'requirements.txt') || fileExists(root, 'setup.py')) return 'pip';

  // Go
  if (fileExists(root, 'go.mod')) return 'go modules';

  // Rust
  if (fileExists(root, 'Cargo.toml')) return 'cargo';

  // Ruby
  if (fileExists(root, 'Gemfile')) return 'bundler';

  // PHP
  if (fileExists(root, 'composer.json')) return 'composer';

  // Elixir
  if (fileExists(root, 'mix.exs')) return 'mix';

  // Java
  if (fileExists(root, 'build.gradle') || fileExists(root, 'build.gradle.kts')) return 'gradle';
  if (fileExists(root, 'pom.xml')) return 'maven';

  return null;
}

// ---------------------------------------------------------------------------
// Main detect function
// ---------------------------------------------------------------------------

function detect(projectRoot) {
  const root = path.resolve(projectRoot);
  return {
    language: detectLanguage(root),
    framework: detectFramework(root),
    testRunner: detectTestRunner(root),
    testCommand: detectTestCommand(root),
    coverageTool: detectCoverageTool(root),
    ci: detectCI(root),
    packageManager: detectPackageManager(root),
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
    for (const [key, value] of Object.entries(result)) {
      console.log(`${key}: ${value ?? '(not detected)'}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Exports for programmatic use
// ---------------------------------------------------------------------------

module.exports = { detect };
