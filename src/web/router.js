// Router op de hash: #/naam of #/naam?sleutel=waarde. Latere fases registreren hun schermen hier.
// `soort` (optioneel) beperkt een scherm tot 'deelnemer' of 'beheer'; zonder soort is het voor beide.
const routes = new Map();

export function registreer(naam, { titel, icoon, render, soort }) {
  routes.set(naam, { naam, titel, icoon, render, soort });
}

const toegestaan = (r, soort) => !r.soort || !soort || r.soort === soort;

export function routelijst(soort) {
  return [...routes.values()].filter((r) => toegestaan(r, soort));
}

export function lees(hash = location.hash, soort) {
  const [pad, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const naam = routes.has(pad) && toegestaan(routes.get(pad), soort) ? pad : 'start';
  return { naam, params: Object.fromEntries(new URLSearchParams(query)) };
}

let doel = null;
let bijWissel = () => {};
let soortVan = () => undefined;

// Tekent het huidige scherm opnieuw, bijvoorbeeld na een nieuwe login.
export function ververs() {
  if (!doel) return;
  const { naam, params } = lees(location.hash, soortVan());
  // NAV-13: een onbekende route (of een scherm van de andere rol) gaat naar #/start zonder het foute adres te bewaren.
  const pad = location.hash.replace(/^#\/?/, '').split('?')[0];
  if (pad && pad !== naam) history.replaceState(null, '', `${location.pathname}${location.search}#/start`);
  doel.replaceChildren(routes.get(naam).render(params));
  bijWissel(naam, params);
}

export function start(el, wissel = () => {}, soort = () => undefined) {
  doel = el;
  bijWissel = wissel;
  soortVan = soort;
  addEventListener('hashchange', ververs);
  ververs();
}
