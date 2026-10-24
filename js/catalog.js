export const ROWS = [
  { id: 'watch', title: 'Feed · visual' },
  { id: 'listen', title: 'Feed · audio' },
  { id: 'everyday', title: 'Comms' },
  { id: 'yours', title: 'Local access' }
];

export const CATALOG = [
  { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com', icon: 'icons/youtube.svg', bg: '#111111', row: 'watch' },
  { id: 'netflix', name: 'Netflix', url: 'https://www.netflix.com', icon: 'icons/netflix.svg', bg: '#141414', row: 'watch' },
  { id: 'disney', name: 'Disney+', url: 'https://www.disneyplus.com', icon: 'icons/disney.svg', bg: '#f4f6ff', row: 'watch', pad: 'wide' },
  { id: 'neon', name: 'Neon', url: 'https://www.neontv.co.nz', icon: 'icons/neon.svg', bg: '#effe3e', row: 'watch' },
  { id: 'tvnz', name: 'TVNZ+', url: 'https://www.tvnz.co.nz', icon: 'icons/tvnz.svg', bg: '#071018', row: 'watch', pad: 'wide' },
  { id: 'threenow', name: 'ThreeNow', url: 'https://www.threenow.co.nz', icon: 'icons/threenow.png', bg: '#ff044f', row: 'watch' },
  { id: 'skygo', name: 'Sky Go', url: 'https://www.skygo.co.nz', icon: 'icons/skygo.png', bg: '#0c1448', row: 'watch' },
  { id: 'twitch', name: 'Twitch', url: 'https://www.twitch.tv', icon: 'icons/twitch.svg', bg: '#0e0e10', row: 'watch' },
  { id: 'spotify', name: 'Spotify', url: 'https://open.spotify.com', icon: 'icons/spotify.svg', bg: '#121212', row: 'listen' },
  { id: 'yahoo', name: 'Yahoo', url: 'https://www.yahoo.com', icon: 'icons/yahoo.svg', bg: '#ffffff', row: 'everyday', pad: 'wide' },
  { id: 'westpac', name: 'Westpac', url: 'https://www.westpac.co.nz', icon: 'icons/westpac.svg', bg: '#ffffff', row: 'everyday', pad: 'wide' },
  { id: 'asb', name: 'ASB', url: 'https://www.asb.co.nz', icon: 'icons/asb.svg', bg: '#f6f3ec', row: 'everyday', pad: 'wide' },
  { id: 'anz', name: 'ANZ', url: 'https://www.anz.co.nz', icon: 'icons/anz.svg', bg: '#007cc8', row: 'everyday', pad: 'wide' },
  { id: 'spark', name: 'Spark', url: 'https://www.spark.co.nz', icon: 'icons/spark.png', bg: '#ffffff', row: 'everyday', pad: 'wide' },
  { id: 'steam', name: 'Steam', url: 'https://store.steampowered.com', icon: 'icons/steam.svg', bg: '#171a21', row: 'everyday' }
];

export const ACCENTS = {
  morning: '#ffc14a',
  day: '#ffb000',
  evening: '#ff8a1e',
  night: '#e09828'
};

export function ambientName(tod) {
  return {
    morning: 'Stable',
    day: 'Nominal',
    evening: 'Elevated',
    night: 'Quiet'
  }[tod];
}

export function timeOfDay(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'day';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

export function greeting(tod) {
  return {
    morning: 'Day watch',
    day: 'Main watch',
    evening: 'Evening watch',
    night: 'Night watch'
  }[tod];
}
