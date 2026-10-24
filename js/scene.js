const PAL = {
  morning: { sky: ['#1f4fff', '#ff8f86', '#ffd78a'], r: ['#ff7a95', '#c94fd6', '#6a2fc0', '#2b1569'], sun: '#fff3c0', sy: 0.62 },
  afternoon: { sky: ['#0d6bff', '#58c3ff', '#c9f1ff'], r: ['#4fb0ff', '#2f7be0', '#2050aa', '#11285c'], sun: '#fffbe0', sy: 0.3 },
  evening: { sky: ['#2a0b5e', '#ff4f6d', '#ffb35c'], r: ['#d43f7a', '#8a2a8c', '#46186e', '#1c0a3a'], sun: '#ffe08a', sy: 0.7 },
  night: { sky: ['#050a2a', '#1b2470', '#4a3aa8'], r: ['#30307e', '#22225e', '#161642', '#0a0a26'], sun: '#f3f0ff', sy: 0.25 },
  watch: { sky: ['#170033', '#ff2e63', '#ff9a3c'], r: ['#c2145f', '#73106f', '#330848', '#140320'], sun: '#ffd166', sy: 0.66 },
  listen: { sky: ['#003b33', '#18c98b', '#d4ff86'], r: ['#10a374', '#0b7562', '#074b42', '#032824'], sun: '#f1ffc4', sy: 0.5 },
  play: { sky: ['#17004d', '#7b3cff', '#ff6ad5'], r: ['#6326e0', '#41169f', '#260b68', '#12043a'], sun: '#8afcff', sy: 0.58 },
  money: { sky: ['#032a44', '#0fb5a5', '#ffe28a'], r: ['#0e9690', '#086773', '#064456', '#032332'], sun: '#fff4b8', sy: 0.6 },
  info: { sky: ['#0a59d6', '#4fb8ff', '#d2f0ff'], r: ['#3496e6', '#2069bd', '#164c90', '#0c2c5c'], sun: '#fff8d4', sy: 0.34 },
  notes: { sky: ['#401400', '#ff7a2f', '#ffd76b'], r: ['#e85d2c', '#b73c22', '#7c2518', '#401209'], sun: '#fff2c4', sy: 0.64 },
  search: { sky: ['#0a1040', '#3d5bff', '#86f2ff'], r: ['#3049dc', '#2133a3', '#15206e', '#0a1142'], sun: '#e0fcff', sy: 0.4 }
};

function rnd(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function ridge(seed, base, amp, w) {
  const r = rnd(seed);
  const f = [r() * 2 + 1, r() * 3 + 2, r() * 6 + 4];
  const ph = [r() * 6, r() * 6, r() * 6];
  let d = `M-100 1000 L-100 ${base}`;
  for (let x = -100; x <= w + 100; x += 20) {
    const y = base - amp * (Math.sin(x / w * f[0] * 3.1 + ph[0]) * 0.55 + Math.sin(x / w * f[1] * 3.1 + ph[1]) * 0.3 + Math.sin(x / w * f[2] * 3.1 + ph[2]) * 0.15);
    d += ` L${x} ${y.toFixed(1)}`;
  }
  return `${d} L${w + 100} 1000Z`;
}

function trees(seed, base, w, col) {
  const r = rnd(seed);
  let o = '';
  for (let i = 0; i < 46; i += 1) {
    const x = r() * w;
    const hh = 26 + r() * 46;
    const y = base + 8 + r() * 50;
    o += `<path d="M${x} ${y - hh} L${x - hh * 0.28} ${y} L${x + hh * 0.28} ${y}Z" fill="${col}"/>`;
  }
  return o;
}

function art(key, seed) {
  const p = PAL[key] || PAL.evening;
  const W = 1500;
  const H = 960;
  const id = `g${key}${seed}`;
  const sx = W * (0.62 + 0.1 * Math.sin(seed));
  const sy = H * p.sy * 0.6;
  let o = `<svg viewBox="0 0 1500 960" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[0]}"/><stop offset=".6" stop-color="${p.sky[1]}"/><stop offset="1" stop-color="${p.sky[2]}"/></linearGradient><radialGradient id="s${id}"><stop offset="0" stop-color="${p.sun}" stop-opacity=".95"/><stop offset=".25" stop-color="${p.sun}" stop-opacity=".45"/><stop offset="1" stop-color="${p.sun}" stop-opacity="0"/></radialGradient></defs><g class="kb">`;
  o += `<rect width="1500" height="960" fill="url(#${id})"/>`;
  if (key === 'night') {
    const r0 = rnd(seed + 3);
    for (let i = 0; i < 90; i += 1) o += `<circle class="glim" style="animation-delay:-${(r0() * 3).toFixed(2)}s" cx="${r0() * 1500}" cy="${r0() * 500}" r="${r0() * 1.6 + 0.4}" fill="#fff"/>`;
  }
  let rays = '';
  for (let q = 0; q < 16; q += 1) {
    const a0 = q / 16 * 6.283 - 0.06;
    const a1 = q / 16 * 6.283 + 0.06;
    rays += `<path d="M0 0 L${(Math.cos(a0) * 900).toFixed(0)} ${(Math.sin(a0) * 900).toFixed(0)} L${(Math.cos(a1) * 900).toFixed(0)} ${(Math.sin(a1) * 900).toFixed(0)}Z"/>`;
  }
  o += `<g transform="translate(${sx},${sy})"><g class="rays" fill="${p.sun}" opacity=".09">${rays}</g></g>`;
  o += `<circle cx="${sx}" cy="${sy}" r="360" fill="url(#s${id})"/><circle cx="${sx}" cy="${sy}" r="74" fill="${p.sun}"/>`;
  for (let b = 0; b < 3; b += 1) {
    o += `<g class="bird" style="animation-delay:-${b * 6 + seed % 7}s"><g transform="translate(0,${200 + b * 40})"><path class="flap" d="M${b * 30} 0 q8 -8 16 0 q8 -8 16 0" fill="none" stroke="${p.r[3]}" stroke-width="3.5" stroke-linecap="round"/></g></g>`;
  }
  const bases = [560, 640, 730, 830];
  const amps = [150, 120, 90, 60];
  for (let l = 0; l < 4; l += 1) {
    o += `<g class="ly" data-d="${l + 1}"><path d="${ridge(seed * 7 + l * 13 + 1, bases[l], amps[l], W)}" fill="${p.r[l]}"/>${l === 3 ? trees(seed + 9, bases[l] - 30, W, p.r[3]) : ''}${l === 1 ? `<path d="${ridge(seed * 7 + l * 13 + 1, bases[l] + 30, amps[l] * 0.6, W)}" fill="${p.r[l]}" opacity=".55"/>` : ''}</g>`;
    if (l < 3) o += `<rect y="${bases[l] - 40}" width="1500" height="200" fill="${p.sky[2]}" opacity=".09"/>`;
    if (l === 1) {
      o += `<rect y="${bases[2] - 70}" width="1500" height="90" fill="${p.sky[2]}" opacity=".35"/>`;
      const rr = rnd(seed + 5);
      for (let z = 0; z < 26; z += 1) {
        const lx = sx - 180 + rr() * 360;
        const ly = bases[2] - 60 + rr() * 70;
        o += `<rect class="glim" style="animation-delay:-${(rr() * 3).toFixed(2)}s" x="${lx.toFixed(0)}" y="${ly.toFixed(0)}" width="${(20 + rr() * 70).toFixed(0)}" height="3" rx="1.5" fill="${p.sun}" opacity=".8"/>`;
      }
    }
  }
  return `${o}</g></svg>`;
}

const arts = () => document.querySelector('#arts');
let current = null;
let mx = 0;
let my = 0;
let lastKey = '';

function applyParallax() {
  if (!current) return;
  current.querySelectorAll('.ly').forEach(layer => {
    const depth = Number(layer.dataset.d);
    layer.style.transform = `translate(${(-mx * depth * 9).toFixed(1)}px,${(-my * depth * 4).toFixed(1)}px)`;
  });
}

export function setArt(key, seed) {
  const stamp = `${key}:${seed}`;
  if (stamp === lastKey) return;
  lastKey = stamp;
  const node = document.createElement('div');
  node.className = 'art';
  node.innerHTML = art(key, seed);
  arts().appendChild(node);
  requestAnimationFrame(() => requestAnimationFrame(() => node.classList.add('on')));
  if (current) {
    const old = current;
    old.classList.remove('on');
    setTimeout(() => old.remove(), 1200);
  }
  current = node;
  applyParallax();
}

export function bindParallax() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  addEventListener('mousemove', event => {
    mx = event.clientX / innerWidth - 0.5;
    my = event.clientY / innerHeight - 0.5;
    applyParallax();
  });
}
