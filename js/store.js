const KEY = 'home.';

export function load(name, fallback) {
  try {
    const raw = localStorage.getItem(KEY + name);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function esc(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

export function save(name, value) {
  try {
    localStorage.setItem(KEY + name, JSON.stringify(value));
  } catch {
    /* storage can be full or blocked; the page still works for this session */
  }
}
