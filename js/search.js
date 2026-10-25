export function searchUrl(engine, query) {
  const q = encodeURIComponent(query);
  if (engine === 'youtube') return `https://www.youtube.com/results?search_query=${q}`;
  if (engine === 'ddg') return `https://duckduckgo.com/?q=${q}`;
  return `https://www.google.com/search?q=${q}`;
}

export function openSearch(engine, query) {
  const text = query.trim();
  if (!text) return '';
  const url = searchUrl(engine, text);
  window.open(url, '_blank', 'noopener');
  return url;
}
