// Schuif met vaste stappen (FRM-2, FRM-3): toont de gekozen schijf als tekst en "Nog kiezen" zolang er niets gekozen is.
// aantal stappen, tekstVan(index) geeft de tekst van een stap, waarde is een index of null.
import { h } from '../dom.js';

export function maakSchuif({ id, label, aantal, tekstVan, onder = '', waarde = null, bijWijziging = () => {}, alleenLezen = false }) {
  let gekozen = waarde;
  const tekst = h('span', { class: 't-h2 t-num', 'aria-hidden': 'true' });
  const invoer = h('input', { id, class: 'range', type: 'range', min: 0, max: aantal - 1, step: 1, value: gekozen ?? 0, disabled: alleenLezen });

  function toon() {
    const t = gekozen === null ? 'Nog kiezen' : tekstVan(gekozen);
    tekst.textContent = t;
    tekst.style.color = gekozen === null ? 'var(--text-secondary)' : '';
    invoer.setAttribute('aria-valuetext', t);
    invoer.dataset.gekozen = gekozen === null ? '' : String(gekozen);
  }
  function kies(index) {
    if (index === gekozen) return;
    gekozen = index;
    toon();
    bijWijziging(index);
  }

  invoer.addEventListener('input', () => kies(Number(invoer.value)));
  // Een schuif die op de eerste stap staat, geeft bij tikken of toets geen input-gebeurtenis: dat telt toch als kiezen.
  invoer.addEventListener('change', () => kies(Number(invoer.value)));
  invoer.addEventListener('keydown', (e) => {
    if (gekozen === null && Number(invoer.value) === 0 && ['Home', 'ArrowLeft', 'ArrowDown'].includes(e.key)) kies(0);
  });
  invoer.addEventListener('click', () => { if (gekozen === null) kies(Number(invoer.value)); });
  toon();

  return h('div', { class: 'solid panel' },
    h('label', { class: 'label', for: id }, label),
    h('div', { class: 'schuif-kop' }, tekst, onder ? h('span', { class: 't-small t-sec' }, onder) : null),
    invoer);
}
