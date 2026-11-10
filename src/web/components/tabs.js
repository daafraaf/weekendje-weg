// NAV-11: Afrekening heeft twee tabs, Wie betaalt wat (#/posten) en Eindafrekening (#/afrekening). Gewone links,
// zodat de oude adressen blijven werken; de actieve tab heeft aria-current.
import { h } from '../dom.js';

export function maakAfrekenTabs(actief, editieId = '') {
  const q = editieId ? `?editie=${encodeURIComponent(editieId)}` : '';
  const tab = (naam, tekst) => h('a', { class: 'tab', href: `#/${naam}${q}`, 'aria-current': naam === actief ? 'page' : false }, tekst);
  return h('nav', { class: 'tabs', 'aria-label': 'Afrekening' }, tab('posten', 'Wie betaalt wat'), tab('afrekening', 'Eindafrekening'));
}
