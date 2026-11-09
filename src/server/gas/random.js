// Willekeur en SHA-256 in Apps Script (spec §7.1.3, §7.1.4).
// Apps Script heeft geen crypto.getRandomValues: bytes zijn SHA-256 over drie getUuid-waarden
// plus een teller. Utilities.computeDigest geeft signed bytes (-128..127) en wil die ook als invoer.

const naarSigned = (b) => (b > 127 ? b - 256 : b);
const naarUnsigned = (b) => b & 255;

export function maakGasSha256(Utilities) {
  return (bytes) => Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes.map(naarSigned)).map(naarUnsigned);
}

export function maakGasRandom(Utilities) {
  let teller = 0;
  function blok() {
    teller += 1;
    const invoer = `${Utilities.getUuid()}${Utilities.getUuid()}${Utilities.getUuid()}:${teller}`;
    return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, invoer, Utilities.Charset.UTF_8).map(naarUnsigned);
  }
  return {
    // Elke aanroep begint met een vers blok; een token zijn de eerste 16 bytes.
    bytes(n) {
      let uit = [];
      while (uit.length < n) uit = uit.concat(blok());
      return uit.slice(0, n);
    },
  };
}
