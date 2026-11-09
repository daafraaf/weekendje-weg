// Alle handlers van het doorgeefluik; Apps Script en de nepbackend gebruiken dezelfde set.
import { toegangHandlers } from './toegang.js';

export const ALLE_HANDLERS = { ...toegangHandlers };
