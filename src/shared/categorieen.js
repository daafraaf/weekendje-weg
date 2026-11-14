// Categorieën van items en het voorstel uit een vaste woordenlijst (spec §7.8.2, §7.8.3, MEE-4, AAN-19).
export const CATEGORIEEN = [
  'Groente en fruit', 'Brood', 'Vlees, vis en vega', 'Kaas en vleeswaren', 'Zuivel en eieren', 'Ontbijt en beleg',
  'Pasta, rijst en wereldkeuken', 'Conserven en sauzen', 'Koek, snoep en chips', 'Frisdrank, bier en wijn',
  'Diepvries', 'Huishouden', 'Overig',
];

export const STANDAARD_CATEGORIE = 'Overig';

// Per categorie de trefwoorden; een item hoort bij de categorie waarvan een woord in de naam voorkomt.
const WOORDEN = {
  'Groente en fruit': ['tomaat', 'tomaten', 'komkommer', 'sla', 'ui', 'uien', 'knoflook', 'paprika', 'wortel', 'aardappel', 'appel', 'banaan', 'peer', 'citroen', 'sinaasappel', 'druiven', 'aardbei', 'champignon', 'courgette', 'broccoli', 'spinazie', 'avocado', 'fruit', 'groente', 'salade', 'prei', 'mais'],
  Brood: ['brood', 'stokbrood', 'baguette', 'wrap', 'tortilla', 'bol', 'broodjes', 'croissant', 'toast', 'pita'],
  'Vlees, vis en vega': ['kip', 'gehakt', 'worst', 'burger', 'spek', 'biefstuk', 'zalm', 'vis', 'garnaal', 'tofu', 'tempeh', 'vega', 'rookworst', 'saté', 'spareribs', 'vlees'],
  'Kaas en vleeswaren': ['kaas', 'ham', 'salami', 'filet', 'leverworst', 'brie', 'feta', 'mozzarella', 'parmezaan', 'vleeswaren', 'plakken'],
  'Zuivel en eieren': ['melk', 'yoghurt', 'boter', 'room', 'ei', 'eieren', 'kwark', 'slagroom', 'havermelk', 'zuivel'],
  'Ontbijt en beleg': ['pindakaas', 'hagelslag', 'jam', 'honing', 'muesli', 'cornflakes', 'havermout', 'beleg', 'chocoladepasta', 'granola', 'koffie', 'thee', 'suiker', 'nutella'],
  'Pasta, rijst en wereldkeuken': ['pasta', 'spaghetti', 'penne', 'rijst', 'noodles', 'couscous', 'tortellini', 'macaroni', 'nasi', 'bami', 'taco', 'curry', 'lasagne'],
  'Conserven en sauzen': ['saus', 'ketchup', 'mayonaise', 'mosterd', 'olijfolie', 'olie', 'azijn', 'bonen', 'blik', 'soep', 'pesto', 'passata', 'kruiden', 'zout', 'peper', 'bouillon', 'sambal', 'olijven'],
  'Koek, snoep en chips': ['chips', 'koek', 'koekjes', 'snoep', 'chocolade', 'stroopwafel', 'stroopwafels', 'drop', 'noten', 'nootjes', 'borrelnoot', 'popcorn', 'toef', 'taart', 'cake', 'dipsaus'],
  'Frisdrank, bier en wijn': ['bier', 'wijn', 'cola', 'fris', 'frisdrank', 'sap', 'water', 'whisky', 'gin', 'jenever', 'prosecco', 'radler', 'ipa', 'limonade', 'tonic', 'sinas', 'ijsthee', 'drank', 'pils', 'tripel', 'dubbel', 'speciaalbier', 'westmalle', 'karmeliet', 'chouffe', 'flesjes', 'flessen'],
  Diepvries: ['ijs', 'diepvries', 'pizza', 'friet', 'frites', 'bladerdeeg', 'kroket', 'bitterbal', 'bitterballen'],
  Huishouden: ['wc-papier', 'toiletpapier', 'keukenrol', 'keukenpapier', 'afwasmiddel', 'zeep', 'vuilniszak', 'vuilniszakken', 'spons', 'servet', 'servetten', 'aluminiumfolie', 'folie', 'kaars', 'kaarsen', 'aansteker', 'lucifers', 'houtskool', 'bbq-blokjes', 'batterij', 'batterijen', 'tissues'],
};

const schoon = (t) => t.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}-]+/gu, ' ').trim();

// MEE-4, AAN-19: een categorie voor een naam; geen treffer geeft Overig. Een heel woord of het begin van een woord telt
// ("tomatensaus" valt onder de eerste treffer in de volgorde van §7.8.2), losse korte woorden alleen als heel woord.
export function stelCategorieVoor(naam) {
  const woorden = schoon(String(naam || '')).split(' ').filter(Boolean);
  if (!woorden.length) return STANDAARD_CATEGORIE;
  for (const [categorie, lijst] of Object.entries(WOORDEN)) {
    for (const w of lijst) {
      if (woorden.some((x) => x === w || (w.length >= 4 && x.startsWith(w)))) return categorie;
    }
  }
  return STANDAARD_CATEGORIE;
}
