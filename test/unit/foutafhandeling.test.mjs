// Fase 29: versie van het script, foutteksten in gewone taal en de wachtrij na herladen
// (NFR-21, NFR-22, §7.17, SYNC-5; BV-04, BV-05, BV-24).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTIES, API_VERSIE } from '../../src/server/api.js';
import { API_VERSIE as WEB_VERSIE, VEROUDERD_TEKST } from '../../src/web/api.js';
import { leesbareMelding, ONBEKENDE_ACTIE_TEKST } from '../../src/web/foutteksten.js';
import { maakWachtrij, WACHTRIJ_SLEUTEL } from '../../src/web/wachtrij.js';
import { maakNepApi } from '../mock-backend/server.mjs';

// NFR-22: de actielijst zoals ze hoort bij API_VERSIE. Wijzig je ACTIES, verhoog dan API_VERSIE aan beide
// kanten en werk deze snapshot bij.
const SNAPSHOT = {
  versie: 2,
  acties: [
    'accommodatieBoeken', 'accommodatieOpslaan', 'accommodatieVerwijderen', 'afhakenMarkeren', 'afvinken',
    'antwoordZetten', 'antwoordenOpslaan', 'beheerlinkMaken', 'betalingMarkeren', 'betalingTerugdraaien',
    'boodschappenDefinitief', 'bundel', 'claimIntrekken', 'claimen', 'deelnemersBeheren', 'deelvormZetten',
    'editieAanmaken', 'editieBijwerken', 'groepOpzetten', 'inloggenBeheer', 'inloggenDeelnemer', 'itemOpslaan',
    'itemVerwijderen', 'kamerIndelen', 'kamersOpslaan', 'kokStoppen', 'kokWorden', 'ledenBeheren', 'linkVernieuwen',
    'linksMaken', 'maaltijdOpslaan', 'meerijden', 'meerijdenStoppen', 'pincodeVernieuwen', 'postOpslaan',
    'postVerwijderen', 'programmaOpslaan', 'programmaVerwijderen', 'ritOpslaan', 'scherm', 'stapZetten', 'status',
    'top3Opgeven', 'uitloggen', 'verrassingOnthullen', 'vragenBeheren', 'wachtwoordInstellen', 'weekendLosmaken', 'weekendVastleggen',
  ],
};

// Geeft '' als lijst en versie bij de snapshot passen, anders de reden.
function vergelijk(acties, versie, snapshot) {
  const lijst = [...acties].sort();
  const gelijk = JSON.stringify(lijst) === JSON.stringify([...snapshot.acties].sort());
  if (versie === snapshot.versie) return gelijk ? '' : `ACTIES is gewijzigd zonder API_VERSIE te verhogen (nu ${versie}).`;
  if (versie < snapshot.versie) return `API_VERSIE ${versie} is lager dan de snapshot (${snapshot.versie}).`;
  return `API_VERSIE is ${versie}: werk de snapshot in deze test bij.`;
}

test('NFR-22 §7.17: API_VERSIE is 2 aan beide kanten en de actielijst past bij de snapshot', () => {
  assert.equal(API_VERSIE, 2);
  assert.equal(WEB_VERSIE, API_VERSIE);
  assert.equal(vergelijk(Object.keys(ACTIES), API_VERSIE, SNAPSHOT), '');
});

test('NFR-22: een gewijzigde actielijst zonder versieverhoging faalt', () => {
  const meer = [...Object.keys(ACTIES), 'nieuweActie'];
  assert.match(vergelijk(meer, SNAPSHOT.versie, SNAPSHOT), /zonder API_VERSIE te verhogen/);
  const minder = Object.keys(ACTIES).filter((a) => a !== 'bundel');
  assert.match(vergelijk(minder, SNAPSHOT.versie, SNAPSHOT), /zonder API_VERSIE te verhogen/);
  assert.match(vergelijk(meer, SNAPSHOT.versie + 1, SNAPSHOT), /werk de snapshot/);
});

test('AAN-14 §7.17: het script controleert de versie vóór de actie, zodat een nieuwe actie bij een oud script api_versie geeft', () => {
  const { api } = maakNepApi();
  const oud = api.verwerk(JSON.stringify({ actie: 'bestaatNiet', apiVersie: API_VERSIE + 1 }));
  assert.equal(oud.fout, 'api_versie');
  // Een nepbackend met apiVersie 1 (een oud script) weigert de voorkant van nu.
  const { api: oudScript } = maakNepApi({ apiVersie: 1 });
  assert.equal(oudScript.verwerk(JSON.stringify({ actie: 'status', apiVersie: API_VERSIE })).fout, 'api_versie');
  assert.equal(oudScript.verwerk(JSON.stringify({ actie: 'status' })).data.apiVersie, 1);
});

test('NFR-21 BV-05: ongeldig-meldingen worden gewone taal zonder veldnaam', () => {
  assert.equal(leesbareMelding('ongeldig', 'Veld data.tekst: te kort.', 'vragenBeheren'), 'Vul een vraag in.');
  assert.equal(leesbareMelding('ongeldig', 'Veld verzoek.actie: onbekende keuze.'), ONBEKENDE_ACTIE_TEKST);
  assert.equal(leesbareMelding('ongeldig', 'Veld data.acties[0].actie: onbekende keuze.', 'bundel'), ONBEKENDE_ACTIE_TEKST);
  assert.equal(ONBEKENDE_ACTIE_TEKST, 'Deze handeling kent het script van de groep nog niet. Vraag de eigenaar het script bij te werken.');
  assert.equal(leesbareMelding('ongeldig', 'Veld verzoek.apiVersie: ontbreekt.'), VEROUDERD_TEKST);
  for (const ruw of ['Veld data.naam: te lang.', 'Veld data.bedrag: buiten bereik.', 'Veld data.iets.anders: onbekend veld.', 'Veld data.waarde: getal verwacht.', 'Veld data.veld: onbekende keuze.']) {
    const t = leesbareMelding('ongeldig', ruw, 'itemOpslaan');
    assert.doesNotMatch(t, /Veld |data\.|verzoek\.|[[\]]/, t);
    assert.match(t, /^[A-Z].*\.$/);
  }
  // Een leesbare servertekst en andere codes blijven zoals ze zijn.
  assert.equal(leesbareMelding('ongeldig', 'Geef het item een naam.'), 'Geef het item een naam.');
  assert.equal(leesbareMelding('gesloten', 'Dit kan nu niet meer.'), 'Dit kan nu niet meer.');
  assert.equal(leesbareMelding('ongeldig', ''), 'De invoer klopt niet. Controleer wat je hebt ingevuld.');
});

function nepKlok() {
  let nu = 0;
  let volgende = 1;
  const wacht = new Map();
  const rust = () => new Promise((r) => setImmediate(r));
  return {
    timers: {
      setTimeout: (f, ms) => { const id = volgende++; wacht.set(id, { op: nu + ms, f }); return id; },
      clearTimeout: (id) => { wacht.delete(id); },
    },
    async verder(ms) {
      const eind = nu + ms;
      for (;;) {
        await rust();
        const [id, t] = [...wacht.entries()].sort((a, b) => a[1].op - b[1].op)[0] || [];
        if (!t || t.op > eind) break;
        nu = t.op;
        wacht.delete(id);
        t.f();
      }
      nu = eind;
      await rust();
    },
  };
}
const nepOpslag = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

test('NFR-21 SYNC-5 BV-05: een geweigerde wachtrij-actie toont geen veldnaam', async () => {
  const klok = nepKlok();
  const w = maakWachtrij({ opslag: nepOpslag(), eigenaar: () => 'x', timers: klok.timers,
    verstuur: async (acties) => ({ uitslagen: acties.map(() => ({ ok: false, fout: 'ongeldig', melding: 'Veld data.acties[0].actie: onbekende keuze.' })) }) });
  w.start();
  w.zet({ actie: 'claimen', data: { itemId: 'a' } });
  await klok.verder(5000);
  assert.match(w.melding(), /teruggezet\. Deze handeling kent het script/);
  assert.doesNotMatch(w.melding(), /Veld|data\./);
});

test('SYNC-5 BV-24: na herladen geeft een geweigerde bewaarde handeling geen melding Niet opgeslagen', async () => {
  const opslag = nepOpslag();
  const klok = nepKlok();
  const eerst = maakWachtrij({ opslag, eigenaar: () => 'x', timers: klok.timers, verstuur: async () => { throw Object.assign(new Error(''), { code: 'offline' }); } });
  eerst.start();
  eerst.zet({ actie: 'claimen', data: { itemId: 'a' }, sleutel: 'claim:a' });
  assert.ok(opslag.getItem(`${WACHTRIJ_SLEUTEL}:x`));

  // Herladen: de bewaarde handeling gaat alsnog en het script weigert haar.
  const later = maakWachtrij({ opslag, eigenaar: () => 'x', timers: nepKlok().timers,
    verstuur: async (acties) => ({ uitslagen: acties.map(() => ({ ok: false, fout: 'ongeldig', melding: 'Veld verzoek.actie: onbekende keuze.' })) }) });
  const gezien = [];
  later.bij((e) => gezien.push(e));
  later.start();
  await later.nu();
  assert.equal(later.aantal(), 0);
  assert.equal(later.melding(), '');
  assert.ok(gezien.every((e) => !e.mislukt));
  assert.equal(opslag.getItem(`${WACHTRIJ_SLEUTEL}:x`), null);
  // Een handeling uit deze sessie die geweigerd wordt, geeft wel de melding met Opnieuw.
  later.zet({ actie: 'claimen', data: { itemId: 'b' }, sleutel: 'claim:b' });
  await later.nu();
  assert.match(later.melding(), /Niet opgeslagen/);
});
