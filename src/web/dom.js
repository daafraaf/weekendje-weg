// Kleine DOM-hulp: elementen bouwen met textContent, nooit met HTML-tekst (NFR-3).
const SVG = 'http://www.w3.org/2000/svg';

export function h(tag, attrs = {}, ...kinderen) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  el.append(...kinderen.flat().filter((k) => k != null && k !== false));
  return el;
}

// Pictogram uit een vast pad (alleen letterlijke paden uit de code, geen gebruikerstekst).
export function icoon(pad, maat = 20) {
  const svg = document.createElementNS(SVG, 'svg');
  const attrs = { width: maat, height: maat, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
  for (const [k, v] of Object.entries(attrs)) svg.setAttribute(k, String(v));
  for (const d of [].concat(pad)) {
    const p = document.createElementNS(SVG, 'path');
    p.setAttribute('d', d);
    svg.append(p);
  }
  return svg;
}
