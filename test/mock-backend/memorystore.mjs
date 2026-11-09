// MemoryStore: Node-adapter van de Store-interface met opslag in het geheugen (spec §3).
// Bewaart net als de Sheet alleen tekstcellen, zodat typen en versies door dezelfde logica gaan.
import { createHash, getRandomValues } from 'node:crypto';
import { maakStore, TABS, naarCel } from '../../src/server/store.js';

export const nodeSha256 = (bytes) => [...createHash('sha256').update(Uint8Array.from(bytes)).digest()];
export const nodeRandom = { bytes: (n) => [...getRandomValues(new Uint8Array(n))] };

export function maakMemoryAdapter() {
  const tabs = new Map();
  const leesTellers = new Map();
  const rijen = (tab) => { if (!tabs.has(tab)) tabs.set(tab, []); return tabs.get(tab); };
  return {
    leesWaarden(tab) {
      leesTellers.set(tab, (leesTellers.get(tab) || 0) + 1);
      return rijen(tab).map((r) => r.slice());
    },
    schrijfRij(tab, rijNr, waarden) {
      const r = rijen(tab);
      while (r.length < rijNr - 1) r.push([]);
      r[rijNr - 1] = waarden.map(String);
    },
    verwijderRij(tab, rijNr) { rijen(tab).splice(rijNr - 1, 1); },
    verwijderRijen(tab, vanaf, aantal) { rijen(tab).splice(vanaf - 1, aantal); },
    flush() {},
    leesTellers,
    ruw: (tab) => rijen(tab).map((r) => r.slice()),
  };
}

// Het slot gedraagt zich als LockService.getScriptLock(): tryLock geeft false als het bezet is.
export function maakMemoryLock() {
  let bezet = false;
  return {
    tryLock() { if (bezet) return false; bezet = true; return true; },
    releaseLock() { bezet = false; },
    get bezet() { return bezet; },
  };
}

// Eigenschappen zoals PropertiesService.getScriptProperties(): kleine geheimen buiten de Sheet (setupcode).
export function maakMemoryEigenschappen() {
  const m = new Map();
  return { lees: (k) => (m.has(k) ? m.get(k) : null), zet: (k, w) => { m.set(k, String(w)); }, wis: (k) => { m.delete(k); } };
}

// seed: { Tab: [rijobject, ...] }, letterlijk opgeslagen (ook versie en bijgewerkt).
export function maakMemoryStore(seed = {}, { random = nodeRandom, nu = () => new Date() } = {}) {
  const adapter = maakMemoryAdapter();
  for (const [tab, lijst] of Object.entries(seed)) {
    const schema = TABS[tab].kolommen;
    const kop = Object.keys(schema);
    adapter.schrijfRij(tab, 1, kop);
    lijst.forEach((rij, i) => adapter.schrijfRij(tab, i + 2, kop.map((k) => naarCel(schema[k], rij[k]))));
  }
  const store = maakStore(adapter, { random, nu });
  return { store, adapter };
}
