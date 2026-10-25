import { APPS, CATS, appByName, appsOf, catName, icon } from './catalog.js';
import { forecastGlyph, live, refreshLive, skyGlyph, subscribe } from './live.js';
import { loadTrailers, trailerDate, trailerEmbed, trailerThumb, trailerWatch } from './movies.js';
import { bindParallax, setArt } from './scene.js';
import { searchUrl } from './search.js';
import { esc, load, save } from './store.js';

const HUE = {
  now: '#ffb347', watch: '#ff4d6d', movies: '#ff6a2c', listen: '#2ee88f', play: '#b56bff',
  money: '#2ee6c8', info: '#4fb8ff', notes: '#ff9a3c', search: '#7af0ff'
};
const FILM = '<svg class="k-ic" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4M3 12h4M3 16h4M17 8h4M17 12h4M17 16h4"/></svg>';
const TABS = [{ id: 'now', name: 'Now' }, CATS[0], { id: 'movies', name: 'Movies', mark: FILM }, ...CATS.slice(1)];
const SHOWS = [
  { title: 'Midnight Drive', ep: 'S2 · E4', service: 'Netflix', progress: 0.62, color: '#e5484d', url: 'https://www.netflix.com', left: '38 minutes left', meta: ['S2 · E4', '38 min left', 'HD · 5.1'], blurb: 'Season 2, episode 4 · 38 minutes left on Netflix. Your Sunday binge is waiting.' },
  { title: 'The Bay', ep: 'S1 · E7', service: 'TVNZ+', progress: 0.3, color: '#3b82f6', url: 'https://www.tvnz.co.nz' },
  { title: 'Bluey', ep: 'S3 · E12', service: 'Disney+', progress: 0.85, color: '#22c1c3', url: 'https://www.disneyplus.com' }
];
const TRACK = { title: 'Midnight Drive', artist: 'Night Arcade', at: '1:42', dur: '4:31', progress: 0.38, url: 'https://open.spotify.com', source: 'Spotify' };
const LIVE = [
  { title: 'Night Arcade speedrun', sub: 'Twitch · 2.4k watching', live: true, url: 'https://www.twitch.tv' },
  { title: 'Steam Autumn Sale', sub: 'Ends in 3 days', url: 'https://store.steampowered.com' },
  { title: 'Co-op night with Sam', sub: 'Fri 8:00 pm', url: 'https://store.steampowered.com' }
];
const SAMPLE_NOTE = 'Ask about the router';
const SAMPLE_NOTE2 = 'Movie list: Dune 3, The Bay finale';
const SAMPLE_TASKS = [
  { id: 's0', text: 'Groceries', done: false },
  { id: 's1', text: 'Pay power', done: true },
  { id: 's2', text: 'Book WOF', done: false }
];
const SAMPLE_AGENDA = [
  { id: 'a0', title: 'Brunch with Mum', when: 'Sun 10:00', time: '10:00' },
  { id: 'a1', title: 'Futsal', when: 'Mon 18:30', time: '18:30' }
];
const DESC = {
  YouTube: ['Video', 'Films, music, live streams and the channels you follow.'],
  Netflix: ['Films and series', 'Open Netflix and pick up a show.'],
  'Disney+': ['Disney, Marvel and more', 'Films, series and originals.'],
  Neon: ['Series and films', 'New Zealand streaming, including HBO shows.'],
  'TVNZ+': ['Local and free', 'News, sport and series from TVNZ.'],
  ThreeNow: ['Free to watch', 'Shows and live channels from Three.'],
  'Sky Go': ['Sport and channels', 'Live sport and Sky channels.'],
  Spotify: ['Music', 'Playlists, albums and podcasts.'],
  Twitch: ['Live streams', 'Games, music and live channels.'],
  Steam: ['Games', 'Your library, friends and the store.'],
  Westpac: ['Everyday banking', 'Balances, payments and cards.'],
  ASB: ['Banking', 'Accounts, payments and cards.'],
  ANZ: ['Accounts', 'Transfers, cards and statements.'],
  Yahoo: ['Mail and news', 'Inbox, finance and headlines.'],
  Spark: ['Mobile and broadband', 'Account, bills and broadband.']
};

const rail = document.querySelector('#rail');
const hero = document.querySelector('#hero');
const wid = document.querySelector('#wid');
const tabs = document.querySelector('#tabs');
const pill = document.querySelector('#pill');
let cur = 'now';
let fi = 0;
let list = [];
let moved = false;
let engine = load('settings', {}).engine || 'google';
let swT = 0;
let started = false;
let trailers = [];
let trailerSound = false;
let trailerId = '';
let playT = 0;

const forcedTod = new URLSearchParams(location.search).get('tod');
function todOf(date = new Date()) {
  if (forcedTod === 'morning' || forcedTod === 'afternoon' || forcedTod === 'evening' || forcedTod === 'night') return forcedTod;
  const h = date.getHours();
  if (h < 5 || h >= 21) return 'night';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
let tod = todOf();

function setHue() {
  document.documentElement.style.setProperty('--h', 'rgb(255, 6, 14)');
}
function mobile() {
  return matchMedia('(max-width: 1024px)').matches;
}
function titleClass(title) {
  if (title.length > 42) return 'ttl xs';
  if (title.length > 24) return 'ttl sm';
  return 'ttl';
}
function savedTasks() { return load('todos', []).filter(item => item && item.text); }
function savedEvents() {
  const today = new Date().toISOString().slice(0, 10);
  return load('events', [])
    .filter(item => item && item.title && item.date && item.date >= today)
    .sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`));
}
function savedNote() { return String(load('notes', '') || ''); }
function playlist() {
  return load('playlist', []).filter(item => item && item.url && item.name);
}
function whenLabel(event) {
  const date = new Date(`${event.date}T12:00:00`);
  const day = date.toLocaleDateString('en-NZ', { weekday: 'short' });
  return `${day} ${event.time ? event.time.slice(0, 5) : ''}`.trim();
}
function tasksNow() {
  const saved = savedTasks();
  return saved.length ? { sample: false, items: saved } : { sample: true, items: SAMPLE_TASKS };
}
function agendaNow() {
  const saved = savedEvents();
  if (!saved.length) return { sample: true, items: SAMPLE_AGENDA };
  return {
    sample: false,
    items: saved.map(item => ({ ...item, when: whenLabel(item), time: (item.time || '').slice(0, 5) || item.date.slice(5) }))
  };
}
function noteNow() {
  const text = savedNote();
  return text ? { sample: false, text, extra: '' } : { sample: true, text: SAMPLE_NOTE, extra: SAMPLE_NOTE2 };
}
function trackNow() {
  const item = playlist()[0];
  if (!item) return { ...TRACK, sample: true };
  return { title: item.name, artist: item.kind === 'youtube' ? 'YouTube' : 'Queue', at: '', dur: '', progress: 0, url: item.url, source: 'Queue', sample: false };
}

function mini(spec) {
  return { type: 'mini', ...spec };
}
function appTile(app) {
  const copy = DESC[app.name] || [catName(app.cat), 'Opens in a new tab.'];
  return {
    type: 'app', app, cat: app.cat, kick: copy[0], title: app.name, desc: copy[1],
    meta: [catName(app.cat), 'Opens in a new tab'], url: app.url, action: `Open ${app.name}`
  };
}
function contMini() {
  const show = SHOWS[0];
  return mini({
    cat: 'watch', kick: 'Continue watching', title: show.title, desc: show.blurb,
    inner: `<em>Netflix · ${esc(show.ep)}</em><b style="font-size:30px">${esc(show.title)}</b><div class="pg"><u style="width:${show.progress * 100}%"></u></div>`,
    bg: 'linear-gradient(160deg,#e11d48,#4c0519)', meta: show.meta, href: show.url, action: 'Resume'
  });
}
function weatherMini() {
  const w = live.weather;
  if (!w || w.offline) {
    const place = w?.place || live.place;
    return mini({
      cat: 'info', kick: `Weather · ${place}`, title: w?.offline ? 'Offline' : place,
      desc: w?.offline ? 'The forecast did not load. The shelf still opens Yahoo and Spark.' : 'Checking the forecast.',
      inner: `<em>${esc(place)}</em><b>—</b><p>${w?.offline ? 'Forecast offline' : 'Checking…'}</p>`,
      bg: 'linear-gradient(160deg,#1d4ed8,#7dd3fc)', meta: [place], tab: 'info', action: 'Forecast'
    });
  }
  return mini({
    cat: 'info', kick: `Weather · ${w.place}`, title: `${w.t}° and ${w.desc.toLowerCase()}`,
    desc: `High of ${w.hi}°, low of ${w.lo}°. Wind ${w.wind} km/h.`,
    inner: `<em>${esc(w.place)}</em><b>${w.t}°</b><p>${esc(w.desc)} · H${w.hi} L${w.lo}</p>`,
    bg: 'linear-gradient(160deg,#1d4ed8,#7dd3fc)',
    meta: [`H ${w.hi}°`, `L ${w.lo}°`, `Wind ${w.wind} km/h`], tab: 'info', action: 'Forecast'
  });
}
function newsMini() {
  const news = Array.isArray(live.news) ? live.news : null;
  if (!news) {
    const offline = live.news?.offline;
    return mini({
      cat: 'info', kick: 'Headlines', title: offline ? 'Offline' : 'Headlines',
      desc: offline ? 'Headlines did not load just now.' : 'Fetching today’s stories.',
      inner: `<em>Headlines</em><p style="font-size:16px">${offline ? 'Feed offline' : 'Fetching stories…'}</p>`,
      bg: 'linear-gradient(160deg,#1e3a8a,#38bdf8)', meta: ['Today'], tab: 'info', action: 'Today'
    });
  }
  const lead = news[0];
  const short = lead.title.length > 72 ? `${lead.title.slice(0, 70)}…` : lead.title;
  return mini({
    cat: 'info', kick: 'Headlines', title: short, desc: news.slice(1, 3).map(item => item.title).join(' ') || lead.title,
    inner: `<em>Headlines · ${news.length}</em><p style="font-size:15px">${esc(short)}</p><p style="opacity:.8">+${Math.max(news.length - 1, 0)} more</p>`,
    bg: 'linear-gradient(160deg,#1e3a8a,#38bdf8)', meta: ['Today', `${news.length} stories`], href: lead.href, action: 'Read'
  });
}
function playMini() {
  const track = trackNow();
  return mini({
    cat: 'listen', kick: 'Now playing', title: track.title,
    desc: track.sample ? `${track.artist} · ${track.at} of ${track.dur}. Open Spotify to play it.` : `${track.artist}. Open the queued link.`,
    inner: `<em>${esc(track.source)}</em><b style="font-size:28px">${esc(track.title)}</b><p>${esc(track.artist)}${track.at ? ` · ${esc(track.at)}` : ''}</p>`,
    bg: 'linear-gradient(160deg,#15803d,#052e16)',
    meta: track.sample ? ['Spotify', `${track.at} / ${track.dur}`] : [track.source],
    href: track.url, action: track.sample ? 'Spotify' : 'Open'
  });
}
function marketMini() {
  const rows = Array.isArray(live.crypto) ? live.crypto : null;
  const btc = rows?.[0];
  if (!btc || btc.change == null) {
    return mini({
      cat: 'money', kick: 'Markets · NZD', title: live.crypto?.offline ? 'Offline' : 'Markets',
      desc: live.crypto?.offline ? 'Prices did not load just now.' : 'Fetching Bitcoin, Ethereum and Solana.',
      inner: `<em>Markets</em><b style="font-size:30px">NZD</b><p>${live.crypto?.offline ? 'Prices offline' : 'Fetching…'}</p>`,
      bg: 'linear-gradient(160deg,#0f766e,#042f2e)', meta: ['NZD'], href: 'https://www.coingecko.com', action: 'Markets'
    });
  }
  const sign = btc.change >= 0 ? '+' : '';
  return mini({
    cat: 'money', kick: 'Markets · NZD', title: `BTC ${btc.price}`,
    desc: rows.map(row => `${row.sym} ${row.change >= 0 ? '+' : ''}${row.change.toFixed(1)}%`).join(' · '),
    inner: `<em>Markets</em><b style="font-size:30px">${sign}${btc.change.toFixed(1)}%</b><p>BTC ${esc(btc.price)}</p>`,
    bg: 'linear-gradient(160deg,#0f766e,#042f2e)',
    meta: rows.map(row => `${row.sym} ${row.change >= 0 ? '+' : ''}${row.change.toFixed(1)}%`),
    href: 'https://www.coingecko.com', action: 'Markets'
  });
}
function noteMini() {
  const note = noteNow();
  return mini({
    cat: 'notes', kick: 'Pinned note', title: note.text,
    desc: note.extra || 'Saved on this browser.',
    inner: `<em>Note</em><p style="font:800 22px/1.15 'Bricolage Grotesque',sans-serif">“${esc(note.text)}”</p>`,
    bg: 'linear-gradient(160deg,#ea580c,#7c2d12)', meta: [note.sample ? 'Pinned' : 'Saved'], tab: 'notes', action: 'Notes'
  });
}
function taskMini() {
  const pack = tasksNow();
  const open = pack.items.filter(item => !item.done);
  const done = pack.items.length - open.length;
  return mini({
    cat: 'notes', kick: 'Tasks', title: `${done} of ${pack.items.length} done`,
    desc: open.map(item => item.text).join(' · ') || 'Everything is ticked off.',
    inner: `<em>Tasks</em><b>${done}/${pack.items.length}</b><p>${esc(open.map(item => item.text).slice(0, 2).join(' · ') || 'All done')}</p>`,
    bg: 'linear-gradient(160deg,#f59e0b,#9a3412)', meta: [`${pack.items.length} tasks`], tab: 'notes', action: 'Tasks'
  });
}
function agendaMini() {
  const pack = agendaNow();
  const next = pack.items[0];
  return mini({
    cat: 'notes', kick: 'Agenda', title: next.title,
    desc: pack.items.map(item => `${item.when} ${item.title}`).join('. '),
    inner: `<em>Agenda</em><b style="font-size:30px">${esc(next.time || next.when)}</b><p>${esc(next.title)}</p>`,
    bg: 'linear-gradient(160deg,#fb7185,#7f1d1d)',
    meta: pack.items.map(item => item.when), tab: 'notes', action: 'Agenda'
  });
}
function liveMini() {
  return mini({
    cat: 'play', kick: 'Live on Twitch', title: LIVE[0].title,
    desc: `${LIVE[0].sub}. ${LIVE[1].title} ${LIVE[1].sub.toLowerCase()}.`,
    inner: `<em><i class="k-dot"></i>Live</em><b style="font-size:28px">Speedrun</b><p>2.4k watching</p>`,
    bg: 'linear-gradient(160deg,#7c3aed,#2e1065)', meta: ['Live', '2.4k'], href: LIVE[0].url, action: 'Twitch'
  });
}

function shelves() {
  const day = new Date().toLocaleDateString('en-NZ', { weekday: 'long' });
  return {
    now: { t: 'Right now', s: `Picked for a ${day} ${tod}`, items: [contMini(), appTile(appByName('Spotify')), weatherMini(), appTile(appByName('YouTube')), agendaMini(), appTile(appByName('Steam')), newsMini(), appTile(appByName('Disney+'))] },
    watch: { t: 'Watch', s: `${appsOf('watch').length} apps`, items: [contMini(), ...appsOf('watch').map(appTile)] },
    movies: {
      t: 'Movies',
      s: trailers.length ? `${trailers.length} new trailers` : 'Trailers will be back',
      items: trailers.map(trailer => ({
        type: 'trailer',
        cat: 'movies',
        id: trailer.id,
        title: trailer.name,
        name: trailer.name,
        channel: trailer.channel,
        when: trailerDate(trailer.published),
        kick: 'Trailer'
      }))
    },
    listen: { t: 'Listen', s: '1 app · now playing', items: [playMini(), ...appsOf('listen').map(appTile)] },
    play: { t: 'Play', s: `${appsOf('play').length} apps`, items: [liveMini(), ...appsOf('play').map(appTile)] },
    money: { t: 'Money', s: `${appsOf('money').length} banks · markets`, items: [...appsOf('money').map(appTile), marketMini()] },
    info: { t: 'Today', s: `Weather, news and ${appsOf('info').length} apps`, items: [weatherMini(), newsMini(), ...appsOf('info').map(appTile)] },
    notes: { t: 'Notes', s: 'Notes, tasks and agenda', items: [noteMini(), taskMini(), agendaMini()] },
    search: { t: 'All apps', s: `${APPS.length} apps · type to filter`, items: APPS.map(appTile) }
  };
}

function card(cls, title, tag, body) {
  return `<section class="k-card ${cls}"><h4><span>${esc(title)}</span><em>${esc(tag)}</em></h4>${body}</section>`;
}
function changeHtml(value) {
  if (typeof value !== 'number') return '';
  const down = value < 0;
  return `<em class="${down ? 'k-dn' : 'k-up'}">${down ? '▼' : '▲'}${Math.abs(value).toFixed(1)}%</em>`;
}
function widgets(id) {
  if (id === 'movies') {
    const rows = trailers.slice(0, 6);
    const body = rows.length
      ? rows.map((item, i) => `<button class="k-row k-tr" type="button" data-trailer="${i}"><b>${esc(item.name)}</b><small>${esc(trailerDate(item.published))}</small></button>`).join('')
      : '<p class="k-q2">Trailers will be back after the next refresh.</p>';
    return [card('k-trailers', 'New trailers', rows.length ? `${trailers.length}` : 'soon', body)];
  }
  if (id === 'watch') {
    return [card('k-cont', 'Continue watching', `${SHOWS.length} shows`, SHOWS.map(show => `<a class="k-row k-cw" href="${esc(show.url)}" target="_blank" rel="noopener"><i style="--c:${show.color}"></i><div><b>${esc(show.title)}</b><small>${esc(show.ep)} · ${esc(show.service)}</small><div class="k-bar"><u style="width:${show.progress * 100}%"></u></div></div></a>`).join(''))];
  }
  if (id === 'listen') {
    const track = trackNow();
    const prog = track.progress ? `<div class="k-prog"><span>${esc(track.at)}</span><div class="k-bar"><u style="width:${track.progress * 100}%"></u></div><span>${esc(track.dur)}</span></div>` : '';
    return [card('k-player', 'Now playing', track.source, `<div class="k-pl"><div class="k-vinyl"><i></i></div><div class="k-pt"><b>${esc(track.title)}</b><small>${esc(track.artist)}</small><div class="k-eq">${'<i></i>'.repeat(18)}</div></div></div>${prog}<div class="k-ctl"><a class="k-main" href="${esc(track.url)}" target="_blank" rel="noopener" aria-label="Open">▶</a></div>`)];
  }
  if (id === 'play') {
    return [card('k-live', 'Live & up next', 'Play', LIVE.map(row => `<a class="k-row" href="${esc(row.url)}" target="_blank" rel="noopener"><div><b>${row.live ? '<i class="k-dot"></i>' : ''}${esc(row.title)}</b><small>${esc(row.sub)}</small></div></a>`).join(''))];
  }
  if (id === 'money') {
    const rows = Array.isArray(live.crypto) ? live.crypto : [];
    const body = rows.length
      ? rows.map(row => `<div class="k-row"><b>${esc(row.sym)}</b><span>${esc(row.price)} ${changeHtml(row.change)}</span></div>`).join('')
      : `<p class="k-q2">${live.crypto?.offline ? 'Prices are offline right now.' : 'Fetching NZD prices…'}</p>`;
    return [card('k-crypto', 'Markets', 'NZD', body)];
  }
  if (id === 'info') {
    const w = live.weather;
    const weather = !w ? card('k-wx', 'Weather', live.place, '<p class="k-q2">Checking the forecast…</p>')
      : w.offline ? card('k-wx', 'Weather', w.place, '<p class="k-q2">The forecast is offline right now.</p>')
      : card('k-wx', 'Weather', w.place, `<div class="k-wxm"><div><b class="k-big">${w.t}°</b><small>${esc(w.desc)} · H ${w.hi}° L ${w.lo}° · wind ${w.wind} km/h</small></div></div><div class="k-fc">${w.days.map(day => `<span><small>${esc(day.label)}</small><i>${forecastGlyph(day.code)}</i><b>${day.hi}°</b></span>`).join('')}</div>`);
    const news = Array.isArray(live.news)
      ? card('k-news', 'Headlines', 'Today', live.news.map((item, i) => `<a class="k-row k-nw" href="${esc(item.href)}" target="_blank" rel="noopener"><em>0${i + 1}</em><span>${esc(item.title)}</span></a>`).join(''))
      : card('k-news', 'Headlines', 'Today', `<p class="k-q2">${live.news?.offline ? 'Headlines are offline right now.' : 'Fetching stories…'}</p>`);
    return [weather, news];
  }
  if (id === 'notes') return [noteCard(), taskCard(), agendaCard(true)];
  if (id === 'now') return [agendaCard(false)];
  return [];
}
function noteCard() {
  const note = noteNow();
  if (!note.sample) {
    return card('k-note', 'Notes', 'saved', `<textarea class="note-box" id="noteBox">${esc(note.text)}</textarea><button class="k-add" type="button" id="saveNote">Save note</button>`);
  }
  return card('k-note', 'Notes', 'pinned', `<p class="k-q">“${esc(note.text)}”</p><p class="k-q2">${esc(note.extra)}</p><button class="k-add" type="button" id="newNote">+ New note</button>`);
}
function taskCard() {
  const pack = tasksNow();
  const done = pack.items.filter(item => item.done).length;
  const rows = pack.items.map(item => `<label class="k-row k-tk${item.done ? ' done' : ''}"><input type="checkbox" data-task="${esc(item.id)}"${item.done ? ' checked' : ''}${pack.sample ? ' data-sample="1"' : ''}><i></i><span>${esc(item.text)}</span></label>`).join('');
  return card('k-tasks', 'Tasks', `${done} of ${pack.items.length} done`, `${rows}<form class="add" data-add="task"><input name="text" maxlength="80" placeholder="Add a task" required><button type="submit">Add</button></form>`);
}
function agendaCard(editable) {
  const pack = agendaNow();
  const rows = pack.items.map(item => `<div class="k-row k-ag"><em>${esc(item.when)}</em><span>${esc(item.title)}</span>${editable && !pack.sample ? `<button type="button" data-drop="${esc(item.id)}" aria-label="Remove ${esc(item.title)}">×</button>` : ''}</div>`).join('');
  const form = editable ? `<form class="add" data-add="event"><input type="date" name="date" required><input type="time" name="time"><input name="title" maxlength="80" placeholder="Add a plan" required><button type="submit">Add</button></form>` : '';
  return card('k-agenda', 'Agenda', 'this week', rows + form);
}

function placePill() {
  const on = tabs.querySelector('.tab.on');
  if (!on) return;
  pill.style.left = `${on.offsetLeft}px`;
  pill.style.width = `${on.offsetWidth}px`;
  const edge = on.offsetLeft - tabs.scrollLeft;
  if (edge < 8 || edge + on.offsetWidth > tabs.clientWidth - 8) {
    tabs.scrollTo({ left: Math.max(0, on.offsetLeft - 12), behavior: 'auto' });
  }
}
function renderShelf() {
  const shelf = shelves()[cur];
  list = shelf.items;
  document.querySelector('#sht').textContent = shelf.t;
  document.querySelector('#shs').textContent = shelf.s;
  rail.className = `rail${cur === 'search' ? ' sm' : ''}`;
  rail.style.transform = '';
  rail.innerHTML = list.map((item, i) => {
    const hue = HUE[item.cat];
    if (item.type === 'app') {
      const app = item.app;
      return `<a class="tile${app.wide ? ' wide' : ''}${app.fill ? ' fill' : ''}" style="--i:${i};--h:${hue}" href="${esc(app.url)}" target="_blank" rel="noopener"><span class="tf" style="--b:${app.bg}"><img src="${esc(app.icon)}" alt=""></span><span class="ring"></span><span class="lb">${esc(app.name)}<small>${esc(catName(app.cat))}</small></span></a>`;
    }
    if (item.type === 'trailer') {
      return `<button type="button" class="tile trailer" style="--i:${i};--h:${hue}"><span class="tf"><img src="${esc(trailerThumb(item.id))}" alt=""><span class="tdate">${esc(item.when)}</span></span><span class="ring"></span><span class="lb">${esc(item.name)}<small>${esc(item.when)}</small></span></button>`;
    }
    return `<div class="tile" style="--i:${i};--h:${hue}"><span class="tf" style="background:${item.bg}"><span class="mini">${item.inner}</span></span><span class="ring"></span><span class="lb">${esc(item.kick)}</span></div>`;
  }).join('');
  rail.querySelectorAll('.tile').forEach((node, i) => {
    node.addEventListener('mouseenter', () => focus(i));
    node.addEventListener('click', event => {
      if (cur === 'search') return;
      if (list[i].type === 'trailer') {
        focus(i);
        return;
      }
      if (list[i].type === 'app' && fi !== i) {
        event.preventDefault();
        focus(i);
      } else if (list[i].type !== 'app') focus(i);
    });
    const img = node.querySelector('img');
    img?.addEventListener('error', () => {
      img.replaceWith(Object.assign(document.createElement('b'), { textContent: list[i].title.slice(0, 1) }));
    });
  });
}
function renderWidgets() {
  wid.className = 'wid';
  wid.innerHTML = widgets(cur).join('');
  wireWidgets();
}
function heroHTML(item, greet) {
  const kick = greet ? `Good ${tod}, Mark · ${item.kick}` : item.kick;
  const primary = item.type === 'app' || item.href
    ? `<a class="btn" href="${esc(item.url || item.href)}" target="_blank" rel="noopener">▶ ${esc(item.action || `Open ${item.title}`)}</a>`
    : `<button class="btn" type="button" data-go="${item.tab || item.cat}">▶ ${esc(item.action || 'Open')}</button>`;
  return `<div class="kick"><i></i>${esc(kick)}</div><h1 class="${titleClass(item.title)}">${esc(item.title)}</h1><p class="desc">${esc(item.desc)}</p><div class="meta">${item.meta.map(meta => `<span>${esc(meta)}</span>`).join('')}</div><div class="cta">${primary}<button class="btn g" type="button" data-go="${item.cat}">+ More</button></div>`;
}
function wireHero() {
  hero.querySelectorAll('[data-go]').forEach(button => {
    button.addEventListener('click', () => {
      const next = button.dataset.go;
      if (TABS.some(tab => tab.id === next) && next !== cur) show(next);
    });
  });
}
function heroSearch() {
  const engines = [['google', 'Google', 'https://www.google.com/search?q='], ['youtube', 'YouTube', 'https://www.youtube.com/results?search_query='], ['ddg', 'DuckDuckGo', 'https://duckduckgo.com/?q=']];
  hero.innerHTML = `<div class="kick"><i></i>Search everything</div><h1 class="ttl">Find it.</h1><form class="k-search" data-e="${esc(engine)}"><div class="k-sb">${icon('search', 26)}<input name="q" placeholder="Search the web or your apps" autocomplete="off"><button type="submit">Go</button></div><div class="k-eng">${engines.map(([id, label]) => `<span data-engine="${id}" class="${id === engine ? 'on' : ''}">${label}</span>`).join('')}</div></form>`;
  const form = hero.querySelector('form');
  const input = form.querySelector('input');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) return;
    const url = searchUrl(engine, query);
    window.open(url, '_blank', 'noopener');
    window.__home.searchUrl = url;
  });
  form.querySelectorAll('[data-engine]').forEach(node => {
    node.addEventListener('click', () => {
      engine = node.dataset.engine;
      const cfg = load('settings', {});
      save('settings', { ...cfg, engine });
      form.querySelectorAll('[data-engine]').forEach(item => item.classList.toggle('on', item === node));
    });
  });
  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    rail.querySelectorAll('.tile').forEach((tile, i) => {
      tile.classList.toggle('hide', !!query && !list[i].title.toLowerCase().includes(query));
    });
  });
  setTimeout(() => input.focus({ preventScroll: true }), 280);
}
function renderTrailerEmpty() {
  hero.innerHTML = '<div class="kick"><i></i>Movies</div><h1 class="ttl sm">Trailers will be back</h1><p class="desc">The latest studio trailers did not load. They show up here again after the daily refresh.</p>';
}
function paintTrailer(item) {
  clearTimeout(swT);
  hero.classList.remove('sw');
  const frame = hero.querySelector('iframe');
  if (frame) {
    const title = hero.querySelector('.ttl');
    title.textContent = item.name;
    title.className = titleClass(item.name);
    hero.querySelector('.desc').textContent = `${item.channel} · trailer posted ${item.when}`;
    const bits = hero.querySelectorAll('.meta span');
    if (bits[0]) bits[0].textContent = item.when;
    if (bits[1]) bits[1].textContent = item.channel;
    const link = hero.querySelector('.yt');
    if (link) link.href = trailerWatch(item.id);
    frame.title = `${item.name} trailer`;
    return;
  }
  hero.innerHTML = `<div class="kick"><i></i>Latest trailer</div><div class="player"><iframe title="${esc(item.name)} trailer" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div><h1 class="${titleClass(item.name)}">${esc(item.name)}</h1><p class="desc">${esc(item.channel)} · trailer posted ${esc(item.when)}</p><div class="meta"><span>${esc(item.when)}</span><span>${esc(item.channel)}</span><span>Trailer</span></div><div class="cta"><button class="btn unmute" type="button" aria-pressed="${trailerSound ? 'true' : 'false'}">${trailerSound ? 'Mute' : 'Unmute'}</button><a class="btn g yt" href="${esc(trailerWatch(item.id))}" target="_blank" rel="noopener">YouTube</a></div>`;
  hero.querySelector('.unmute').addEventListener('click', toggleTrailerSound);
  hero.querySelector('iframe').addEventListener('load', () => {
    const player = hero.querySelector('iframe');
    if (!player) return;
    player.dataset.ready = '1';
    try {
      player.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: player.dataset.id || '1' }), '*');
    } catch { /* the embed ignores the handshake until it is ready */ }
  });
}
function startTrailer(item) {
  const frame = hero.querySelector('iframe');
  if (!frame || item?.type !== 'trailer') return;
  const wantSound = trailerSound;
  if (wantSound && frame.dataset.ready === '1' && frame.dataset.mute === '0' && frame.dataset.id && frame.dataset.id !== item.id) {
    frame.contentWindow?.postMessage(JSON.stringify({
      event: 'command',
      func: 'loadVideoById',
      args: [{ videoId: item.id, startSeconds: 0 }]
    }), '*');
    frame.dataset.id = item.id;
    frame.title = `${item.name} trailer`;
    trailerId = item.id;
    return;
  }
  const mute = wantSound ? '0' : '1';
  if (frame.dataset.id === item.id && frame.dataset.mute === mute && frame.src) return;
  frame.dataset.id = item.id;
  frame.dataset.mute = mute;
  frame.dataset.ready = '0';
  frame.title = `${item.name} trailer`;
  trailerId = item.id;
  frame.src = trailerEmbed(item.id, mute !== '0');
}
function syncTrailer(item, { first, silent }) {
  const frame = hero.querySelector('iframe');
  paintTrailer(item);
  if (silent && frame && frame.dataset.id === item.id) return;
  clearTimeout(playT);
  playT = setTimeout(() => startTrailer(item), first || silent ? 0 : 200);
}
function toggleTrailerSound() {
  const item = list[fi];
  if (item?.type !== 'trailer') return;
  trailerSound = !trailerSound;
  const button = hero.querySelector('.unmute');
  if (button) {
    button.textContent = trailerSound ? 'Mute' : 'Unmute';
    button.setAttribute('aria-pressed', trailerSound ? 'true' : 'false');
  }
  startTrailer(item);
}
let screenIndex = 0;
let screenSound = false;
let screenTimer = 0;
function paintScreen() {
  const frame = document.querySelector('#screenFrame');
  const name = document.querySelector('#screenName');
  const when = document.querySelector('#screenWhen');
  const item = trailers[screenIndex];
  if (!frame || !name || !when) return;
  if (!item) {
    name.textContent = 'Trailers will be back';
    when.textContent = '';
    return;
  }
  name.textContent = item.name;
  when.textContent = trailerDate(item.published);
  const mute = screenSound ? '0' : '1';
  if (frame.dataset.id === item.id && frame.dataset.mute === mute && frame.getAttribute('src')) return;
  if (screenSound && frame.dataset.ready === '1' && frame.dataset.mute === '0' && frame.dataset.id && frame.dataset.id !== item.id) {
    frame.contentWindow?.postMessage(JSON.stringify({
      event: 'command',
      func: 'loadVideoById',
      args: [{ videoId: item.id, startSeconds: 0 }]
    }), '*');
    frame.dataset.id = item.id;
    return;
  }
  frame.dataset.id = item.id;
  frame.dataset.mute = mute;
  frame.dataset.ready = '0';
  frame.title = `${item.name} trailer`;
  frame.src = trailerEmbed(item.id, mute !== '0');
}
function advanceScreen() {
  if (!trailers.length || document.hidden || cur !== 'now') return;
  screenIndex = (screenIndex + 1) % trailers.length;
  paintScreen();
}
function showScreen(on) {
  const frame = document.querySelector('#screenFrame');
  if (!on) {
    clearInterval(screenTimer);
    screenTimer = 0;
    screenSound = false;
    const sound = document.querySelector('#screenSound');
    if (sound) {
      sound.textContent = 'Unmute';
      sound.setAttribute('aria-pressed', 'false');
    }
    if (frame) {
      frame.src = 'about:blank';
      frame.removeAttribute('src');
      frame.dataset.id = '';
      frame.dataset.ready = '0';
    }
    return;
  }
  paintScreen();
  if (!screenTimer) screenTimer = setInterval(advanceScreen, 22000);
}
function wireScreen() {
  const frame = document.querySelector('#screenFrame');
  frame?.addEventListener('load', () => {
    if (!frame.src || frame.src === 'about:blank') return;
    frame.dataset.ready = '1';
    try {
      frame.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: frame.dataset.id || '1' }), '*');
    } catch { /* the embed ignores the handshake until it is ready */ }
  });
  document.querySelector('#screenOpen')?.addEventListener('click', () => {
    const index = trailers.length ? screenIndex : 0;
    show('movies', false, trailers.length ? index : undefined);
  });
  document.querySelector('#screenSound')?.addEventListener('click', () => {
    const item = trailers[screenIndex];
    if (!item) return;
    screenSound = !screenSound;
    const sound = document.querySelector('#screenSound');
    sound.textContent = screenSound ? 'Mute' : 'Unmute';
    sound.setAttribute('aria-pressed', screenSound ? 'true' : 'false');
    paintScreen();
  });
}
function focus(index, first = false, silent = false) {
  if (cur === 'search') return;
  const next = Math.max(0, Math.min(list.length - 1, index));
  if (!silent && !first && next !== fi) moved = true;
  fi = next;
  const item = list[fi];
  if (!item) {
    if (cur === 'movies') renderTrailerEmpty();
    return;
  }
  rail.querySelectorAll('.tile').forEach((tile, i) => tile.classList.toggle('f', i === fi));
  if (!mobile()) {
    const small = rail.classList.contains('sm');
    const tw = small ? 162 : 274;
    const vis = Math.max(1, Math.floor((innerWidth - 120) / tw));
    const off = Math.max(0, Math.min(fi - Math.floor(vis / 2), list.length - vis)) * tw;
    rail.style.transform = `translateX(${-off}px)`;
  } else {
    rail.style.transform = '';
    rail.children[fi]?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  setHue(item.cat);
  placePill();
  if (item.type === 'trailer') {
    syncTrailer(item, { first, silent });
    return;
  }
  const greet = cur === 'now' && fi === 0 && !moved;
  if (silent) {
    hero.classList.remove('sw');
    hero.innerHTML = heroHTML(item, greet);
    wireHero();
    return;
  }
  const key = cur === 'now' && first ? tod : item.cat;
  const seed = (item.title.length * 7 + fi * 3) % 17 + 1;
  hero.classList.add('sw');
  clearTimeout(swT);
  swT = setTimeout(() => {
    hero.innerHTML = heroHTML(item, greet);
    hero.classList.remove('sw');
    wireHero();
  }, first ? 0 : 260);
  setArt(key, seed);
}
function show(id, keep, at) {
  clearTimeout(swT);
  if (!shelves()[id]) id = 'now';
  if (!keep) moved = false;
  cur = id;
  setHue(HUE[id] ? id : 'now');
  tabs.querySelectorAll('.tab').forEach(button => button.classList.toggle('on', button.dataset.c === id));
  placePill();
  renderShelf();
  renderWidgets();
  document.body.classList.toggle('srch', id === 'search');
  document.body.classList.toggle('movies', id === 'movies');
  document.body.classList.toggle('now', id === 'now');
  showScreen(id === 'now');
  if (id !== 'movies') {
    trailerSound = false;
    trailerId = '';
    clearTimeout(playT);
    const frame = hero.querySelector('iframe');
    if (frame) frame.src = 'about:blank';
  }
  const act = document.querySelector('#actHint');
  if (act) act.textContent = id === 'movies' ? 'unmute' : 'open';
  document.querySelector('#dots').innerHTML = TABS.map(tab => `<i class="${tab.id === id ? 'on' : ''}"></i>`).join('');
  if (id === 'movies') setArt('movies');
  if (id === 'search') {
    hero.classList.remove('sw');
    heroSearch();
    setArt('search', 3);
    rail.querySelectorAll('.tile').forEach(tile => {
      tile.addEventListener('mouseenter', () => {
        rail.querySelectorAll('.tile').forEach(node => node.classList.remove('f'));
        tile.classList.add('f');
      });
    });
  } else if (Number.isInteger(at)) focus(at, true);
  else if (keep) focus(Math.min(fi, list.length - 1), false, true);
  else focus(0, true);
  const hash = id === 'now' ? '#' : `#open=${id}`;
  if (location.hash !== hash && !(id === 'now' && (location.hash === '' || location.hash === '#'))) {
    history.replaceState(null, '', hash);
  }
  window.__home = { section: id, tiles: list.length, searchUrl: window.__home?.searchUrl || null };
}
function soft() {
  const index = fi;
  document.body.classList.add('instant');
  renderShelf();
  renderWidgets();
  if (cur === 'search') heroSearch();
  else focus(index, false, true);
  requestAnimationFrame(() => document.body.classList.remove('instant'));
}
function wireWidgets() {
  document.querySelector('#saveNote')?.addEventListener('click', () => {
    save('notes', document.querySelector('#noteBox').value.trim());
    soft();
  });
  document.querySelector('#newNote')?.addEventListener('click', () => {
    const cardNode = wid.querySelector('.k-note');
    cardNode.innerHTML = `<h4><span>Notes</span><em>pinned</em></h4><textarea class="note-box" id="noteBox" placeholder="Write a note"></textarea><button class="k-add" type="button" id="saveNote">Save note</button>`;
    document.querySelector('#saveNote').addEventListener('click', () => {
      save('notes', document.querySelector('#noteBox').value.trim());
      soft();
    });
    document.querySelector('#noteBox').focus();
  });
  wid.querySelectorAll('[data-task]').forEach(box => {
    box.addEventListener('change', () => {
      if (box.dataset.sample) {
        save('todos', SAMPLE_TASKS.map(item => ({ id: Date.now() + Number(item.id.slice(1)), text: item.text, done: item.id === box.dataset.task ? box.checked : item.done })));
      } else {
        save('todos', savedTasks().map(item => item.id === Number(box.dataset.task) || String(item.id) === box.dataset.task ? { ...item, done: box.checked } : item));
      }
      soft();
    });
  });
  wid.querySelectorAll('[data-drop]').forEach(button => {
    button.addEventListener('click', () => {
      save('events', load('events', []).filter(item => String(item.id) !== button.dataset.drop));
      soft();
    });
  });
  wid.querySelectorAll('[data-trailer]').forEach(button => {
    button.addEventListener('click', () => focus(Number(button.dataset.trailer)));
  });
  wid.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(form);
      if (form.dataset.add === 'task') {
        const text = String(data.get('text') || '').trim();
        if (!text) return;
        const next = tasksNow().sample ? [] : savedTasks();
        save('todos', [{ id: Date.now(), text, done: false }, ...next].slice(0, 40));
      }
      if (form.dataset.add === 'event') {
        const title = String(data.get('title') || '').trim();
        const date = String(data.get('date') || '');
        if (!title || !date) return;
        save('events', [...load('events', []), { id: Date.now(), title, date, time: String(data.get('time') || '') }].slice(-40));
      }
      soft();
    });
  });
}
function paintClock() {
  const now = new Date();
  tod = todOf(now);
  document.querySelector('#tm').textContent = now.toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' }).replace(/\s?[ap]m/i, '');
  document.querySelector('#dt').textContent = now.toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' });
  document.querySelector('#greet').textContent = `Good ${tod}`;
}
function paintWeather() {
  const node = document.querySelector('#wx');
  const w = live.weather;
  if (!w || w.offline) node.textContent = `⛅ ${w?.place || live.place}`;
  else node.textContent = `${skyGlyph(w.code)} ${w.t}° ${w.place}`;
}

TABS.forEach(tab => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tab';
  button.dataset.c = tab.id;
  button.innerHTML = `${tab.mark || (tab.id === 'now' ? '<svg class="k-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9H3z"/><path d="M9 20v-6h6v6"/></svg>' : icon(tab.id, 17))}${tab.name}`;
  button.addEventListener('click', () => show(tab.id));
  tabs.appendChild(button);
});

const field = event => event.target instanceof Element && event.target.closest('input, textarea');
let wheelAt = 0;
addEventListener('wheel', event => {
  if (cur === 'search' || mobile() || Date.now() - wheelAt < 220) return;
  if (event.target instanceof Element && event.target.closest('input, textarea, .wid')) return;
  wheelAt = Date.now();
  focus(fi + ((event.deltaY || event.deltaX) > 0 ? 1 : -1));
}, { passive: true });
addEventListener('keydown', event => {
  const typing = field(event);
  if (event.key === 'ArrowRight' && !typing) { event.preventDefault(); focus(fi + 1); }
  else if (event.key === 'ArrowLeft' && !typing) { event.preventDefault(); focus(fi - 1); }
  else if (event.key === 'Tab' && !(event.target instanceof Element && event.target.closest('textarea'))) {
    event.preventDefault();
    const index = TABS.findIndex(tab => tab.id === cur);
    show(TABS[(index + (event.shiftKey ? TABS.length - 1 : 1)) % TABS.length].id);
  } else if (event.key === 'Escape') show('now');
  else if (event.key === '/' && !typing && cur !== 'search') { event.preventDefault(); show('search'); }
  else if (event.key === 'Enter' && cur !== 'search' && !typing) {
    const tile = rail.querySelectorAll('.tile')[fi];
    const item = list[fi];
    if (!item) return;
    if (item.type === 'trailer') toggleTrailerSound();
    else if (item.type === 'app') tile?.click();
    else if (item.href) window.open(item.href, '_blank', 'noopener');
    else if (item.tab || item.cat) show(item.tab || item.cat);
  }
});
addEventListener('resize', () => { placePill(); if (cur !== 'search') focus(fi, false, true); });

let padOn = false;
let padAt = 0;
function pollPad() {
  if (!padOn) return;
  const pads = navigator.getGamepads?.() || [];
  let connected = false;
  for (const pad of pads) {
    if (!pad) continue;
    connected = true;
    if (performance.now() - padAt < 240) continue;
    const left = pad.buttons[14]?.pressed || pad.axes[0] < -0.6;
    const right = pad.buttons[15]?.pressed || pad.axes[0] > 0.6;
    if (right) { focus(fi + 1); padAt = performance.now(); }
    else if (left) { focus(fi - 1); padAt = performance.now(); }
    else if (pad.buttons[0]?.pressed) {
      const item = list[fi];
      if (item?.type === 'trailer') toggleTrailerSound();
      else if (item?.type === 'app') rail.querySelectorAll('.tile')[fi]?.click();
      else if (item?.href) window.open(item.href, '_blank', 'noopener');
      else if (item?.tab || item?.cat) show(item.tab || item.cat);
      padAt = performance.now();
    } else if (pad.buttons[1]?.pressed) { show('now'); padAt = performance.now(); }
  }
  if (!connected) { padOn = false; return; }
  requestAnimationFrame(pollPad);
}
addEventListener('gamepadconnected', () => { if (!padOn) { padOn = true; requestAnimationFrame(pollPad); } });

function boot() {
  if (started) return;
  started = true;
  paintClock();
  const match = location.hash.match(/open(?:=(\w+))?/);
  if (match) document.body.classList.add('instant');
  show(match ? (match[1] || 'watch') : 'now');
  if (match) setTimeout(() => document.body.classList.remove('instant'), 80);
}
paintClock();
setInterval(paintClock, 10000);
let softT = 0;
subscribe(() => {
  paintWeather();
  if (!started || cur === 'search' || !['now', 'info', 'money'].includes(cur)) return;
  clearTimeout(softT);
  softT = setTimeout(soft, 40);
});
refreshLive();
loadTrailers().then(items => {
  const had = trailers.length;
  trailers = items;
  if (cur === 'now') showScreen(true);
  if (started && cur === 'movies' && !had && items.length) show('movies');
});
wireScreen();
bindParallax();
window.__open = show;
window.__home = { section: 'now', tiles: 0, searchUrl: null };
document.fonts?.ready.then(boot);
setTimeout(boot, 900);
