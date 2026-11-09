// Globale functies die Apps Script op naam aanroept (spec §3, NFR-20).
// scripts/build.mjs maakt voor elke naam een top-level stub naar WW.<naam>.
export const INGANGEN = ['doPost', 'doGet', 'onOpen', 'menuSetupcode', 'menuBeheerlink', 'menuWachtwoordResetten', 'menuUitleg', 'menuLogLegen'];
