import { esc, load, save } from './store.js';

const WMO = code => {
  if (code === 0) return 'Clear';
  if (code <= 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code <= 48) return 'Fog';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Snow showers';
  return 'Storm';
};

function defaults() {
  return {
    engine: 'google',
    intensity: 0.7,
    motion: 'system',
    place: 'Auckland',
    lat: -36.8509,
    lon: 174.7645,
    widgets: { weather: true, radar: true, crypto: true, news: true }
  };
}

export function settings() {
  const saved = load('settings', {});
  return { ...defaults(), ...saved, widgets: { ...defaults().widgets, ...(saved.widgets || {}) } };
}

export function writeSettings(next) {
  save('settings', next);
}

export function notes() { return load('notes', ''); }
export function setNotes(value) { save('notes', value); }
export function todos() { return load('todos', []); }
export function setTodos(list) { save('todos', list); }
export function events() { return load('events', []); }
export function setEvents(list) { save('events', list); }
export function links() { return load('links', []); }
export function setLinks(list) { save('links', list); }

function money(value) {
  if (typeof value !== 'number') return '–';
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: value > 100 ? 0 : 2 }).format(value);
}

async function loadWeather(card, place) {
  const cfg = settings();
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${cfg.lat}&longitude=${cfg.lon}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=5`;
  try {
    const data = await fetch(url).then(response => { if (!response.ok) throw new Error('status'); return response.json(); });
    const days = data.daily.time.map((day, i) => {
      const label = i === 0 ? 'Today' : new Date(day + 'T12:00:00').toLocaleDateString('en-NZ', { weekday: 'short' });
      return `<li><b>${label}</b><span>${Math.round(data.daily.temperature_2m_max[i])}°</span><small>${Math.round(data.daily.temperature_2m_min[i])}° · ${data.daily.precipitation_probability_max[i] ?? 0}%</small></li>`;
    }).join('');
    card.innerHTML = `<p class="eyebrow">Atmospheric · ${esc(place)}</p><p class="stat">${Math.round(data.current.temperature_2m)}°</p><p class="meta">${WMO(data.current.weather_code)} · wind ${Math.round(data.current.wind_speed_10m)} km/h</p><ol class="days">${days}</ol>`;
  } catch {
    card.innerHTML = `<p class="eyebrow">Atmospheric</p><p class="meta">Scan is offline right now.</p>`;
  }
}

function tileXY(lat, lon, zoom) {
  const x = Math.floor((lon + 180) / 360 * 2 ** zoom);
  const rad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * 2 ** zoom);
  return { x, y };
}

async function loadRadar(card) {
  const cfg = settings();
  try {
    const meta = await fetch('https://api.rainviewer.com/public/weather-maps.json').then(response => { if (!response.ok) throw new Error('status'); return response.json(); });
    const frame = meta.radar?.past?.at(-1);
    if (!frame) throw new Error('empty');
    const zoom = 6;
    const { x, y } = tileXY(cfg.lat, cfg.lon, zoom);
    const src = `${meta.host}${frame.path}/256/${zoom}/${x}/${y}/2/1_1.png`;
    card.innerHTML = `<p class="eyebrow">Sector radar · ${esc(cfg.place)}</p><img class="radar" alt="Latest rain radar tile" src="${src}"><span class="sweep" aria-hidden="true"></span>`;
    card.querySelector('img').addEventListener('error', () => { card.innerHTML = `<p class="eyebrow">Sector radar</p><p class="meta">The radar image didn’t load.</p>`; });
  } catch {
    card.innerHTML = `<p class="eyebrow">Sector radar</p><p class="meta">Radar is offline right now.</p>`;
  }
}

async function loadCrypto(card) {
  try {
    const data = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=nzd&include_24hr_change=true').then(response => { if (!response.ok) throw new Error('status'); return response.json(); });
    const rows = [['Bitcoin', 'bitcoin'], ['Ethereum', 'ethereum'], ['Solana', 'solana']].map(([label, id]) => {
      const price = data[id]?.nzd;
      const change = data[id]?.nzd_24h_change;
      const dir = typeof change === 'number' ? `${change >= 0 ? '+' : ''}${change.toFixed(1)}%` : '';
      return `<li><span>${label}</span><b>${money(price)}</b><small>${dir}</small></li>`;
    }).join('');
    card.innerHTML = `<p class="eyebrow">Market telemetry · NZD</p><ul class="prices">${rows}</ul>`;
  } catch {
    card.innerHTML = `<p class="eyebrow">Market telemetry</p><p class="meta">Prices are offline right now.</p>`;
  }
}

function strip(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function loadNews(card) {
  const now = new Date();
  const stamp = [now.getUTCFullYear(), String(now.getUTCMonth() + 1).padStart(2, '0'), String(now.getUTCDate()).padStart(2, '0')].join('/');
  try {
    const data = await fetch(`https://en.wikipedia.org/api/rest_v1/feed/featured/${stamp}`).then(response => { if (!response.ok) throw new Error('status'); return response.json(); });
    const items = (data.news || []).slice(0, 4).map(story => {
      const link = (story.links || [])[0];
      if (!link) return null;
      const sentence = strip(String(story.story || '').replace(/<!--[\s\S]*?-->/g, '')).split(/(?<=[.!?])\s/)[0];
      const title = sentence || strip(link.displaytitle || link.normalizedtitle || link.title || 'Story');
      const slug = (link.normalizedtitle || strip(link.title || title)).replace(/ /g, '_');
      const href = `https://en.wikipedia.org/wiki/${encodeURIComponent(slug)}`;
      return { title, href };
    }).filter(Boolean);
    if (!items.length) throw new Error('empty');
    card.innerHTML = `<p class="eyebrow">Intel feed</p><ul class="headlines">${items.map(item => `<li><a data-item href="${esc(item.href)}" target="_blank" rel="noopener noreferrer">${esc(item.title)}</a></li>`).join('')}</ul>`;
    return;
  } catch { /* fall through */ }
  try {
    const data = await fetch('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=4').then(response => { if (!response.ok) throw new Error('status'); return response.json(); });
    const hits = (data.hits || []).filter(hit => hit.url && hit.title);
    if (!hits.length) throw new Error('empty');
    card.innerHTML = `<p class="eyebrow">Intel feed</p><ul class="headlines">${hits.map(hit => `<li><a data-item href="${esc(hit.url)}" target="_blank" rel="noopener noreferrer">${esc(hit.title)}</a></li>`).join('')}</ul>`;
  } catch {
    card.innerHTML = `<p class="eyebrow">Intel feed</p><p class="meta">The feed is offline right now.</p>`;
  }
}

export async function renderWidgets() {
  const root = document.querySelector('#widgets');
  const cfg = settings();
  const cards = [];
  if (cfg.widgets.weather) cards.push(['weather', 'Weather']);
  if (cfg.widgets.radar) cards.push(['radar', 'Radar']);
  if (cfg.widgets.crypto) cards.push(['crypto', 'Crypto']);
  if (cfg.widgets.news) cards.push(['news', 'News']);
  const names = { weather: 'Atmospheric', radar: 'Sector radar', crypto: 'Market telemetry', news: 'Intel feed' };
  root.innerHTML = cards.map(([id]) => `<article class="card${id === 'weather' ? ' wide' : ''}${id === 'radar' ? ' scan' : ''}" id="card-${id}" data-row><p class="eyebrow">${names[id]}</p><p class="meta">Linking…</p></article>`).join('')
    || '<article class="card"><p class="meta">Monitors are dark. Turn them back on in Systems.</p></article>';
  const jobs = [];
  if (cfg.widgets.weather) jobs.push(loadWeather(document.querySelector('#card-weather'), cfg.place));
  if (cfg.widgets.radar) jobs.push(loadRadar(document.querySelector('#card-radar')));
  if (cfg.widgets.crypto) jobs.push(loadCrypto(document.querySelector('#card-crypto')));
  if (cfg.widgets.news) jobs.push(loadNews(document.querySelector('#card-news')));
  await Promise.all(jobs);
}

export async function lookupPlace(name) {
  try {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1`);
    if (!response.ok) return null;
    const data = await response.json();
    const hit = data.results && data.results[0];
    if (!hit) return null;
    return { place: hit.name, lat: hit.latitude, lon: hit.longitude };
  } catch {
    return null;
  }
}

export function upcoming() {
  return events()
    .slice()
    .sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`))
    .filter(item => `${item.date}T${item.time || '23:59'}` >= new Date().toISOString().slice(0, 16));
}
