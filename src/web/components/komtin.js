// NAV-10: een scherm dat nog niet aan de beurt is, toont rustig in welke stap het komt. Tekst via textContent (NFR-5).
import { h, icoon } from '../dom.js';
import { komtInStap } from '../../shared/stappen.js';

const KLOK = ['M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17', 'M12 7.5V12l3 2'];

export function maakKomtIn(stap, uitleg = '') {
  return h('div', { class: 'glass panel dl-info komt-in', role: 'status' },
    h('span', { class: 'ico ico-acc' }, icoon(KLOK, 22)),
    h('div', {}, h('p', { class: 't-h3' }, komtInStap(stap)), uitleg ? h('p', { class: 't-body t-sec' }, uitleg) : null));
}
