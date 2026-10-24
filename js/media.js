import { bus } from './bus.js';
import { load, save } from './store.js';
import { esc } from './store.js';
import { safeHttp } from './tiles.js';

const audio = () => document.querySelector('#audio');
const video = () => document.querySelector('#video');
const frame = () => document.querySelector('#yt');

let playlist = load('playlist', []).filter(item => item && item.url && item.kind !== 'file');
let index = 0;
let shuffle = false;
let repeat = 'off';
let audioCtx;
let analyser;
let audioSrc;
let videoSrc;
let vizFrame = 0;
const bins = new Uint8Array(64);

function persist() {
  save('playlist', playlist.filter(item => !item.file).map(({ name, url, kind }) => ({ name, url, kind })));
}

export function youtubeId(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || '';
    if (host.endsWith('youtube.com') || host === 'youtube-nocookie.com') {
      if (url.pathname.startsWith('/embed/')) return url.pathname.split('/')[2] || '';
      if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2] || '';
      return url.searchParams.get('v') || '';
    }
  } catch { /* not a url */ }
  return '';
}

function kindFor(file) {
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('video/')) return 'video';
  return /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(file.name) ? 'audio' : 'video';
}

export function addFiles(files) {
  for (const file of files) {
    playlist.push({
      name: file.name,
      url: URL.createObjectURL(file),
      kind: kindFor(file),
      file: true
    });
  }
  if (playlist.length === 1) play(0);
  renderList();
  updateDock();
}

export function addUrl(raw) {
  const url = safeHttp(raw);
  if (!url) return false;
  const id = youtubeId(url);
  const audioExt = /\.(mp3|wav|ogg|m4a|flac|aac)(\?|$)/i;
  playlist.push(id
    ? { name: 'YouTube', url, kind: 'youtube' }
    : { name: url.replace(/^https?:\/\//, '').slice(0, 48), url, kind: audioExt.test(url) ? 'audio' : 'video' });
  persist();
  play(playlist.length - 1);
  return true;
}

function ensureGraph(element, which) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  if (!audioCtx) {
    audioCtx = new Ctx();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    analyser.connect(audioCtx.destination);
  }
  if (which === 'audio' && !audioSrc) {
    audioSrc = audioCtx.createMediaElementSource(element);
    audioSrc.connect(analyser);
  }
  if (which === 'video' && !videoSrc) {
    videoSrc = audioCtx.createMediaElementSource(element);
    videoSrc.connect(analyser);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function stopVisuals() {
  cancelAnimationFrame(vizFrame);
  vizFrame = 0;
  bus.pulse = 0;
  bus.playing = false;
  document.body.classList.remove('playing');
}

function drawViz() {
  const canvas = document.querySelector('#viz');
  if (!analyser || !canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = canvas.clientWidth || 320;
  const height = canvas.clientHeight || 72;
  if (canvas.width !== Math.round(width * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  analyser.getByteFrequencyData(bins);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += bins[i];
  bus.pulse = bus.motion ? sum / (12 * 255) : 0;
  document.documentElement.style.setProperty('--pulse', bus.pulse.toFixed(3));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#8ea2ff';
  const n = 28;
  const gap = 4;
  const bar = (width - gap * (n - 1)) / n;
  ctx.fillStyle = accent;
  for (let i = 0; i < n; i++) {
    const value = bins[i] / 255;
    const h = Math.max(3, value * (height - 6));
    ctx.globalAlpha = 0.45 + value * 0.55;
    ctx.fillRect(i * (bar + gap), height - h, bar, h);
  }
  ctx.globalAlpha = 1;
}

function loopViz() {
  drawViz();
  if (bus.playing && bus.motion) vizFrame = requestAnimationFrame(loopViz);
}

function showMode(mode) {
  const screen = video();
  const box = frame();
  screen.hidden = mode !== 'video';
  box.hidden = mode !== 'youtube';
  document.querySelector('#vizWrap').hidden = mode === 'youtube';
}

export function play(i) {
  if (!playlist.length) return;
  index = (i + playlist.length) % playlist.length;
  const item = playlist[index];
  const screen = video();
  const sound = audio();
  const box = frame();
  screen.pause();
  sound.pause();
  box.src = '';
  stopVisuals();
  if (item.kind === 'youtube') {
    const id = youtubeId(item.url);
    showMode('youtube');
    box.src = id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1` : '';
  } else if (item.kind === 'audio') {
    showMode('audio');
    ensureGraph(sound, 'audio');
    sound.src = item.url;
    sound.play().catch(() => {});
  } else {
    showMode('video');
    ensureGraph(screen, 'video');
    screen.src = item.url;
    screen.play().catch(() => {});
  }
  bus.playing = item.kind !== 'youtube';
  document.body.classList.toggle('playing', bus.playing);
  if (bus.playing && bus.motion) loopViz();
  document.querySelector('#nowName').textContent = item.name;
  document.querySelector('#dock').hidden = false;
  renderList();
  updateDock();
}

export function togglePlay() {
  const item = playlist[index];
  if (!item) return;
  if (item.kind === 'youtube') return;
  const el = item.kind === 'audio' ? audio() : video();
  if (el.paused) {
    el.play().catch(() => {});
    bus.playing = true;
    if (bus.motion && !vizFrame) loopViz();
  } else {
    el.pause();
    bus.playing = false;
    stopVisuals();
  }
  updateDock();
}

function activeEl() {
  const item = playlist[index];
  if (!item || item.kind === 'youtube') return null;
  return item.kind === 'audio' ? audio() : video();
}

export function next() {
  if (!playlist.length) return;
  if (shuffle) {
    play(Math.floor(Math.random() * playlist.length));
    return;
  }
  if (index === playlist.length - 1 && repeat === 'off') return;
  play(index + 1);
}

function onEnded() {
  if (repeat === 'one') play(index);
  else next();
}

export function renderList() {
  const list = document.querySelector('#playlist');
  if (!list) return;
  list.innerHTML = playlist.length
    ? playlist.map((item, i) => `<li class="${i === index ? 'on' : ''}">
        <button type="button" data-item data-play="${i}">${esc(item.name)}</button>
        <button type="button" data-drop="${i}" aria-label="Remove ${esc(item.name)}">×</button>
      </li>`).join('')
    : '<li class="empty">Nothing queued yet.</li>';
}

function updateDock() {
  const el = activeEl();
  const button = document.querySelector('#dockPlay');
  if (button) button.textContent = el && !el.paused ? 'Pause' : 'Play';
  const seek = document.querySelector('#seek');
  const volume = document.querySelector('#volume');
  if (el && seek && document.activeElement !== seek) {
    seek.max = el.duration || 0;
    seek.value = el.currentTime || 0;
  }
  if (el && volume && document.activeElement !== volume) volume.value = el.volume;
}

export function bindMedia() {
  const sound = audio();
  const screen = video();
  sound.addEventListener('ended', onEnded);
  screen.addEventListener('ended', onEnded);
  sound.addEventListener('timeupdate', updateDock);
  screen.addEventListener('timeupdate', updateDock);
  sound.addEventListener('play', () => { bus.playing = true; document.body.classList.add('playing'); if (bus.motion) loopViz(); updateDock(); });
  screen.addEventListener('play', () => { bus.playing = true; document.body.classList.add('playing'); if (bus.motion) loopViz(); updateDock(); });
  sound.addEventListener('pause', updateDock);
  screen.addEventListener('pause', updateDock);

  document.querySelector('#filePick').addEventListener('change', event => {
    addFiles(event.target.files);
    event.target.value = '';
  });
  const drop = document.querySelector('#drop');
  drop.addEventListener('dragover', event => { event.preventDefault(); drop.classList.add('hot'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('hot'));
  drop.addEventListener('drop', event => {
    event.preventDefault();
    drop.classList.remove('hot');
    if (event.dataTransfer.files?.length) addFiles(event.dataTransfer.files);
  });
  document.querySelector('#urlForm').addEventListener('submit', event => {
    event.preventDefault();
    const input = document.querySelector('#mediaUrl');
    if (!addUrl(input.value)) input.setCustomValidity('Use an http or https link');
    else { input.setCustomValidity(''); input.value = ''; }
    input.reportValidity();
  });
  document.querySelector('#playlist').addEventListener('click', event => {
    const playId = event.target.closest('[data-play]');
    const dropId = event.target.closest('[data-drop]');
    if (playId) play(Number(playId.dataset.play));
    if (dropId) {
      const i = Number(dropId.dataset.drop);
      const item = playlist[i];
      const removingCurrent = i === index;
      if (item?.file) URL.revokeObjectURL(item.url);
      playlist.splice(i, 1);
      if (i < index) index -= 1;
      if (index >= playlist.length) index = Math.max(0, playlist.length - 1);
      persist();
      renderList();
      if (!playlist.length) {
        audio().pause();
        video().pause();
        frame().src = '';
        stopVisuals();
        document.querySelector('#nowName').textContent = 'Signal idle';
        document.querySelector('#dock').hidden = true;
      } else if (removingCurrent) play(index);
    }
  });
  document.querySelector('#playBtn').addEventListener('click', togglePlay);
  document.querySelector('#prevBtn').addEventListener('click', () => play(index - 1));
  document.querySelector('#nextBtn').addEventListener('click', next);
  document.querySelector('#dockPlay').addEventListener('click', togglePlay);
  document.querySelector('#dockNext').addEventListener('click', next);
  document.querySelector('#shuffleBtn').addEventListener('click', event => {
    shuffle = !shuffle;
    event.currentTarget.setAttribute('aria-pressed', String(shuffle));
  });
  document.querySelector('#repeatBtn').addEventListener('click', event => {
    repeat = repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off';
    event.currentTarget.textContent = repeat === 'off' ? 'Repeat' : repeat === 'all' ? 'Repeat all' : 'Repeat one';
    event.currentTarget.setAttribute('aria-pressed', String(repeat !== 'off'));
  });
  document.querySelector('#seek').addEventListener('input', event => {
    const el = activeEl();
    if (el) el.currentTime = Number(event.target.value);
  });
  document.querySelector('#volume').addEventListener('input', event => {
    const value = Number(event.target.value);
    audio().volume = value;
    video().volume = value;
  });
  window.addEventListener('pagehide', () => {
    playlist.forEach(item => { if (item.file) URL.revokeObjectURL(item.url); });
  });
  renderList();
}

export function playMusic() {
  const audioItems = playlist.map((item, i) => ({ item, i })).filter(entry => entry.item.kind === 'audio');
  if (audioItems.length) play(audioItems[0].i);
  else if (playlist.length) play(index || 0);
}
