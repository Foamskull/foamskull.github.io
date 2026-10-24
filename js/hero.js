import { bus } from './bus.js';

export async function mountHero(canvas) {
  let THREE;
  try {
    THREE = await import('three');
  } catch {
    canvas.parentElement.classList.add('fallback');
    return { stop() {}, setAccent() {} };
  }
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    canvas.parentElement.classList.add('fallback');
    return { stop() {}, setAccent() {} };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  camera.position.set(0, 0.15, 6.4);
  scene.add(new THREE.AmbientLight(0xfff6ee, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3.2, 4.4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xb9c6ff, 1.1);
  rim.position.set(-4, -1, -2);
  scene.add(rim);

  const accent = new THREE.Color(bus.accent);
  const group = new THREE.Group();
  scene.add(group);
  const stone = new THREE.MeshStandardMaterial({
    color: accent,
    metalness: 0.42,
    roughness: 0.18,
    emissive: accent,
    emissiveIntensity: 0.16
  });
  const pearl = new THREE.MeshStandardMaterial({
    color: 0xf4efe6,
    metalness: 0.08,
    roughness: 0.28,
    emissive: accent,
    emissiveIntensity: 0.05
  });
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xf7f4ee,
    metalness: 0.7,
    roughness: 0.22,
    emissive: accent,
    emissiveIntensity: 0.2
  });
  const pebble = new THREE.Mesh(new THREE.SphereGeometry(0.95, 48, 32), stone);
  pebble.scale.set(1.15, 0.78, 0.92);
  group.add(pebble);
  const small = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 24), pearl);
  small.position.set(1.55, 0.35, 0.25);
  group.add(small);
  const tiny = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 18), pearl);
  tiny.position.set(-1.35, -0.42, 0.45);
  group.add(tiny);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.035, 16, 96), ringMat);
  ring.rotation.x = 1.15;
  group.add(ring);

  let frame = 0;
  let running = true;
  function resize() {
    const width = canvas.clientWidth || 320;
    const height = canvas.clientHeight || 240;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
  }
  function draw(now) {
    const t = (now || 0) / 1000;
    const spin = bus.motion ? t * 0.28 : 0.6;
    group.rotation.y = spin;
    group.rotation.x = Math.sin(spin * 0.7) * 0.12;
    ring.rotation.z = spin * 0.8;
    small.position.y = 0.35 + Math.sin(t * 0.9) * 0.08 * bus.motion;
    stone.emissiveIntensity = 0.14 + bus.pulse * 0.9;
    ringMat.emissiveIntensity = 0.18 + bus.pulse * 1.1;
    renderer.render(scene, camera);
  }
  function loop(now) {
    if (!running) return;
    draw(now);
    if (bus.motion) frame = requestAnimationFrame(loop);
    else frame = 0;
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas.parentElement);
  resize();
  draw(0);
  if (bus.motion) loop(0);
  return {
    setAccent(hex) {
      accent.set(hex);
      stone.color.copy(accent);
      stone.emissive.copy(accent);
      ringMat.emissive.copy(accent);
      pearl.emissive.copy(accent);
      if (!bus.motion) draw(0);
    },
    kick() {
      if (bus.motion && !frame) loop(performance.now());
    },
    stop() {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
      stone.dispose();
      pearl.dispose();
      ringMat.dispose();
    }
  };
}
