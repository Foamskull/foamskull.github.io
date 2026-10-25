export function trailerDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function trailerThumb(id) {
  return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
}

export function trailerEmbed(id, muted) {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: muted ? '1' : '0',
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    enablejsapi: '1'
  });
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${params}`;
}

export function trailerWatch(id) {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
}

export async function loadTrailers() {
  try {
    const response = await fetch('data/trailers.json', { cache: 'no-cache' });
    if (!response.ok) return [];
    const data = await response.json();
    if (!Array.isArray(data.trailers)) return [];
    return data.trailers.filter(item => item && /^[\w-]{6,16}$/.test(item.id) && item.name);
  } catch {
    return [];
  }
}
