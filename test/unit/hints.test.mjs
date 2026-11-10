import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HINTS } from '../../src/web/hints.js';

test('NAV-7: elke hint is een korte tekst van hooguit 200 tekens', () => {
  assert.ok(Object.keys(HINTS).length >= 7);
  for (const [sleutel, tekst] of Object.entries(HINTS)) {
    assert.ok(tekst.length > 0 && tekst.length <= 200, `${sleutel}: ${tekst.length} tekens`);
  }
});
