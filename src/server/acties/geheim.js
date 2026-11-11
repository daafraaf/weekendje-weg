// Wie de gegevens van een verrassing mag zien (ACC-9). Elke leesactie die een accommodatie teruggeeft, vraagt het hier;
// een deelnemer krijgt bij een niet-onthulde verrassing alleen dat het geregeld is, de organisator ziet alles.
import { isGeheim } from '../../shared/accommodatie.js';

// Het lid van de sessie is organisator van deze editie, met een beheersessie of met zijn eigen deelnemerslink.
export function isOrganisatorVan(store, sessie, editieId) {
  if (!sessie || !sessie.lidId) return false;
  return store.lees('Deelnemers').some((d) => d.editieId === editieId && d.lidId === sessie.lidId && d.rol === 'organisator');
}

export const verborgenVoor = (store, sessie, editie) => isGeheim(editie) && !isOrganisatorVan(store, sessie, editie.id);

// De geboekte accommodatie zoals start en archief haar tonen: bij een geheime verrassing zonder naam, plaats of link.
export function geboekteVoor(store, sessie, editie) {
  const a = editie.geboektAccommodatieId && store.vind('Accommodaties', editie.geboektAccommodatieId);
  if (!a || a.editieId !== editie.id) return null;
  if (verborgenVoor(store, sessie, editie)) return { geregeld: true, verrassing: true };
  return { geregeld: true, verrassing: isGeheim(editie), naam: a.naam, plaats: a.plaats, link: a.link, bedden: a.bedden, eigenKamers: a.eigenKamers };
}
