'use strict';
const assert = require('assert');
const {
  extractCommandSubstitutions,
  extractSubshellGroups,
  extractBraceGroups,
} = require('../../scripts/lib/shell-substitution');

console.log('=== Testing shell-substitution.js ===\n');

let passed = 0;
let failed = 0;

function test(desc, fn) {
  try {
    fn();
    console.log(`  ✓ ${desc}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${desc}: ${e.message}`);
    failed++;
  }
}

// Terminated spans are extracted (and recurse) as before.
console.log('Terminated spans:');
test('extracts a $(...) command substitution', () => {
  assert.strictEqual(extractCommandSubstitutions('echo $(whoami)')[0], 'whoami');
});
test('extracts a `...` command substitution', () => {
  assert.strictEqual(extractCommandSubstitutions('echo `whoami`')[0], 'whoami');
});
test('extracts a (...) subshell group', () => {
  assert.strictEqual(extractSubshellGroups('(npm run dev)')[0], 'npm run dev');
});
test('extracts a { ...; } brace group', () => {
  assert.strictEqual(extractBraceGroups('{ rm -rf x; }')[0], ' rm -rf x; ');
});
test('escaped char mid-span is preserved, not truncated', () => {
  assert.strictEqual(extractCommandSubstitutions('$(a\\)b)')[0], 'a\\)b');
});

// Regression: a trailing backslash at the end of an UNTERMINATED span must be
// appended exactly once (previously the fallthrough double-appended it, and in
// the backtick case looped forever). Covers all four body-building parsers.
console.log('\nUnterminated span ending in a backslash (no doubled backslash):');
test('$(...) — trailing backslash not doubled', () => {
  assert.strictEqual(extractCommandSubstitutions('$(foo\\')[0], 'foo\\');
});
test('`...` — trailing backslash not doubled', () => {
  assert.strictEqual(extractCommandSubstitutions('`foo\\')[0], 'foo\\');
});
test('(...) subshell — trailing backslash not doubled', () => {
  assert.strictEqual(extractSubshellGroups('(foo\\')[0], 'foo\\');
});
test('{ ...; } brace — trailing backslash not doubled', () => {
  assert.strictEqual(extractBraceGroups('{ foo\\')[0], ' foo\\');
});

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
if (failed > 0) {
  process.exit(1);
}
