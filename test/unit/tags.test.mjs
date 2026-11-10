import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tagSleutel, voegToe, splitsTekst, tagsUitTekst, tagsFout, TAG_MAX, TAGS_MAX } from '../../src/shared/tags.js';

test('AAN-74: schrijfwijzen van dezelfde tag zijn dubbel, de eerste schrijfwijze blijft', () => {
  assert.equal(tagSleutel('Escape room'), tagSleutel('escaperoom'));
  assert.equal(tagSleutel('Escape room'), tagSleutel('  escape   room '));
  assert.equal(tagSleutel('Kanoën'), tagSleutel('kanoen'));
  const r = voegToe(['Escape room'], ['escaperoom', ' Wandelen ', '', 'ESCAPE  ROOM']);
  assert.deepEqual(r.tags, ['Escape room', 'Wandelen']);
  assert.deepEqual(r.dubbel, ['escaperoom', 'ESCAPE ROOM']);
});

test('TAG-4: plakken splitst op komma, puntkomma en regeleinde', () => {
  assert.deepEqual(splitsTekst('a, b;c\nd\r\n\n e '), ['a', 'b', 'c', 'd', 'e']);
});

test('AAN-76: oude tekst wordt een lijst zonder verlies van inhoud', () => {
  assert.deepEqual(tagsUitTekst('kanoën, wellness; sauna'), ['kanoën', 'wellness', 'sauna']);
  assert.deepEqual(tagsUitTekst(''), []);
  assert.deepEqual(tagsUitTekst(null), []);
  assert.deepEqual(tagsUitTekst(['a', 'A', 5]), ['a']);
  const lang = 'Graag ergens met een haard en een grote tafel voor bordspellen';
  const tags = tagsUitTekst(lang);
  assert.ok(tags.length > 1 && tags.every((t) => t.length <= TAG_MAX));
  assert.equal(tags.join(' '), lang);
  const lettergreep = Array.from({ length: 95 }, (_, i) => String.fromCharCode(97 + (i % 26))).join('');
  assert.equal(tagsUitTekst(lettergreep).join(''), lettergreep);
});

test('TAG-5: tagsFout weigert te lang, te veel, dubbel en losse spaties', () => {
  assert.equal(tagsFout(['sauna', 'bowlen']), null);
  assert.equal(tagsFout([]), null);
  assert.ok(tagsFout(['x'.repeat(TAG_MAX + 1)]));
  assert.ok(tagsFout(Array.from({ length: TAGS_MAX + 1 }, (_, i) => `t${i}`)));
  assert.equal(tagsFout(Array.from({ length: TAGS_MAX }, (_, i) => `t${i}`)), null);
  assert.ok(tagsFout(['Sauna', 'sauna']));
  assert.ok(tagsFout([' sauna']));
  assert.ok(tagsFout(['']));
  assert.ok(tagsFout('sauna'));
});
