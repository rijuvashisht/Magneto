#!/usr/bin/env node

/**
 * Breaking Changes Checker
 * 
 * This script checks for breaking changes in commits and ensures they are
correctly documented in CHANGELOG.md and BREAKING_CHANGES.md.
 * 
 * Usage:
 *   node scripts/check-breaking-changes.js
 *   node scripts/check-breaking-changes.js --since=v0.7.0
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const sinceTag = args.find(arg => arg.startsWith('--since='))?.split('=')[1] || 'v0.0.0';

console.log('🔍 Checking for breaking changes...\n');

// Get commits since last tag
function getCommitsSince(sinceTag) {
  try {
    const output = execSync(
      `git log ${sinceTag}..HEAD --pretty=format:"%H|%s|%b|%an" --no-merges`,
      { encoding: 'utf-8', cwd: path.resolve(__dirname, '..') }
    );
    
    if (!output.trim()) {
      return [];
    }
    
    return output.split('\n').map(line => {
      const [hash, subject, body, author] = line.split('|');
      return { hash: hash.slice(0, 7), subject, body, author };
    });
  } catch (error) {
    console.error('❌ Failed to get git commits:', error.message);
    return [];
  }
}

// Check if commit has breaking change marker
function hasBreakingChange(commit) {
  const breakingPatterns = [
    /BREAKING CHANGE/i,
    /BREAKING-CHANGE/i,
    /^[\w]+(\(.+\))?!:/,  // conventional commits with !
    /⚠️ BREAKING/,
    /\[!important\]/i,
  ];
  
  const text = `${commit.subject}\n${commit.body}`;
  return breakingPatterns.some(pattern => pattern.test(text));
}

// Check if CHANGELOG.md is updated
function isChangelogUpdated() {
  const changelogPath = path.resolve(__dirname, '../CHANGELOG.md');
  
  if (!fs.existsSync(changelogPath)) {
    return { exists: false, hasUnreleased: false };
  }
  
  const content = fs.readFileSync(changelogPath, 'utf-8');
  
  return {
    exists: true,
    hasUnreleased: content.includes('## [Unreleased]'),
    hasBreakingChangesSection: content.includes('### ⚠️ Breaking Changes') || 
                               content.includes('### Breaking Changes'),
  };
}

// Check if BREAKING_CHANGES.md exists and is updated
function isBreakingChangesDocUpdated() {
  const docPath = path.resolve(__dirname, '../BREAKING_CHANGES.md');
  
  if (!fs.existsSync(docPath)) {
    return { exists: false };
  }
  
  const content = fs.readFileSync(docPath, 'utf-8');
  const stats = fs.statSync(docPath);
  
  // Check if modified recently (within last 7 days)
  const daysSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
  
  return {
    exists: true,
    recentlyUpdated: daysSinceModified < 7,
    hasVersionTable: content.includes('| Version |'),
    hasMigrationGuide: content.includes('## Migration'),
  };
}

// Main check
async function main() {
  const commits = getCommitsSince(sinceTag);
  
  if (commits.length === 0) {
    console.log('ℹ️  No new commits since', sinceTag);
    process.exit(0);
  }
  
  console.log(`📋 Found ${commits.length} commits since ${sinceTag}\n`);
  
  // Find breaking changes
  const breakingCommits = commits.filter(hasBreakingChange);
  
  if (breakingCommits.length === 0) {
    console.log('✅ No breaking changes detected in commits');
    console.log('   All commits appear to be backwards compatible\n');
  } else {
    console.log(`⚠️  Found ${breakingCommits.length} commit(s) with breaking changes:\n`);
    
    breakingCommits.forEach(commit => {
      console.log(`   ${commit.hash} - ${commit.subject}`);
      console.log(`   Author: ${commit.author}\n`);
    });
    
    // Check documentation
    const changelog = isChangelogUpdated();
    const breakingDoc = isBreakingChangesDocUpdated();
    
    console.log('📄 Documentation Status:\n');
    
    // CHANGELOG.md checks
    if (!changelog.exists) {
      console.log('   ❌ CHANGELOG.md does not exist');
    } else if (!changelog.hasUnreleased) {
      console.log('   ⚠️  CHANGELOG.md missing [Unreleased] section');
    } else {
      console.log('   ✅ CHANGELOG.md has [Unreleased] section');
    }
    
    if (breakingCommits.length > 0 && !changelog.hasBreakingChangesSection) {
      console.log('   ⚠️  CHANGELOG.md missing Breaking Changes section');
    }
    
    // BREAKING_CHANGES.md checks
    if (!breakingDoc.exists) {
      console.log('   ❌ BREAKING_CHANGES.md does not exist');
    } else {
      console.log('   ✅ BREAKING_CHANGES.md exists');
      
      if (!breakingDoc.recentlyUpdated) {
        console.log('   ⚠️  BREAKING_CHANGES.md not updated recently');
      }
      
      if (!breakingDoc.hasVersionTable) {
        console.log('   ⚠️  BREAKING_CHANGES.md missing version compatibility table');
      }
      
      if (!breakingDoc.hasMigrationGuide) {
        console.log('   ⚠️  BREAKING_CHANGES.md missing migration guide section');
      }
    }
    
    console.log('\n📝 Action Required:\n');
    console.log('   1. Update CHANGELOG.md with breaking changes under [Unreleased]');
    console.log('   2. Update BREAKING_CHANGES.md with detailed migration guide');
    console.log('   3. Consider using conventional commit format:');
    console.log('      type(scope)!: description [BREAKING CHANGE: explanation]');
    console.log('   4. Run: npm run changelog:check\n');
    
    process.exit(1);
  }
  
  // Check version bump recommendation
  const hasBreaking = breakingCommits.length > 0;
  const hasFeatures = commits.some(c => /^feat(\(.+\))?:/.test(c.subject));
  
  console.log('📊 Version Bump Recommendation:\n');
  
  if (hasBreaking) {
    console.log('   🚨 MAJOR version bump required (breaking changes)');
    console.log('   Run: npm run release:major\n');
  } else if (hasFeatures) {
    console.log('   ✨ MINOR version bump recommended (new features)');
    console.log('   Run: npm run release:minor\n');
  } else {
    console.log('   🔧 PATCH version bump (bug fixes only)');
    console.log('   Run: npm run release:patch\n');
  }
  
  // Final status
  const changelog = isChangelogUpdated();
  const breakingDoc = isBreakingChangesDocUpdated();
  
  if (changelog.exists && breakingDoc.exists) {
    console.log('✅ All documentation files present');
    process.exit(0);
  } else {
    console.log('⚠️  Some documentation files missing');
    if (!changelog.exists) console.log('   - Create CHANGELOG.md');
    if (!breakingDoc.exists) console.log('   - Create BREAKING_CHANGES.md');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
