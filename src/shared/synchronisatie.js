// Grenzen van de synchronisatielaag (SYNC-2, SYNC-5, spec §7.16.5). Voorkant (wachtrij) en script (bundel)
// gebruiken dezelfde waarden.

// AAN-82: debounce van 1 seconde na de laatste kleine handeling, opnieuw proberen na 2, 4, 8, 16 en 30 seconden,
// daarna terugdraaien; hooguit 25 acties per bundel.
export const DEBOUNCE_MS = 1000;
export const WACHTTIJDEN_MS = [2000, 4000, 8000, 16000, 30000];
export const BUNDEL_MAX = 25;

// AAN-83: alleen deze acties zijn optimistisch en mogen in een bundel. Ze zijn idempotent en schrijven één rij of
// één veld (de top 3: de eigen rijen in Stemmen); de laatste schrijfactie wint, zonder versiecheck.
// Fase 35 (MEE-12): een boodschap op de lijst zetten (`boodschapToevoegen`); dezelfde naam van dezelfde persoon is één item.
export const BUNDEL_ACTIES = ['claimen', 'claimIntrekken', 'afvinken', 'antwoordZetten', 'top3Opgeven', 'boodschapToevoegen'];
