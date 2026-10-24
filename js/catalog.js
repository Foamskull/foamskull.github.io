export const APPS = [
  { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com', icon: 'icons/youtube.svg', bg: '#111111', cat: 'watch' },
  { id: 'netflix', name: 'Netflix', url: 'https://www.netflix.com', icon: 'icons/netflix.svg', bg: '#141414', cat: 'watch' },
  { id: 'disney', name: 'Disney+', url: 'https://www.disneyplus.com', icon: 'icons/disney.svg', bg: '#f4f6ff', cat: 'watch', wide: true },
  { id: 'neon', name: 'Neon', url: 'https://www.neontv.co.nz', icon: 'icons/neon.svg', bg: '#effe3e', cat: 'watch', fill: true },
  { id: 'tvnz', name: 'TVNZ+', url: 'https://www.tvnz.co.nz', icon: 'icons/tvnz.svg', bg: '#071018', cat: 'watch', wide: true },
  { id: 'threenow', name: 'ThreeNow', url: 'https://www.threenow.co.nz', icon: 'icons/threenow.png', bg: '#ff044f', cat: 'watch' },
  { id: 'skygo', name: 'Sky Go', url: 'https://www.skygo.co.nz', icon: 'icons/skygo.png', bg: '#0c1448', cat: 'watch' },
  { id: 'spotify', name: 'Spotify', url: 'https://open.spotify.com', icon: 'icons/spotify.svg', bg: '#121212', cat: 'listen' },
  { id: 'twitch', name: 'Twitch', url: 'https://www.twitch.tv', icon: 'icons/twitch.svg', bg: '#0e0e10', cat: 'play' },
  { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com', icon: 'icons/steam.svg', bg: '#171a21', cat: 'play' },
  { id: 'westpac', name: 'Westpac', url: 'https://www.westpac.co.nz', icon: 'icons/westpac.svg', bg: '#ffffff', cat: 'money', wide: true },
  { id: 'asb', name: 'ASB', url: 'https://www.asb.co.nz', icon: 'icons/asb.svg', bg: '#f6f3ec', cat: 'money', wide: true },
  { id: 'anz', name: 'ANZ', url: 'https://www.anz.co.nz', icon: 'icons/anz.svg', bg: '#007cc8', cat: 'money', wide: true },
  { id: 'yahoo', name: 'Yahoo', url: 'https://www.yahoo.com', icon: 'icons/yahoo.svg', bg: '#1a0b33', cat: 'info', wide: true },
  { id: 'spark', name: 'Spark', url: 'https://www.spark.co.nz', icon: 'icons/spark.png', bg: '#120c18', cat: 'info', wide: true }
];

export const CATS = [
  { id: 'watch', name: 'Watch', icon: '<path d="M3 6h18v11H3z"/><path d="M8 21h8"/><path d="M12 17v4"/>' },
  { id: 'listen', name: 'Listen', icon: '<path d="M9 18V6l10-2v12"/><path d="M9 18a3 3 0 1 1-6 0a3 3 0 0 1 6 0z"/><path d="M19 16a3 3 0 1 1-6 0a3 3 0 0 1 6 0z"/>' },
  { id: 'play', name: 'Play', icon: '<path d="M6 9h12a4 4 0 0 1 4 4v1a3 3 0 0 1-5 2l-2-2H9l-2 2a3 3 0 0 1-5-2v-1a4 4 0 0 1 4-4z"/><path d="M8 11v3"/><path d="M6.5 12.5h3"/>' },
  { id: 'money', name: 'Money', icon: '<path d="M3 7h18v10H3z"/><circle cx="12" cy="12" r="2.5"/>' },
  { id: 'info', name: 'Today', icon: '<path d="M12 3v2"/><path d="M12 19v2"/><path d="M3 12h2"/><path d="M19 12h2"/><path d="M5.6 5.6l1.4 1.4"/><path d="M17 17l1.4 1.4"/><path d="M5.6 18.4L7 17"/><path d="M17 7l1.4-1.4"/><circle cx="12" cy="12" r="4"/>' },
  { id: 'notes', name: 'Notes', icon: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 12h7"/><path d="M9 16h7"/>' },
  { id: 'search', name: 'Search', icon: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>' }
];

export function appsOf(cat) {
  return APPS.filter(app => app.cat === cat);
}

export function appByName(name) {
  return APPS.find(app => app.name === name);
}

export function catName(id) {
  return CATS.find(cat => cat.id === id)?.name || '';
}

export function icon(id, size = 17) {
  const cat = CATS.find(item => item.id === id);
  if (!cat) return '';
  return `<svg class="k-ic" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${cat.icon}</svg>`;
}
