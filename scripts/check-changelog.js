#!/usr/bin/env node

/**
 * Changelog Validator
 * 
 * Ensures CHANGELOG.md follows Keep a Changelog format and is up to date.
 * 
 * Usage:
 *   node scripts/check-changelog.js
 */

const fs = require('fs');
const path = require('path');

const changelogPath = path.resolve(__dirname, '../CHANGELOG.md');

console.log('📋 Validating CHANGELOG.md...\n');

// Check if file exists
if (!fs.existsSync(changelogPath)) {
  console.error('❌ CHANGELOG.md does not exist');
  console.log('\nCreating CHANGELOG.md template...\n');
  
  const template = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- N/A

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A
`;

  fs.writeFileSync(changelogPath, template);
  console.log('✅ Created CHANGELOG.md template');
  process.exit(0);
}

const content = fs.readFileSync(changelogPath, 'utf-8');
let hasErrors = false;

// Check required sections
const requiredSections = [
  { name: 'Title', pattern: /^# Changelog/m },
  { name: 'Keep a Changelog reference', pattern: /keepachangelog\.com/i },
  { name: 'Semantic Versioning reference', pattern: /semver\.org/i },
  { name: '[Unreleased] section', pattern: /## \[Unreleased\]/ },
];

console.log('Checking required sections:\n');

requiredSections.forEach(section => {
  if (section.pattern.test(content)) {
    console.log(`  ✅ ${section.name}`);
  } else {
    console.log(`  ❌ ${section.name} - MISSING`);
    hasErrors = true;
  }
});

// Check standard sections in Unreleased
const unreleasedMatch = content.match(/## \[Unreleased\][\s\S]*?(?=## \[|$)/);
if (unreleasedMatch) {
  const unreleased = unreleasedMatch[0];
  
  console.log('\nChecking [Unreleased] subsections:\n');
  
  const subsections = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'];
  subsections.forEach(sub => {
    const pattern = new RegExp(`### ${sub}`);
    if (pattern.test(unreleased)) {
      console.log(`  ✅ ${sub}`);
    } else {
      console.log(`  ⚠️  ${sub} - recommended but optional`);
    }
  });
}

// Check for unreleased content
if (unreleasedMatch) {
  const unreleased = unreleasedMatch[0];
  const hasContent = unreleased.includes('- ');
  
  console.log('\nChecking for unreleased content:\n');
  
  if (hasContent) {
    // Count entries
    const entries = unreleased.match(/^- /gm);
    console.log(`  ✅ Found ${entries ? entries.length : 0} unreleased entries`);
  } else {
    console.log('  ⚠️  No unreleased entries found');
    console.log('     Add entries under [Unreleased] for changes since last release');
  }
}

// Check for version entries
const versionMatches = content.match(/## \[\d+\.\d+\.\d+\]/g);
console.log('\nVersion history:\n');

if (versionMatches && versionMatches.length > 0) {
  console.log(`  ✅ Found ${versionMatches.length} released versions`);
  
  // Show last 3 versions
  versionMatches.slice(0, 3).forEach(v => {
    console.log(`     ${v}`);
  });
} else {
  console.log('  ⚠️  No version releases found');
  console.log('     Consider adding releases after tagging');
}

// Validate format
console.log('\nFormat validation:\n');

// Check for common mistakes
const issues = [];

if (/##\s*\[?v?\d+\.\d+\.\d+\]?/i.test(content) && !/## \[\d+\.\d+\.\d+\]/.test(content)) {
  issues.push('Version headings should use format: ## [X.Y.Z]');
}

if (content.includes('## Unreleased') && !content.includes('## [Unreleased]')) {
  issues.push('[Unreleased] should be in brackets: ## [Unreleased]');
}

if (issues.length === 0) {
  console.log('  ✅ No format issues detected');
} else {
  issues.forEach(issue => {
    console.log(`  ⚠️  ${issue}`);
  });
}

// Summary
console.log('\n' + '='.repeat(50));

if (hasErrors) {
  console.log('❌ CHANGELOG.md has errors that need to be fixed');
  console.log('\nRun this script again after fixing the issues.\n');
  process.exit(1);
} else {
  console.log('✅ CHANGELOG.md is valid!\n');
  
  console.log('Remember to:');
  console.log('  1. Add entries to [Unreleased] as you make changes');
  console.log('  2. Move [Unreleased] content to a new version on release');
  console.log('  3. Use format: ## [X.Y.Z] - YYYY-MM-DD');
  console.log('  4. Mark breaking changes clearly\n');
  
  process.exit(0);
}
