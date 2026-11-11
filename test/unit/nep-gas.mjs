// Nagebootste Apps Script-diensten voor unittests (geen echte Google-aanroepen).
import { createHash, randomUUID } from 'node:crypto';

// Utilities zoals in Apps Script: computeDigest geeft signed bytes terug en weigert unsigned invoer.
export function nepUtilities() {
  return {
    DigestAlgorithm: { SHA_256: 'SHA_256' },
    Charset: { UTF_8: 'UTF_8' },
    getUuid: () => randomUUID(),
    computeDigest(alg, waarde) {
      if (alg !== 'SHA_256') throw new Error('alleen SHA_256');
      let buf;
      if (typeof waarde === 'string') buf = Buffer.from(waarde, 'utf8');
      else {
        if (!waarde.every((b) => Number.isInteger(b) && b >= -128 && b <= 127)) throw new Error('Byte[] verwacht (-128..127)');
        buf = Buffer.from(waarde.map((b) => b & 255));
      }
      return [...createHash('sha256').update(buf).digest()].map((b) => (b > 127 ? b - 256 : b));
    },
  };
}

// Zoals Sheets omzet als het celformaat geen tekst ('@') is.
function sheetsOmzetting(w) {
  if (typeof w !== 'string') return w;
  if (/^[=+\-@]/.test(w)) return { formule: w };
  if (/^\d{4}-\d{2}-\d{2}$/.test(w)) return new Date(`${w}T00:00:00Z`);
  if (/^\d{1,2}:\d{2}$/.test(w)) return new Date(`1899-12-30T${w.padStart(5, '0')}:00Z`);
  if (/^\d+\/\d+$/.test(w)) return new Date('2026-02-01T00:00:00Z');
  if (w !== '' && !Number.isNaN(Number(w))) return Number(w);
  return w;
}

export function nepSpreadsheet() {
  const bladen = new Map();
  const gebeurtenissen = [];
  const tellers = { getValues: new Map() };

  function nepBlad(naam) {
    const cellen = []; // [{ waarde, formaat }]
    const cel = (r, k) => {
      while (cellen.length < r) cellen.push([]);
      const rij = cellen[r - 1];
      while (rij.length < k) rij.push({ waarde: '', formaat: '' });
      return rij[k - 1];
    };
    const breedte = () => Math.max(0, ...cellen.map((r) => r.length));
    let maxKolommen = 26; // zoals een nieuw blad; getRange daarbuiten faalt, zoals in Sheets
    return {
      getName: () => naam,
      getDataRange: () => ({
        getValues: () => {
          tellers.getValues.set(naam, (tellers.getValues.get(naam) || 0) + 1);
          if (!cellen.length) return [['']];
          const b = breedte();
          return cellen.map((r) => Array.from({ length: b }, (_, i) => {
            const w = r[i] ? r[i].waarde : '';
            return w && typeof w === 'object' && 'formule' in w ? '#FORMULE' : w;
          }));
        },
      }),
      getMaxColumns: () => maxKolommen,
      insertColumnsAfter: (na, aantal) => { gebeurtenissen.push(`kolommen ${naam} ${aantal}`); maxKolommen += aantal; },
      zetMaxKolommen: (aantal) => { maxKolommen = aantal; },
      getRange: (r, k, nr, nk) => {
        if (k + nk - 1 > maxKolommen) throw new Error('The coordinates of the range are outside the dimensions of the sheet.');
        return {
        setNumberFormat(f) {
          gebeurtenissen.push(`formaat ${naam} ${r}`);
          for (let i = 0; i < nr; i++) for (let j = 0; j < nk; j++) cel(r + i, k + j).formaat = f;
          return this;
        },
        setValues(waarden) {
          gebeurtenissen.push(`waarden ${naam} ${r}`);
          for (let i = 0; i < nr; i++) for (let j = 0; j < nk; j++) {
            const c = cel(r + i, k + j);
            const w = waarden[i][j];
            c.waarde = c.formaat === '@' ? String(w) : sheetsOmzetting(w);
          }
          return this;
        },
      }; },
      deleteRow: (r) => { cellen.splice(r - 1, 1); },
      deleteRows: (r, n) => { cellen.splice(r - 1, n); },
      cellen,
    };
  }

  return {
    getSheetByName: (naam) => bladen.get(naam) || null,
    insertSheet: (naam) => { const b = nepBlad(naam); bladen.set(naam, b); return b; },
    bladen,
    gebeurtenissen,
    tellers,
  };
}
