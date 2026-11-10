// Uitrolinstellingen en de dialogen van het Sheet-menu (spec §7.18, GRP-6, GRP-8).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APP_ADRES, SJABLOON_KOPIE, appAdresGeldig, sjabloonKopieGeldig } from '../../src/shared/uitrol.js';
import { opzetlinkVan, beheerlinkVan, leesScriptUrl, scriptUrl } from '../../src/shared/links.js';
import * as sessie from '../../src/web/sessie.js';
import { opzetDialoog, beheerDialoog, esc } from '../../src/server/gas/dialoog.js';

const ID = 'AKfycbx1234567890abcdefghij';
const APP = 'https://voorbeeld.github.io/weekendje-weg/';
const zonder = (html, deel) => html.split(esc(deel)).join('');

test('AAN-77: de ingevulde uitrolinstellingen hebben de juiste vorm; leeg is geldig', () => {
  assert.ok(appAdresGeldig(APP_ADRES), `APP_ADRES: ${APP_ADRES}`);
  assert.ok(sjabloonKopieGeldig(SJABLOON_KOPIE), `SJABLOON_KOPIE: ${SJABLOON_KOPIE}`);
  assert.ok(appAdresGeldig('') && sjabloonKopieGeldig(''));
  assert.ok(appAdresGeldig(APP) && appAdresGeldig('https://voorbeeld.nl/'));
  for (const fout of ['http://voorbeeld.github.io/app/', 'https://voorbeeld.github.io/app', 'https://voorbeeld.github.io/app/#x', 'https://voorbeeld.github.io/app/?a=1', 'voorbeeld.github.io/', ' ', null, undefined]) assert.equal(appAdresGeldig(fout), false, String(fout));
  assert.ok(sjabloonKopieGeldig('https://docs.google.com/spreadsheets/d/1AbC_def-GHIjklmnopqrstuvwxyz0123456789/copy'));
  for (const fout of ['https://docs.google.com/spreadsheets/d/1AbC_def-GHIjklmnopqrstuvwxyz0123456789/edit', 'http://docs.google.com/spreadsheets/d/1AbC_def-GHIjklmnopqrstuvwxyz0123456789/copy', 'https://docs.google.com/spreadsheets/d/kort/copy', 'https://voorbeeld.nl/spreadsheets/d/1AbC_def-GHIjklmnopqrstuvwxyz0123456789/copy', null]) assert.equal(sjabloonKopieGeldig(fout), false, String(fout));
});

test('§7.18: sessie.js exporteert de linkfuncties uit shared opnieuw', () => {
  assert.equal(sessie.leesScriptUrl, leesScriptUrl);
  assert.equal(sessie.scriptUrl, scriptUrl);
  assert.equal(sessie.beheerlinkVan, beheerlinkVan);
});

test('GRP-6 §7.18.4: de dialoog toont de opzetlink als knop en als kopieerveld, met de geldigheid', () => {
  const html = opzetDialoog({ appAdres: APP, webappId: ID, code: 'ABCD2345', minuten: 30 });
  const link = opzetlinkVan(APP, ID, 'ABCD2345');
  assert.equal(link, `${APP}#/opzetten?b=${ID}&code=ABCD2345`);
  assert.ok(html.includes(`<a class="knop" href="${esc(link)}" target="_blank" rel="noopener noreferrer">`));
  assert.ok(html.includes(`readonly value="${esc(link)}"`));
  assert.match(html, /30 minuten geldig/);
  // Buiten APP_ADRES staat er geen http-adres in, en geen script.
  assert.doesNotMatch(zonder(html, APP), /http/i);
  assert.doesNotMatch(html, /<script|\son[a-z]+=/i);
  // De link uit de dialoog leest de app weer uit.
  assert.deepEqual(sessie.leesOpzetlink(link.slice(link.indexOf('#'))), { scriptId: ID, code: 'ABCD2345' });
});

test('GRP-6: zonder APP_ADRES toont de dialoog de setupcode en de webapp-URL om te plakken', () => {
  const html = opzetDialoog({ appAdres: '', webappId: ID, code: 'ABCD2345', minuten: 30 });
  assert.ok(html.includes('id="code" type="text" readonly value="ABCD2345"'));
  assert.ok(html.includes(`value="${scriptUrl(ID)}"`));
  assert.doesNotMatch(html, /opzetten\?/);
  assert.doesNotMatch(zonder(html, scriptUrl(ID)), /http/i);
});

test('GRP-8: de beheerdialoog toont de volledige beheerlink in een kopieerveld', () => {
  const sleutel = 'A'.repeat(22);
  const html = beheerDialoog({ appAdres: APP, webappId: ID, token: sleutel, voornaam: 'Eva' });
  const link = beheerlinkVan(APP, ID, sleutel);
  assert.ok(html.includes(`readonly value="${esc(link)}"`));
  assert.deepEqual(sessie.leesLink(link), { scriptId: ID, soort: 'beheer', token: sleutel });
  assert.doesNotMatch(zonder(html, APP), /http/i);
});

test('NFR-5 §7.18.4: elke waarde in de dialoog is ge-escaped', () => {
  const vies = '<img src=x onerror=alert(1)>"&\'';
  assert.equal(esc(vies), '&lt;img src=x onerror=alert(1)&gt;&quot;&amp;&#39;');
  for (const html of [
    opzetDialoog({ appAdres: `${APP}${vies}`, webappId: vies, code: vies, minuten: vies }),
    opzetDialoog({ appAdres: '', webappId: '', code: vies, minuten: vies }),
    beheerDialoog({ appAdres: `${APP}${vies}`, webappId: vies, token: vies, voornaam: vies }),
  ]) {
    assert.doesNotMatch(html, /<img|onerror=alert\(1\)>|"&'/);
    assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;&quot;&amp;&#39;'));
  }
});
