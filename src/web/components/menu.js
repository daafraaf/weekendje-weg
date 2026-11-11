// Hoofdmenu (NAV-1, NAV-9, NAV-10): de zeven items in stapvolgorde; in een beheersessie Beheren apart na een scheidingslijn.
import { h, icoon } from '../dom.js';
import { menuItems } from '../../shared/start.js';

// routes: de lijst uit de router voor deze sessie (voor de iconen); actief: de naam van het huidige scherm;
// stap: de stap uit de stand van de schil (STA-8). Het item van die stap krijgt een stip (`data-stap-nu`).
export function maakMenuItems({ routes, actief, stap = null }) {
  const icoonVan = (naam) => (routes.find((r) => r.naam === naam) || {}).icoon || [];
  const { items, beheer } = menuItems(routes.map((r) => r.naam));
  // NAV-12, BV-16: op mobiel toont alleen het actieve item zijn label; aria-label houdt de volle naam voor iedereen.
  const link = (m) => h('a', { href: `#/${m.href}`, 'aria-label': m.label, 'aria-current': m.routes.includes(actief) ? 'page' : false, 'data-stap-nu': Boolean(stap) && m.stap === stap }, icoon(icoonVan(m.naam), 24), h('span', {}, m.label));
  return [...items.map(link), ...(beheer ? [h('span', { class: 'menu-scheiding', 'aria-hidden': 'true' }), link(beheer)] : [])];
}
