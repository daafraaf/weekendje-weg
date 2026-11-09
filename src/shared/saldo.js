// Saldo per deelnemer en totalen van de posten (spec §7.13.6, GELD-6, GELD-7).
import { verdeel } from './verdeling.js';
import { CATEGORIEEN } from './geld.js';

const teken = (post) => (post.soort === 'ontvangst' ? -1 : 1);

// Aandeel per deelnemer in centen van één post; naamVan(id) geeft de voornaam voor de restcent.
export const aandelenVan = (post, naamVan) => verdeel(post.bedrag, post.verdeling, { betalerId: post.betalerId, naamVan });

// §7.13.6: betaald − aandeel in uitgaven − ontvangen + aandeel in ontvangsten + betalingen gedaan − betalingen gekregen.
// De som van alle saldi is altijd nul, omdat elke verdeling exact optelt tot het bedrag.
export function saldi(posten, betalingen = [], { deelnemers = [], naamVan } = {}) {
  const uit = Object.fromEntries(deelnemers.map((id) => [id, 0]));
  const tel = (id, c) => { uit[id] = (uit[id] || 0) + c; };
  for (const p of posten) {
    const t = teken(p);
    tel(p.betalerId, t * p.bedrag);
    for (const [id, c] of Object.entries(aandelenVan(p, naamVan))) tel(id, -t * c);
  }
  for (const b of betalingen) { tel(b.vanId, b.bedrag); tel(b.naarId, -b.bedrag); }
  return uit;
}

// AAN-60: de totalen zijn netto: een ontvangst (bijvoorbeeld borg terug) gaat van de uitgaven in zijn
// categorie af. Per categorie in de vaste volgorde, alleen categorieën met posten. `mijnDeel` is het
// aandeel van `ikId` in de uitgaven min zijn aandeel in de ontvangsten.
export function totalen(posten, { ikId, naamVan } = {}) {
  const perCategorie = new Map();
  let totaal = 0;
  let mijnDeel = 0;
  for (const p of posten) {
    const t = teken(p);
    totaal += t * p.bedrag;
    perCategorie.set(p.categorie, (perCategorie.get(p.categorie) || 0) + t * p.bedrag);
    if (ikId) mijnDeel += t * (aandelenVan(p, naamVan)[ikId] || 0);
  }
  const categorieen = CATEGORIEEN.filter((c) => perCategorie.has(c.sleutel)).map((c) => ({ sleutel: c.sleutel, label: c.label, bedrag: perCategorie.get(c.sleutel) }));
  return { totaal, mijnDeel, categorieen };
}
