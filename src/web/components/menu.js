// Hoofdmenu (STA-6, NAV-1, AAN-12): vanaf de stap Accommodatie alle onderdelen, daarvoor formulier en voortgang.
import { h, icoon } from '../dom.js';
import { inMenu, BEHEER_SCHERMEN } from '../../shared/start.js';

// routes: de lijst uit de router; stap: de stap van de editie of null als die nog niet bekend is.
export function maakMenuItems({ routes, stap, actief }) {
  return routes.filter((r) => inMenu(r.naam, stap)).map((r) => h('a', { href: `#/${r.naam}`, 'aria-current': r.naam === actief || (r.naam === 'beheren' && BEHEER_SCHERMEN.includes(actief)) ? 'page' : false }, icoon(r.icoon, 24), h('span', {}, r.titel)));
}
