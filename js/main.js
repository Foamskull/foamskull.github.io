import { ACCENTS, ambientName, greeting, timeOfDay } from './catalog.js';
import { bus } from './bus.js';
import { mountHero } from './hero.js';
import { bindInput, focusFirst, listenOnce, voiceSupported } from './input.js';
import { bindMedia, playMusic, renderList } from './media.js';
import { openSearch } from './search.js';
import {
  addCustom, findTile, moveTile, moveTileBefore, removeTile, renderTiles, resetTiles, safeHttp, visibleTiles
} from './tiles.js';
import { esc } from './store.js';
import {
  events, links, lookupPlace, notes, renderWidgets, setEvents, setLinks, setNotes, setTodos,
  settings, todos, upcoming, writeSettings
} from './widgets.js';

const params = new URLSearchParams(location.search);
let editing = false;
let hero;
let paletteIndex = 0;

function motionOn() {
  return bus.motion > 0;
}

function applySettings() {
  const cfg = settings();
  const reduce = cfg.motion === 'reduce' || (cfg.motion === 'system' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  bus.motion = reduce ? 0 : 1;
  document.documentElement.dataset.motion = reduce ? 'reduce' : 'full';
  document.documentElement.style.setProperty('--intensity', String(cfg.intensity));
  if (reduce) {
    document.documentElement.style.setProperty('--tx', '0');
    document.documentElement.style.setProperty('--ty', '0');
  }
  hero?.kick?.();
  document.querySelectorAll('[data-engine]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.engine === cfg.engine));
  });
  const form = document.querySelector('#settingsForm');
  if (form) {
    form.place.value = cfg.place;
    form.intensity.value = cfg.intensity;
    form.motion.value = cfg.motion;
    form.engine.value = cfg.engine;
    form.weather.checked = cfg.widgets.weather;
    form.radar.checked = cfg.widgets.radar;
    form.crypto.checked = cfg.widgets.crypto;
    form.news.checked = cfg.widgets.news;
  }
}

let paintedTod = '';

function paintClock() {
  const now = new Date();
  const tod = timeOfDay(now);
  if (tod !== paintedTod) {
    paintedTod = tod;
    document.documentElement.dataset.tod = tod;
    bus.accent = ACCENTS[tod];
    hero?.setAccent?.(bus.accent);
    document.querySelector('#kicker').textContent = greeting(tod);
    const ambient = document.querySelector('#ambientLabel');
    if (ambient) ambient.textContent = ambientName(tod);
  }
  document.querySelector('#clock').textContent = now.toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  document.querySelector('#dateLine').textContent = now.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' });
}

function paintTiles() {
  renderTiles(document.querySelector('#rows'), editing);
  document.querySelector('#arrangeBtn')?.addEventListener('click', () => {
    editing = !editing;
    paintTiles();
    focusFirst();
  });
  document.querySelector('#addTile')?.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const url = safeHttp(String(data.get('url') || ''));
    const name = String(data.get('name') || '').trim();
    if (!name || !url) return;
    addCustom(name, url);
    paintTiles();
  });
  document.querySelectorAll('[data-remove]').forEach(button => {
    button.addEventListener('click', () => {
      removeTile(button.dataset.remove);
      paintTiles();
    });
  });
  let dragId = '';
  document.querySelectorAll('.tile').forEach(tile => {
    tile.addEventListener('dragstart', () => { dragId = tile.dataset.id; tile.classList.add('dragging'); });
    tile.addEventListener('dragend', () => tile.classList.remove('dragging'));
    tile.addEventListener('dragover', event => event.preventDefault());
    tile.addEventListener('drop', event => {
      event.preventDefault();
      const from = dragId;
      dragId = '';
      if (!from || from === tile.dataset.id) return;
      moveTileBefore(from, tile.dataset.id);
      paintTiles();
    });
  });
  document.querySelector('#hint').hidden = !editing;
  window.__home.tiles = visibleTiles().length;
}

function goSearch(engine, query) {
  const url = openSearch(engine, query);
  if (url) window.__home.searchUrl = url;
  return url;
}

function openNamed(name) {
  const text = name.toLowerCase();
  if (text.includes('media') || text.includes('music') || text.includes('player') || text.includes('broadcast')) return openPanel('media');
  if (text.includes('note') || text.includes('task') || text.includes('calendar') || text.includes('agenda') || text.includes('directive') || /\blog\b/.test(text)) return openPanel('personal');
  if (/\bsettings?\b/.test(text) || /\bsystems?\b/.test(text)) return openPanel('settings');
  const tile = findTile(name);
  if (tile) window.open(tile.url, '_blank', 'noopener');
}

function openPanel(name) {
  document.querySelector('#palette').hidden = true;
  document.querySelector('#overlay').hidden = false;
  document.querySelectorAll('#overlay section').forEach(section => { section.hidden = section.id !== `panel-${name}`; });
  window.__home.section = name;
  if (name === 'personal') paintPersonal();
  if (name === 'settings') applySettings();
  const title = { media: 'Broadcast', personal: 'Operations log', settings: 'Systems' }[name];
  document.querySelector('#sheetTitle').textContent = title;
  focusFirst();
}

function closeOverlay() {
  const overlay = document.querySelector('#overlay');
  const palette = document.querySelector('#palette');
  if (!palette.hidden) { palette.hidden = true; return true; }
  if (!overlay.hidden) {
    overlay.hidden = true;
    window.__home.section = 'home';
    return true;
  }
  return false;
}

function paintPersonal() {
  document.querySelector('#notes').value = notes();
  const list = document.querySelector('#todoList');
  const items = todos();
  list.innerHTML = items.length ? items.map(item => `<li class="${item.done ? 'done' : ''}">
    <button type="button" data-toggle="${item.id}" aria-pressed="${item.done}">${item.done ? 'Done' : 'Open'}</button>
    <span>${esc(item.text)}</span>
    <button type="button" data-del="${item.id}" aria-label="Delete task">×</button>
  </li>`).join('') : '<li class="empty">Nothing on the list.</li>';
  const agenda = document.querySelector('#agenda');
  const soon = upcoming();
    agenda.innerHTML = soon.length ? soon.map(item => `<li><time>${esc(item.date)}${item.time ? ' · ' + esc(item.time) : ''}</time><span>${esc(item.title)}</span><button type="button" data-event="${item.id}" aria-label="Delete event">×</button></li>`).join('')
    : '<li class="empty">No upcoming plans.</li>';
  const linkList = document.querySelector('#linkList');
  const saved = links();
    linkList.innerHTML = saved.length ? saved.map(item => `<li><a data-item href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${esc(item.name)}</a><button type="button" data-link="${item.id}" aria-label="Delete ${esc(item.name)}">×</button></li>`).join('')
    : '<li class="empty">No quick links yet.</li>';
}

function commands() {
  const base = [
    { label: 'Open media', run: () => openPanel('media') },
    { label: 'Play music', run: () => { openPanel('media'); playMusic(); } },
    { label: 'Open notes and tasks', run: () => openPanel('personal') },
    { label: 'Open settings', run: () => openPanel('settings') },
    { label: 'Arrange apps', run: () => { editing = true; paintTiles(); closeOverlay(); } },
    { label: 'Refresh widgets', run: () => renderWidgets() }
  ];
  const apps = visibleTiles().map(tile => ({
    label: `Open ${tile.name}`,
    run: () => window.open(tile.url, '_blank', 'noopener')
  }));
  return [...base, ...apps];
}

function paintPalette() {
  const query = document.querySelector('#palQ').value.trim().toLowerCase();
  const list = commands().filter(command => command.label.toLowerCase().includes(query));
  if (query && !list.some(command => command.label.toLowerCase() === `search ${query}`)) {
    list.push({ label: `Search “${document.querySelector('#palQ').value.trim()}”`, run: () => goSearch(settings().engine, document.querySelector('#palQ').value) });
  }
  paletteIndex = Math.max(0, Math.min(paletteIndex, list.length - 1));
  const box = document.querySelector('#palList');
  box.innerHTML = list.map((command, i) => `<button type="button" data-item data-i="${i}" class="${i === paletteIndex ? 'on' : ''}">${esc(command.label)}</button>`).join('')
    || '<p class="meta">No matching commands.</p>';
  box.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    list[Number(button.dataset.i)].run();
    document.querySelector('#palette').hidden = true;
  }));
  window.__palette = list;
}

function togglePalette(force) {
  const palette = document.querySelector('#palette');
  const open = typeof force === 'boolean' ? force : palette.hidden;
  palette.hidden = !open;
  if (open) {
    document.querySelector('#overlay').hidden = true;
    paletteIndex = 0;
    document.querySelector('#palQ').value = '';
    paintPalette();
    document.querySelector('#palQ').focus();
  }
}

function paletteKey(event) {
  const list = window.__palette || [];
  if (event.key === 'ArrowDown') { event.preventDefault(); paletteIndex = Math.min(list.length - 1, paletteIndex + 1); paintPalette(); }
  else if (event.key === 'ArrowUp') { event.preventDefault(); paletteIndex = Math.max(0, paletteIndex - 1); paintPalette(); }
  else if (event.key === 'Enter') { event.preventDefault(); list[paletteIndex]?.run(); document.querySelector('#palette').hidden = true; }
  else if (event.key === 'Escape') { event.preventDefault(); togglePalette(false); }
}

function bindPersonal() {
  document.querySelector('#notes').addEventListener('input', event => setNotes(event.target.value));
  document.querySelector('#todoForm').addEventListener('submit', event => {
    event.preventDefault();
    const input = document.querySelector('#todoText');
    const text = input.value.trim();
    if (!text) return;
    setTodos([{ id: Date.now(), text, done: false }, ...todos()].slice(0, 100));
    input.value = '';
    paintPersonal();
  });
  document.querySelector('#todoList').addEventListener('click', event => {
    const toggle = event.target.closest('[data-toggle]');
    const del = event.target.closest('[data-del]');
    if (toggle) setTodos(todos().map(item => item.id === Number(toggle.dataset.toggle) ? { ...item, done: !item.done } : item));
    if (del) setTodos(todos().filter(item => item.id !== Number(del.dataset.del)));
    if (toggle || del) paintPersonal();
  });
  document.querySelector('#eventForm').addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get('title') || '').trim();
    const date = String(data.get('date') || '');
    if (!title || !date) return;
    setEvents([...events(), { id: Date.now(), title, date, time: String(data.get('time') || '') }].slice(-100));
    event.currentTarget.reset();
    paintPersonal();
  });
  document.querySelector('#agenda').addEventListener('click', event => {
    const button = event.target.closest('[data-event]');
    if (!button) return;
    setEvents(events().filter(item => item.id !== Number(button.dataset.event)));
    paintPersonal();
  });
  document.querySelector('#linkForm').addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const url = safeHttp(String(data.get('url') || ''));
    const name = String(data.get('name') || '').trim();
    if (!name || !url) return;
    setLinks([...links(), { id: Date.now(), name, url }].slice(-50));
    event.currentTarget.reset();
    paintPersonal();
  });
  document.querySelector('#linkList').addEventListener('click', event => {
    const button = event.target.closest('[data-link]');
    if (!button) return;
    setLinks(links().filter(item => item.id !== Number(button.dataset.link)));
    paintPersonal();
  });
  document.querySelectorAll('.tabs button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tabs button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      document.querySelectorAll('[data-tab]').forEach(panel => { panel.hidden = panel.dataset.tab !== button.dataset.show; });
    });
  });
}

function bindSettings() {
  const form = document.querySelector('#settingsForm');
  form.addEventListener('submit', event => event.preventDefault());
  form.intensity.addEventListener('input', () => {
    const cfg = settings();
    cfg.intensity = Number(form.intensity.value);
    writeSettings(cfg);
    applySettings();
  });
  form.motion.addEventListener('change', () => {
    const cfg = settings();
    cfg.motion = form.motion.value;
    writeSettings(cfg);
    applySettings();
  });
  form.engine.addEventListener('change', () => {
    const cfg = settings();
    cfg.engine = form.engine.value;
    writeSettings(cfg);
    applySettings();
  });
  ['weather', 'radar', 'crypto', 'news'].forEach(name => {
    form[name].addEventListener('change', () => {
      const cfg = settings();
      cfg.widgets[name] = form[name].checked;
      writeSettings(cfg);
      renderWidgets();
    });
  });
  document.querySelector('#placeBtn').addEventListener('click', async () => {
    const status = document.querySelector('#placeStatus');
    status.textContent = 'Looking up…';
    const hit = await lookupPlace(form.place.value.trim());
    if (!hit) { status.textContent = 'No matching place.'; return; }
    const cfg = settings();
    Object.assign(cfg, hit);
    writeSettings(cfg);
    status.textContent = `${hit.place} saved.`;
    renderWidgets();
  });
  document.querySelector('#resetTiles').addEventListener('click', () => {
    resetTiles();
    editing = false;
    paintTiles();
  });
}

function bindChrome() {
  document.querySelector('#searchForm').addEventListener('submit', event => {
    event.preventDefault();
    goSearch(settings().engine, document.querySelector('#q').value);
  });
  document.querySelectorAll('[data-engine]').forEach(button => {
    button.addEventListener('click', () => {
      const cfg = settings();
      cfg.engine = button.dataset.engine;
      writeSettings(cfg);
      applySettings();
    });
  });
  document.querySelector('#openMedia').addEventListener('click', () => openPanel('media'));
  document.querySelector('#openPersonal').addEventListener('click', () => openPanel('personal'));
  document.querySelector('#settingsBtn').addEventListener('click', () => openPanel('settings'));
  document.querySelector('#sheetClose').addEventListener('click', closeOverlay);
  document.querySelector('#overlay').addEventListener('click', event => { if (event.target.id === 'overlay') closeOverlay(); });
  document.querySelector('#paletteBtn').addEventListener('click', () => togglePalette());
  document.querySelector('#palQ').addEventListener('input', () => { paletteIndex = 0; paintPalette(); });
  const voice = document.querySelector('#voiceBtn');
  const voiceStatus = document.querySelector('#voiceStatus');
  if (!voiceSupported()) {
    voice.disabled = true;
    voice.title = 'Voice isn’t available in this browser.';
  }
  voice.addEventListener('click', () => listenOnce(text => {
    const value = text.toLowerCase();
    const search = value.match(/^(?:search|find|look up)\s+(.+)/);
    const open = value.match(/^open\s+(.+)/);
    if (search) goSearch(settings().engine, search[1]);
    else if (open) openNamed(open[1]);
    else if (value.includes('play')) { openPanel('media'); playMusic(); }
    else openNamed(value);
  }, message => { voiceStatus.textContent = message; }));
  document.querySelector('#dockOpen').addEventListener('click', () => openPanel('media'));
}

window.__home = { section: 'home', tiles: 0, searchUrl: null };

applySettings();
paintClock();
setInterval(paintClock, 1000);
paintTiles();
bindMedia();
bindPersonal();
bindSettings();
bindChrome();
renderList();
renderWidgets();
setInterval(() => { if (!document.hidden) renderWidgets(); }, 10 * 60 * 1000);
bindInput({
  motion: motionOn,
  editing: () => editing,
  moveTile: (id, dir) => { moveTile(id, dir); paintTiles(); },
  removeTile: id => { removeTile(id); paintTiles(); },
  togglePalette,
  paletteKey,
  closeOverlay
});

window.addEventListener('pointermove', event => {
  if (!bus.motion || event.pointerType !== 'mouse') return;
  const x = event.clientX / innerWidth - 0.5;
  const y = event.clientY / innerHeight - 0.5;
  bus.lookX = x;
  bus.lookY = y;
  document.documentElement.style.setProperty('--tx', x.toFixed(3));
  document.documentElement.style.setProperty('--ty', y.toFixed(3));
}, { passive: true });

const boot = document.querySelector('#boot');
if (params.has('noboot') || !motionOn()) boot.remove();
else {
  const finish = () => {
    if (!boot.isConnected) return;
    boot.classList.add('out');
    setTimeout(() => boot.remove(), 560);
  };
  boot.hidden = false;
  setTimeout(finish, 1500);
  boot.addEventListener('click', finish);
  document.addEventListener('keydown', finish, { once: true });
}

mountHero(document.querySelector('#hero')).then(handle => { hero = handle; hero?.setAccent?.(bus.accent); });
matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', applySettings);
