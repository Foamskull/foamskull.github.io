let rows = [];
let cursor = { r: 0, c: 0 };
let api = {};
let polling = false;
const held = { buttons: {}, axis: '' };

function visible(el) {
  if (!el || el.disabled) return false;
  if (el.closest('[hidden]')) return false;
  return el.getClientRects().length > 0;
}

function collect() {
  const palette = document.querySelector('#palette');
  const overlay = document.querySelector('#overlay');
  const root = palette && !palette.hidden ? palette : overlay && !overlay.hidden ? overlay : document.querySelector('#app');
  rows = [...root.querySelectorAll('[data-row]')].map(row => (
    [...row.querySelectorAll('[data-item]')].filter(el => el.closest('[data-row]') === row && visible(el))
  )).filter(row => row.length);
}

function place(r, c) {
  collect();
  if (!rows.length) return;
  const rr = (r + rows.length) % rows.length;
  const row = rows[rr];
  const cc = Math.max(0, Math.min(c, row.length - 1));
  cursor = { r: rr, c: cc };
  const el = row[cc];
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: api.motion() ? 'smooth' : 'auto' });
}

function currentX() {
  const el = rows[cursor.r]?.[cursor.c];
  if (!el) return 0;
  const box = el.getBoundingClientRect();
  return box.left + box.width / 2;
}

function moveVertical(dir) {
  collect();
  if (!rows.length) return;
  const x = currentX();
  const r = (cursor.r + dir + rows.length) % rows.length;
  let best = 0;
  let score = Infinity;
  rows[r].forEach((el, i) => {
    const box = el.getBoundingClientRect();
    const delta = Math.abs(box.left + box.width / 2 - x);
    if (delta < score) { score = delta; best = i; }
  });
  place(r, best);
}

function activate(el) {
  if (!el) return;
  if (el.tagName === 'A' || el.tagName === 'BUTTON') el.click();
  else el.querySelector('a,button')?.click();
}

function typing(target) {
  const tag = target?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable;
}

function onKey(event) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    api.togglePalette();
    return;
  }
  if (event.key === '/' && !typing(event.target) && document.querySelector('#palette').hidden) {
    event.preventDefault();
    api.togglePalette(true);
    return;
  }
  if (!document.querySelector('#palette').hidden) {
    api.paletteKey(event);
    return;
  }
  if (event.key === 'Escape') {
    if (typing(event.target)) { event.target.blur(); return; }
    api.closeOverlay();
    return;
  }
  if (typing(event.target)) return;
  if (api.editing() && (event.key === '[' || event.key === ']')) {
    event.preventDefault();
    const id = document.activeElement?.closest('.tile')?.dataset.id;
    if (id) api.moveTile(id, event.key === ']' ? 1 : -1);
    return;
  }
  if (api.editing() && event.key === 'Delete') {
    const id = document.activeElement?.closest('.tile')?.dataset.id;
    if (id) api.removeTile(id);
    return;
  }
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(event.key)) return;
  event.preventDefault();
  collect();
  if (!rows.length) return;
  if (!rows.some(row => row.includes(document.activeElement))) { place(0, 0); return; }
  if (event.key === 'ArrowRight') place(cursor.r, cursor.c + 1);
  else if (event.key === 'ArrowLeft') place(cursor.r, cursor.c - 1);
  else if (event.key === 'ArrowDown') moveVertical(1);
  else if (event.key === 'ArrowUp') moveVertical(-1);
  else if (event.key === 'Enter') activate(document.activeElement);
}

function command(name) {
  if (name === 'up') moveVertical(-1);
  else if (name === 'down') moveVertical(1);
  else if (name === 'left') place(cursor.r, cursor.c - 1);
  else if (name === 'right') place(cursor.r, cursor.c + 1);
  else if (name === 'go') activate(document.activeElement?.matches('[data-item]') ? document.activeElement : rows[cursor.r]?.[cursor.c]);
  else if (name === 'back') api.closeOverlay() || api.togglePalette(false);
}

function pollPads() {
  const pads = navigator.getGamepads?.() || [];
  const pad = [...pads].find(item => item && item.connected);
  if (!pad) { polling = false; return; }
  const map = [[12, 'up'], [13, 'down'], [14, 'left'], [15, 'right'], [0, 'go'], [1, 'back']];
  for (const [index, name] of map) {
    const down = !!pad.buttons[index]?.pressed;
    if (down && !held.buttons[index]) command(name);
    held.buttons[index] = down;
  }
  const ax = pad.axes[0] || 0;
  const ay = pad.axes[1] || 0;
  let axis = '';
  if (ax < -0.6) axis = 'left';
  else if (ax > 0.6) axis = 'right';
  else if (ay < -0.6) axis = 'up';
  else if (ay > 0.6) axis = 'down';
  if (axis && axis !== held.axis) command(axis);
  held.axis = axis;
  requestAnimationFrame(pollPads);
}

export function focusFirst() {
  place(0, 0);
}

export function bindInput(methods) {
  api = methods;
  document.addEventListener('keydown', onKey);
  function startPads() {
  document.querySelector('#padState').textContent = 'Controller connected';
  if (polling) return;
  polling = true;
  requestAnimationFrame(pollPads);
}
window.addEventListener('gamepadconnected', startPads);
if ([...(navigator.getGamepads?.() || [])].some(pad => pad)) startPads();
}

export function voiceSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function listenOnce(onText, onState) {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) { onState('Voice isn’t available in this browser.'); return; }
  const rec = new Ctor();
  rec.lang = 'en-NZ';
  rec.interimResults = false;
  rec.onstart = () => onState('Listening…');
  rec.onerror = () => onState('Voice didn’t catch that.');
  rec.onend = () => onState('');
  rec.onresult = event => {
    const text = event.results[0][0].transcript;
    onState(`“${text}”`);
    onText(text);
  };
  try { rec.start(); } catch { onState('Voice didn’t start.'); }
}
