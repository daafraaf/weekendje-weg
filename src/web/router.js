// Router op de hash: #/naam of #/naam?sleutel=waarde. Latere fases registreren hun schermen hier.
const routes = new Map();

export function registreer(naam, { titel, icoon, render }) {
  routes.set(naam, { naam, titel, icoon, render });
}

export function routelijst() {
  return [...routes.values()];
}

export function lees(hash = location.hash) {
  const [pad, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const naam = routes.has(pad) ? pad : 'start';
  return { naam, params: Object.fromEntries(new URLSearchParams(query)) };
}

export function start(doel, bijWissel = () => {}) {
  const toon = () => {
    const { naam, params } = lees();
    doel.replaceChildren(routes.get(naam).render(params));
    bijWissel(naam, params);
  };
  addEventListener('hashchange', toon);
  toon();
}
