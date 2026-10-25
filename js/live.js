import { load } from './store.js';

export const live = {
  place: 'Auckland',
  weather: null,
  crypto: null,
  news: null
};

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  listeners.forEach(fn => fn(live));
}

function wmo(code) {
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
}

export function skyGlyph(code) {
  if (code == null) return '⛅';
  if (code === 0) return '☀';
  if (code <= 2) return '⛅';
  if (code === 3) return '☁';
  if (code <= 67) return '🌧';
  if (code <= 77) return '❄';
  if (code <= 82) return '🌦';
  return '⛈';
}

export function forecastGlyph(code) {
  if (code == null) return '☁';
  if (code <= 1) return '☀';
  if (code <= 3 || (code >= 45 && code <= 48)) return '☁';
  if (code >= 71 && code <= 77) return '❄';
  return '☂';
}

function money(value) {
  if (typeof value !== 'number') return '–';
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    maximumFractionDigits: value > 100 ? 0 : 2
  }).format(value);
}

function strip(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function loadWeather() {
  const cfg = load('settings', {});
  const lat = Number.isFinite(cfg.lat) ? cfg.lat : -36.8509;
  const lon = Number.isFinite(cfg.lon) ? cfg.lon : 174.7645;
  live.place = cfg.place || 'Auckland';
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('status');
    const data = await response.json();
    const days = data.daily.time.slice(1, 5).map((day, i) => ({
      label: new Date(`${day}T12:00:00`).toLocaleDateString('en-NZ', { weekday: 'short' }),
      hi: Math.round(data.daily.temperature_2m_max[i + 1]),
      code: data.daily.weather_code[i + 1]
    }));
    live.weather = {
      place: live.place,
      t: Math.round(data.current.temperature_2m),
      desc: wmo(data.current.weather_code),
      code: data.current.weather_code,
      hi: Math.round(data.daily.temperature_2m_max[0]),
      lo: Math.round(data.daily.temperature_2m_min[0]),
      wind: Math.round(data.current.wind_speed_10m),
      days
    };
  } catch {
    live.weather = { offline: true, place: live.place };
  }
  emit();
}

async function loadCrypto() {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=nzd&include_24hr_change=true');
    if (!response.ok) throw new Error('status');
    const data = await response.json();
    const rows = [['BTC', 'bitcoin'], ['ETH', 'ethereum'], ['SOL', 'solana']].map(([sym, id]) => {
      const price = data[id]?.nzd;
      const change = data[id]?.nzd_24h_change;
      return {
        sym,
        price: money(price),
        change: typeof change === 'number' ? change : null
      };
    });
    if (!rows.some(row => row.price !== '–')) throw new Error('empty');
    live.crypto = rows;
  } catch {
    live.crypto = { offline: true };
  }
  emit();
}

async function loadNews() {
  const now = new Date();
  const stamp = [now.getUTCFullYear(), String(now.getUTCMonth() + 1).padStart(2, '0'), String(now.getUTCDate()).padStart(2, '0')].join('/');
  try {
    const response = await fetch(`https://en.wikipedia.org/api/rest_v1/feed/featured/${stamp}`);
    if (!response.ok) throw new Error('status');
    const data = await response.json();
    const items = (data.news || []).slice(0, 4).map(story => {
      const link = (story.links || [])[0];
      if (!link) return null;
      const sentence = strip(String(story.story || '').replace(/<!--[\s\S]*?-->/g, '')).split(/(?<=[.!?])\s/)[0];
      const title = sentence || strip(link.displaytitle || link.normalizedtitle || link.title || 'Story');
      const slug = (link.normalizedtitle || strip(link.title || title)).replace(/ /g, '_');
      return { title, href: `https://en.wikipedia.org/wiki/${encodeURIComponent(slug)}` };
    }).filter(Boolean);
    if (!items.length) throw new Error('empty');
    live.news = items;
    emit();
    return;
  } catch { /* fall through */ }
  try {
    const response = await fetch('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=4');
    if (!response.ok) throw new Error('status');
    const data = await response.json();
    const hits = (data.hits || []).filter(hit => hit.url && hit.title).slice(0, 4).map(hit => ({ title: hit.title, href: hit.url }));
    if (!hits.length) throw new Error('empty');
    live.news = hits;
  } catch {
    live.news = { offline: true };
  }
  emit();
}

export function refreshLive() {
  return Promise.all([loadWeather(), loadCrypto(), loadNews()]);
}
