// OND-1, AAN-80: welke onderdelen aan staan. Eén vlag per onderdeel, op deze ene plek; de voorkant leest ze voor routes,
// menu, startscherm en eersteActie. Uit betekent weg uit de interface (geen grijs item); acties en tabs blijven bestaan.
// Een onderdeel aanzetten is deze vlag op true zetten.
export const ONDERDELEN = {
  boodschappen: false,
  kookbeurten: false,
  programma: false,
  kamers: false,
  carpool: false,
};

export const onderdeelAan = (naam, vlaggen = ONDERDELEN) => vlaggen[naam] === true;
