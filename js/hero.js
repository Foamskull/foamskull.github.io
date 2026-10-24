import { bus } from './bus.js';

export async function mountHero(canvas) {
  const stage = canvas.parentElement;
  let THREE;
  try {
    THREE = await import('three');
  } catch {
    stage.classList.add('fallback');
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
    stage.classList.add('fallback');
    return { stop() {}, setAccent() {}, kick() {} };
  }
  renderer.setClearColor(0x07080a, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x07080a, 9, 18);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 40);
  camera.position.set(5.2, 4.1, 6.4);

  const accent = new THREE.Color(bus.accent || '#ffb000');
  const teal = new THREE.Color('#1f6f62');
  scene.add(new THREE.AmbientLight(0xffe2a8, 0.35));
  const key = new THREE.DirectionalLight(accent, 1.4);
  key.position.set(4, 6, 3);
  scene.add(key);

  const model = new THREE.Group();
  scene.add(model);
  const grid = new THREE.GridHelper(11, 16, 0x2f6f60, 0x14332c);
  model.add(grid);

  const heights = [0.32, 0.55, 0.85, 1.15, 1.6, 2.15];
  const geos = heights.map(h => new THREE.BoxGeometry(0.68, h, 0.68));
  const cityMat = new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0.9 });
  const city = new THREE.Group();
  for (let x = -3; x <= 3; x++) {
    for (let z = -3; z <= 3; z++) {
      if (Math.abs(x) === 3 && Math.abs(z) === 3) continue;
      const index = Math.abs((x * 5 + z * 3 + 12) % heights.length);
      const h = heights[index];
      const block = new THREE.Mesh(geos[index], cityMat);
      block.position.set(x * 0.92, h / 2, z * 0.92);
      city.add(block);
    }
  }
  model.add(city);

  const hullMat = new THREE.MeshBasicMaterial({ color: 0x7dffe0, wireframe: true });
  const hull = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.28, 0.55), hullMat);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 4), hullMat);
  nose.rotation.z = -Math.PI / 2;
  nose.position.x = 1.45;
  const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 1.35), hullMat);
  wingL.position.set(-0.2, 0, 0);
  hull.add(body, nose, wingL);
  hull.position.set(1.4, 1.7, -1.2);
  hull.rotation.y = 0.5;
  model.add(hull);

  const scan = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(3.15, 3.24, 72),
    new THREE.MeshBasicMaterial({ color: accent, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
  );
  ring.rotation.x = -Math.PI / 2;
  const arm = new THREE.Mesh(
    new THREE.PlaneGeometry(3.15, 0.045),
    new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
  );
  arm.rotation.x = -Math.PI / 2;
  arm.position.set(1.55, 0.02, 0);
  scan.add(ring, arm);
  model.add(scan);

  const dustCount = 140;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 10;
    dustPos[i * 3 + 1] = Math.random() * 3.2;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 10;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: accent,
    size: 0.035,
    transparent: true,
    opacity: 0.7,
    depthWrite: false
  });
  model.add(new THREE.Points(dustGeo, dustMat));

  const look = { x: 0, y: 0 };
  let frame = 0;
  let running = true;

  function resize() {
    const width = Math.max(stage.clientWidth || 320, 10);
    const height = Math.max(stage.clientHeight || 240, 10);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function draw(now) {
    const t = (now || 0) / 1000;
    const motion = bus.motion;
    look.x += ((bus.lookX || 0) - look.x) * (motion ? 0.08 : 1);
    look.y += ((bus.lookY || 0) - look.y) * (motion ? 0.08 : 1);
    const portrait = camera.aspect < 1.05;
    camera.position.set(portrait ? 0.2 : 5.1, 3.6 - look.y * 0.4, portrait ? 8.2 : 6.3);
    camera.lookAt(0, 0.7, 0);
    model.rotation.y = (motion ? t * 0.12 : 0.4) + look.x * 0.35;
    scan.rotation.y = motion ? t * 0.7 : 0.8;
    hull.position.y = 1.65 + Math.sin(t * 0.8) * 0.08 * motion;
    const pulse = bus.pulse || 0;
    cityMat.opacity = 0.78 + pulse * 0.22;
    ring.material.opacity = 0.45 + pulse * 0.5;
    key.intensity = 1.1 + pulse * 1.6;
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
  observer.observe(stage);
  resize();
  draw(0);
  if (bus.motion) loop(performance.now());
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && bus.motion && running && !frame) loop(performance.now());
  });

  return {
    setAccent(hex) {
      accent.set(hex);
      cityMat.color.copy(accent);
      ring.material.color.copy(accent);
      arm.material.color.copy(accent);
      dustMat.color.copy(accent);
      key.color.copy(accent);
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
      geos.forEach(geo => geo.dispose());
      cityMat.dispose();
      hullMat.dispose();
      body.geometry.dispose();
      nose.geometry.dispose();
      wingL.geometry.dispose();
      ring.geometry.dispose();
      ring.material.dispose();
      arm.geometry.dispose();
      arm.material.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      grid.geometry?.dispose?.();
      teal.set('#000');
    }
  };
}
