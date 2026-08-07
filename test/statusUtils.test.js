const test = require('node:test');
const assert = require('node:assert/strict');
const { isStatusNoteActive, getStatusBadgeText, getStatusClass } = require('../public/js/statusUtils.js');

test('active note remains visible before expiry', () => {
  assert.equal(isStatusNoteActive('Taking a break', Date.now() + 60 * 60 * 1000), true);
});

test('expired note stops being shown', () => {
  assert.equal(isStatusNoteActive('Taking a break', Date.now() - 1000), false);
});

test('status badge text supports gaming, chill, and notes', () => {
  assert.equal(getStatusBadgeText('Gaming', null, null), '\uD83C\uDFAE Gaming');
  assert.equal(getStatusBadgeText('Chill', 'Coffee break', Date.now() + 60 * 60 * 1000), '\uD83D\uDE0C Chill \u2022 Coffee break');
});

test('status class maps to a supported style', () => {
  assert.equal(getStatusClass('Gaming'), 'online');
  assert.equal(getStatusClass('Chill'), 'idle');
  assert.equal(getStatusClass('DND'), 'dnd');
});
