import { bus } from './bus.js';

function glowTexture(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,.95)');
  grd.addColorStop(0.35, 'rgba(255,255,255,.28)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export async function mountHero(canvas) {
  const world = canvas.parentElement;
  let THREE;
  try {
    THREE = await import('three');
  } catch {
    world.classList.add('fallback');
    return { stop() {}, setAccent() {}, kick() {} };
  }
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
  } catch {
    world.classList.add('fallback');
    return { stop() {}, setAccent() {}, kick() {} };
  }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
  camera.position.set(0, 0.15, 7.6);

  const accent = new THREE.Color(bus.accent);
  scene.add(new THREE.AmbientLight(0xf7f5ff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.PointLight(accent, 18, 12, 2);
  rim.position.set(1.6, 0.4, 1.2);
  scene.add(rim);

  const count = window.innerWidth < 720 ? 480 : 960;
  const bases = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    bases[i * 3] = (Math.random() - 0.5) * 18;
    bases[i * 3 + 1] = (Math.random() - 0.5) * 10;
    bases[i * 3 + 2] = (Math.random() - 0.5) * 8;
    seeds[i] = Math.random();
  }
  const pointsGeo = new THREE.BufferGeometry();
  pointsGeo.setAttribute('position', new THREE.BufferAttribute(bases.slice(), 3));
  const pointsMat = new THREE.PointsMaterial({
    color: accent,
    size: 0.042,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });
  const points = new THREE.Points(pointsGeo, pointsMat);
  scene.add(points);

  const texture = glowTexture(THREE);
  const hazeMat = new THREE.SpriteMaterial({
    map: texture,
    color: accent,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.55
  });
  const haze = new THREE.Sprite(hazeMat);
  haze.scale.set(7.5, 7.5, 1);
  haze.position.set(1.5, 0.1, -1.4);
  scene.add(haze);
  const shaftMat = hazeMat.clone();
  shaftMat.opacity = 0.28;
  const shaft = new THREE.Sprite(shaftMat);
  shaft.scale.set(2.2, 8.5, 1);
  shaft.position.set(2.4, 0.2, -0.6);
  scene.add(shaft);

  const group = new THREE.Group();
  group.position.set(1.7, 0.05, 0);
  scene.add(group);
  const glass = new THREE.MeshStandardMaterial({
    color: 0xf4f7fb,
    metalness: 0.72,
    roughness: 0.12,
    emissive: accent,
    emissiveIntensity: 0.28,
    transparent: true,
    opacity: 0.72
  });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.78, 0), glass);
  group.add(core);
  const wire = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.08, 0),
    new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0.55 })
  );
  group.add(wire);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xf7f8fb, transparent: true, opacity: 0.82 });
  const rings = [[1.15, 0.15, 0.2], [0.35, 1.05, 0.4], [0.9, 0.4, 1.15]].map(rot => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.38, 0.012, 12, 96), ringMat);
    ring.rotation.set(rot[0], rot[1], rot[2]);
    group.add(ring);
    return ring;
  });

  const look = { x: 0, y: 0 };
  let frame = 0;
  let running = true;

  function resize() {
    const width = world.clientWidth || window.innerWidth;
    const height = world.clientHeight || window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
  }

  function flow(t) {
    const arr = pointsGeo.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const seed = seeds[i];
      const wave = t * 0.22 + seed * 6.283;
      arr[i3] = bases[i3] + Math.sin(wave + bases[i3 + 1] * 0.35) * 0.38;
      arr[i3 + 1] = bases[i3 + 1] + Math.cos(wave * 0.8 + bases[i3] * 0.2) * 0.28;
      arr[i3 + 2] = bases[i3 + 2] + Math.sin(wave * 0.55) * 0.22;
    }
    pointsGeo.attributes.position.needsUpdate = true;
  }

  function draw(now) {
    const t = (now || 0) / 1000;
    const motion = bus.motion;
    look.x += ((bus.lookX || 0) - look.x) * (motion ? 0.06 : 1);
    look.y += ((bus.lookY || 0) - look.y) * (motion ? 0.06 : 1);
    const portrait = camera.aspect < 1.05;
    group.position.x = (portrait ? 0 : 1.65) + look.x * 0.45;
    group.position.y = (portrait ? -0.15 : 0.05) - look.y * 0.28;
    const spin = motion ? t * 0.22 : 0.5;
    group.rotation.y = spin + look.x * 0.9;
    group.rotation.x = look.y * 0.55 + Math.sin(spin) * 0.08 * motion;
    rings[0].rotation.z = spin * 0.7;
    rings[1].rotation.x = 0.35 + spin * 0.4;
    wire.rotation.y = -spin * 0.6;
    const pulse = bus.pulse || 0;
    glass.emissiveIntensity = 0.22 + pulse * 1.35;
    pointsMat.size = 0.038 + pulse * 0.06;
    haze.scale.setScalar(7.2 + pulse * 1.6 + Math.sin(t * 0.6) * 0.15 * motion);
    rim.intensity = 14 + pulse * 22;
    if (motion) flow(t);
    renderer.render(scene, camera);
  }

  function loop(now) {
    if (!running) return;
    if (document.hidden || !bus.motion) {
      frame = 0;
      return;
    }
    draw(now);
    frame = requestAnimationFrame(loop);
  }

  const observer = new ResizeObserver(resize);
  observer.observe(world);
  resize();
  draw(0);
  if (bus.motion) loop(performance.now());
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && bus.motion && running && !frame) loop(performance.now());
  });

  return {
    setAccent(hex) {
      accent.set(hex);
      pointsMat.color.copy(accent);
      glass.emissive.copy(accent);
      wire.material.color.copy(accent);
      hazeMat.color.copy(accent);
      shaftMat.color.copy(accent);
      rim.color.copy(accent);
      if (!bus.motion) draw(0);
    },
    kick() {
      if (bus.motion && running && !frame) loop(performance.now());
    },
    stop() {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
      pointsGeo.dispose();
      pointsMat.dispose();
      texture.dispose();
      hazeMat.dispose();
      shaftMat.dispose();
      glass.dispose();
      wire.geometry.dispose();
      wire.material.dispose();
      ringMat.dispose();
      rings.forEach(ring => ring.geometry.dispose());
      core.geometry.dispose();
    }
  };
}
