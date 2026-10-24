import { CATALOG, ROWS } from './catalog.js';
import { esc, load, save } from './store.js';

function blank() {
  return { order: CATALOG.map(t => t.id), hidden: [], custom: [] };
}

export function tileState() {
  const saved = load('tiles', null);
  const state = saved && Array.isArray(saved.order) ? saved : blank();
  state.hidden = Array.isArray(state.hidden) ? state.hidden : [];
  state.custom = Array.isArray(state.custom) ? state.custom : [];
  const known = new Set([...CATALOG.map(t => t.id), ...state.custom.map(t => t.id)]);
  state.order = state.order.filter(id => known.has(id));
  for (const tile of CATALOG) if (!state.order.includes(tile.id)) state.order.push(tile.id);
  for (const tile of state.custom) if (!state.order.includes(tile.id)) state.order.push(tile.id);
  return state;
}

function persist(state) {
  save('tiles', state);
}

function library(state) {
  const map = new Map(CATALOG.map(t => [t.id, t]));
  for (const tile of state.custom) map.set(tile.id, tile);
  return map;
}

export function visibleTiles() {
  const state = tileState();
  const map = library(state);
  const hidden = new Set(state.hidden);
  return state.order.map(id => map.get(id)).filter(tile => tile && !hidden.has(tile.id));
}

export function findTile(name) {
  const q = name.trim().toLowerCase();
  return visibleTiles().find(tile => tile.name.toLowerCase() === q)
    || visibleTiles().find(tile => tile.name.toLowerCase().includes(q));
}

function letter(name) {
  return (name || '?').slice(0, 1).toUpperCase();
}

function tileHtml(tile, editing) {
  const pad = tile.pad === 'wide' ? ' wide' : '';
  const tools = editing
    ? `<button type="button" class="tile-x" data-remove="${esc(tile.id)}" aria-label="Remove ${esc(tile.name)}">Remove</button>`
    : '';
  return `<div class="tile${editing ? ' editing' : ''}" data-id="${esc(tile.id)}" ${editing ? 'draggable="true"' : ''}>
    <a class="face${pad}" data-item href="${esc(tile.url)}" target="_blank" rel="noopener noreferrer" style="--tile:${esc(tile.bg || '#222')}" aria-label="${esc(tile.name)}">
      <img alt="" src="${esc(tile.icon || '')}" draggable="false">
      <b class="fallback" hidden>${esc(letter(tile.name))}</b>
    </a>
    <span class="tile-name">${esc(tile.name)}</span>
    ${tools}
  </div>`;
}

export function renderTiles(root, editing) {
  const tiles = visibleTiles();
  root.innerHTML = ROWS.map(row => {
    const items = tiles.filter(tile => (tile.row || 'yours') === row.id);
    const add = row.id === 'yours'
      ? `<form class="add-tile" id="addTile">
          <input name="name" required maxlength="32" placeholder="Name" aria-label="App name">
          <input name="url" required type="url" placeholder="https://" aria-label="App address">
          <button type="submit" data-item>Add</button>
        </form>`
      : '';
    return `<section class="band">
      <div class="band-head">
        <h2>${row.title}</h2>
        ${row.id === 'watch' ? `<button type="button" id="arrangeBtn" data-item>${editing ? 'Done' : 'Arrange'}</button>` : ''}
      </div>
      <div class="scroller" data-row>${items.map(tile => tileHtml(tile, editing)).join('')}${add}</div>
    </section>`;
  }).join('');
  root.querySelectorAll('.face img').forEach(img => {
    img.addEventListener('error', () => {
      img.hidden = true;
      const mark = img.parentElement.querySelector('.fallback');
      if (mark) mark.hidden = false;
    });
    if (!img.getAttribute('src')) img.dispatchEvent(new Event('error'));
  });
}

export function addCustom(name, url) {
  const state = tileState();
  const id = 'c' + Date.now().toString(36);
  let host = url;
  try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { /* keep raw */ }
  state.custom.push({
    id,
    name: name.trim(),
    url,
    icon: '',
    bg: '#243044',
    row: 'yours',
    host
  });
  state.order.push(id);
  persist(state);
}

export function removeTile(id) {
  const state = tileState();
  if (state.custom.some(tile => tile.id === id)) {
    state.custom = state.custom.filter(tile => tile.id !== id);
    state.order = state.order.filter(item => item !== id);
  } else if (!state.hidden.includes(id)) state.hidden.push(id);
  persist(state);
}

export function moveTile(id, dir) {
  const state = tileState();
  const visible = state.order.filter(item => !state.hidden.includes(item));
  const index = visible.indexOf(id);
  const next = index + dir;
  if (index < 0 || next < 0 || next >= visible.length) return;
  const from = state.order.indexOf(visible[index]);
  const to = state.order.indexOf(visible[next]);
  const [item] = state.order.splice(from, 1);
  state.order.splice(to, 0, item);
  persist(state);
}

export function moveTileBefore(id, beforeId) {
  if (id === beforeId) return;
  const state = tileState();
  state.order = state.order.filter(item => item !== id);
  const index = state.order.indexOf(beforeId);
  if (index < 0) state.order.push(id);
  else state.order.splice(index, 0, id);
  persist(state);
}

export function resetTiles() {
  save('tiles', blank());
}

export function safeHttp(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch {
    return '';
  }
}
