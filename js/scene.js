const PLATES = {
  morning: 'img/sky-morning.webp',
  afternoon: 'img/sky-afternoon.webp',
  evening: 'img/sky-evening.webp',
  night: 'img/sky-night.webp',
  watch: 'img/sky-watch.webp',
  listen: 'img/sky-listen.webp',
  play: 'img/sky-play.webp',
  money: 'img/sky-money.webp',
  info: 'img/sky-afternoon.webp',
  notes: 'img/sky-notes.webp',
  search: 'img/sky-search.webp'
};

const LOOK = {
  morning: { x: 0.84, y: 0.44, core: 'rgba(255,236,210,.55)', mid: 'rgba(255,170,120,.22)', water: '255,214,180', wide: '42vw' },
  afternoon: { x: 0.81, y: 0.30, core: 'rgba(255,250,235,.42)', mid: 'rgba(180,210,255,.16)', water: '210,230,255', wide: '34vw' },
  evening: { x: 0.78, y: 0.52, core: 'rgba(255,214,170,.55)', mid: 'rgba(255,96,70,.22)', water: '255,196,150', wide: '42vw' },
  night: { x: 0.73, y: 0.23, core: 'rgba(226,232,255,.5)', mid: 'rgba(140,160,255,.16)', water: '186,204,255', wide: '30vw' },
  watch: { x: 0.80, y: 0.39, core: 'rgba(255,190,150,.62)', mid: 'rgba(255,70,110,.28)', water: '255,170,160', wide: '46vw' },
  listen: { x: 0.80, y: 0.44, core: 'rgba(230,255,190,.5)', mid: 'rgba(80,200,120,.2)', water: '190,240,170', wide: '40vw' },
  play: { x: 0.71, y: 0.31, core: 'rgba(220,210,255,.48)', mid: 'rgba(150,80,255,.2)', water: '190,170,255', wide: '36vw' },
  money: { x: 0.81, y: 0.40, core: 'rgba(255,220,160,.55)', mid: 'rgba(40,180,160,.2)', water: '170,230,190', wide: '42vw' },
  info: { x: 0.81, y: 0.30, core: 'rgba(255,250,235,.42)', mid: 'rgba(180,210,255,.16)', water: '210,230,255', wide: '34vw' },
  notes: { x: 0.73, y: 0.40, core: 'rgba(255,186,110,.66)', mid: 'rgba(255,90,30,.26)', water: '255,170,110', wide: '46vw' },
  search: { x: 0.78, y: 0.42, core: 'rgba(190,230,255,.4)', mid: 'rgba(60,120,255,.18)', water: '160,210,255', wide: '36vw' }
};

const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
const arts = () => document.querySelector('#arts');

let root;
let cloud;
let bloom;
let shimmer;
let ctx;
let mx = 0;
let my = 0;
let look = LOOK.evening;
let shown = '';
let token = 0;
let raf = 0;
let preloaded = false;

function ensure() {
  if (root) return;
  root = document.createElement('div');
  root.className = 'art on';
  cloud = document.createElement('img');
  cloud.className = 'clouds';
  cloud.alt = '';
  cloud.decoding = 'async';
  cloud.src = 'img/sky-clouds.webp';
  bloom = document.createElement('div');
  bloom.className = 'bloom';
  shimmer = document.createElement('canvas');
  shimmer.className = 'shimmer';
  shimmer.width = 640;
  shimmer.height = 180;
  ctx = shimmer.getContext('2d', { alpha: true });
  root.append(cloud, bloom, shimmer);
  arts().appendChild(root);
  if (motion) loop(performance.now());
  else drawWater(0);
}

function placeBloom(next) {
  look = next;
  bloom.style.left = `${next.x * 100}%`;
  bloom.style.top = `${next.y * 100}%`;
  bloom.style.width = next.wide;
  bloom.style.height = next.wide;
  bloom.style.background = `radial-gradient(circle, ${next.core} 0%, ${next.mid} 34%, transparent 70%)`;
}

function drawWater(now) {
  if (!ctx) return;
  const w = shimmer.width;
  const h = shimmer.height;
  ctx.clearRect(0, 0, w, h);
  const sunx = look.x * w;
  const [r, g, b] = look.water.split(',').map(Number);
  for (let i = 0; i < 16; i += 1) {
    const y = (i + 0.5) / 16 * h;
    const sway = Math.sin(now * 0.0014 + i * 0.7) * (10 + i);
    const x = sunx + sway;
    const alpha = (0.05 + (1 - i / 16) * 0.09) * (0.75 + 0.25 * Math.sin(now * 0.002 + i));
    const grad = ctx.createLinearGradient(x - 90, y, x + 90, y);
    grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
    grad.addColorStop(0.5, `rgba(${r},${g},${b},${alpha.toFixed(3)})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(x - 90, y - 1.2, 180, 2.4);
  }
}

function applyMove(now) {
  const slide = motion ? (now * 0.01) % 160 : 0;
  const px = (-mx * 16).toFixed(1);
  const py = (-my * 8).toFixed(1);
  root.querySelectorAll('.plate').forEach(plate => {
    plate.style.transform = `translate3d(${px}px, ${py}px, 0)`;
  });
  if (cloud) cloud.style.transform = `translate3d(${(-mx * 34 - slide).toFixed(1)}px, ${(-my * 16).toFixed(1)}px, 0)`;
}

function loop(now) {
  raf = requestAnimationFrame(loop);
  if (document.hidden) return;
  applyMove(now);
  drawWater(now);
}

function preloadRest() {
  if (preloaded) return;
  preloaded = true;
  const urls = [...new Set(Object.values(PLATES))];
  let index = 0;
  const step = () => {
    if (index >= urls.length) return;
    const url = urls[index];
    index += 1;
    if (url !== shown) {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
    }
    const wait = window.requestIdleCallback || (fn => setTimeout(fn, 240));
    wait(step);
  };
  setTimeout(step, 600);
}

export function setArt(key) {
  ensure();
  const next = LOOK[key] || LOOK.evening;
  const url = PLATES[key] || PLATES.evening;
  placeBloom(next);
  if (!motion) drawWater(0);
  if (url === shown) return;
  const mine = ++token;
  const img = new Image();
  img.className = 'plate';
  img.alt = '';
  img.decoding = 'async';
  if (!shown) img.fetchPriority = 'high';
  let opened = false;
  const reveal = () => {
    if (opened) return;
    if (mine !== token) {
      img.remove();
      return;
    }
    opened = true;
    img.classList.add('on');
    root.querySelectorAll('.plate').forEach(node => {
      if (node !== img) node.classList.remove('on');
    });
    shown = url;
    setTimeout(() => {
      if (mine !== token) return;
      root.querySelectorAll('.plate').forEach(node => {
        if (node !== img) node.remove();
      });
    }, 1300);
    preloadRest();
  };
  img.addEventListener('load', reveal, { once: true });
  img.addEventListener('error', reveal, { once: true });
  root.insertBefore(img, cloud);
  img.src = url;
  if (img.complete && img.naturalWidth) reveal();
}

export function bindParallax() {
  if (!motion) return;
  addEventListener('mousemove', event => {
    mx = event.clientX / innerWidth - 0.5;
    my = event.clientY / innerHeight - 0.5;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else if (!raf) raf = requestAnimationFrame(loop);
  });
}
