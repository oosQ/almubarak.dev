/* almubarak.dev v2 — 3D scene + interactions */
import * as THREE from './three.module.min.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   THREE.JS — "network core" background
   wireframe icosahedron core + node sphere + linked mesh + starfield
   ============================================================ */
(function initScene() {
  const canvas = document.getElementById('scene');
  if (!canvas || !window.WebGLRenderingContext) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (e) { canvas.remove(); return; }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x04080a, 0.055);

  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 7.5);

  const GREEN = new THREE.Color(0x00ff9c);
  const CYAN = new THREE.Color(0x38e1ff);

  const core = new THREE.Group();
  scene.add(core);
  const placeCore = () => { core.position.x = window.innerWidth > 900 ? 2.1 : 0; };
  placeCore();
  window.addEventListener('resize', placeCore);

  // outer wireframe icosahedron
  const outer = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(2.5, 1)),
    new THREE.LineBasicMaterial({ color: GREEN, transparent: true, opacity: 0.16 })
  );
  core.add(outer);

  // inner solid-ish icosahedron
  const inner = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.15, 0)),
    new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.35 })
  );
  core.add(inner);

  // node points on a sphere shell + connecting lines
  const NODE_COUNT = 110;
  const nodePos = new Float32Array(NODE_COUNT * 3);
  const nodeCol = new Float32Array(NODE_COUNT * 3);
  const pts = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    // fibonacci sphere for even spread, jittered radius
    const y = 1 - (i / (NODE_COUNT - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = i * 2.39996;
    const rad = 2.5 + (Math.sin(i * 12.9898) * 0.35);
    const v = new THREE.Vector3(Math.cos(theta) * r * rad, y * rad, Math.sin(theta) * r * rad);
    pts.push(v);
    nodePos.set([v.x, v.y, v.z], i * 3);
    const c = (i % 3 === 0) ? CYAN : GREEN;
    nodeCol.set([c.r, c.g, c.b], i * 3);
  }
  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePos, 3));
  nodeGeo.setAttribute('color', new THREE.BufferAttribute(nodeCol, 3));
  const nodes = new THREE.Points(nodeGeo, new THREE.PointsMaterial({
    size: 0.055, vertexColors: true, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  core.add(nodes);

  // link nearby nodes
  const linkVerts = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    for (let j = i + 1; j < NODE_COUNT; j++) {
      if (pts[i].distanceTo(pts[j]) < 1.15) linkVerts.push(pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z);
    }
  }
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute('position', new THREE.Float32BufferAttribute(linkVerts, 3));
  const links = new THREE.LineSegments(linkGeo, new THREE.LineBasicMaterial({
    color: GREEN, transparent: true, opacity: 0.10, blending: THREE.AdditiveBlending, depthWrite: false
  }));
  core.add(links);

  // starfield drift
  const STARS = 500;
  const starPos = new Float32Array(STARS * 3);
  for (let i = 0; i < STARS; i++) {
    starPos.set([(Math.random() - 0.5) * 46, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30 - 4], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0x9df5d4, size: 0.02, transparent: true, opacity: 0.55, depthWrite: false
  }));
  scene.add(stars);

  // interaction state
  let mx = 0, my = 0, scrollN = 0;
  window.addEventListener('pointermove', (e) => {
    mx = (e.clientX / window.innerWidth) * 2 - 1;
    my = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  window.addEventListener('scroll', () => {
    scrollN = Math.min(window.scrollY / window.innerHeight, 3);
  }, { passive: true });
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();
  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running && !reduceMotion) { clock.getDelta(); loop(); }
  });

  function render() {
    const t = clock.getElapsedTime();
    core.rotation.y = t * 0.08 + scrollN * 0.9;
    core.rotation.x = Math.sin(t * 0.11) * 0.12 + scrollN * 0.25;
    inner.rotation.y = -t * 0.22;
    inner.rotation.z = t * 0.13;
    stars.rotation.y = t * 0.012;

    // parallax + drift camera down/away as user scrolls
    camera.position.x += ((mx * 0.7) - camera.position.x) * 0.04;
    camera.position.y += ((-my * 0.45) - scrollN * 1.4 - camera.position.y) * 0.04;
    camera.position.z = 7.5 + scrollN * 1.6;
    camera.lookAt(0, -scrollN * 1.2, 0);

    const base = window.innerWidth < 720 ? 0.5 : 1;
    const fade = Math.max(0.25, base - scrollN * 0.28);
    renderer.domElement.style.opacity = fade;
    renderer.render(scene, camera);
  }

  function loop() {
    if (!running || reduceMotion) return;
    render();
    requestAnimationFrame(loop);
  }

  if (reduceMotion) { render(); } else { loop(); }
})();

/* ============================================================
   nav scrolled state
   ============================================================ */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 30);
}, { passive: true });

/* ============================================================
   hero terminal typing
   ============================================================ */
(function terminal() {
  const cmdEl = document.getElementById('typed');
  const outEl = document.getElementById('typed-out');
  if (!cmdEl) return;
  const seq = [
    { cmd: 'whoami', out: 'ali_almubarak — full-stack dev · security' },
    { cmd: 'cat stack.txt', out: 'mern · go · .net · flutter' },
    { cmd: 'nmap -sV portfolio.local', out: '<span class="ok">PORT 443/tcp open — all systems hardened ✓</span>' },
    { cmd: 'git push origin main', out: '<span class="ok">deployed → almubarak.dev</span>' },
  ];
  if (reduceMotion) {
    cmdEl.textContent = seq[0].cmd;
    outEl.textContent = 'ali_almubarak — full-stack dev · security';
    return;
  }
  let i = 0;
  async function typeCmd(text) {
    cmdEl.textContent = '';
    for (const ch of text) {
      cmdEl.textContent += ch;
      await new Promise(r => setTimeout(r, 45 + Math.random() * 55));
    }
  }
  async function run() {
    const { cmd, out } = seq[i % seq.length];
    outEl.innerHTML = '';
    await typeCmd(cmd);
    await new Promise(r => setTimeout(r, 350));
    outEl.innerHTML = out;
    await new Promise(r => setTimeout(r, 2600));
    i++;
    run();
  }
  run();
})();

/* ============================================================
   scroll reveal
   ============================================================ */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach((el, idx) => {
  el.style.transitionDelay = `${(idx % 4) * 70}ms`;
  io.observe(el);
});

/* ============================================================
   scramble / decrypt effect on section headings
   ============================================================ */
(function scramble() {
  if (reduceMotion) return;
  const CHARS = '!<>-_\\/[]{}—=+*^?#01';
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      obs.unobserve(e.target);
      const el = e.target, final = el.dataset.text || el.textContent;
      let frame = 0;
      const total = final.length * 3 + 10;
      (function tick() {
        let out = '';
        for (let i = 0; i < final.length; i++) {
          if (i < frame / 3) out += final[i];
          else out += CHARS[Math.floor(Math.random() * CHARS.length)];
        }
        el.textContent = out;
        if (frame++ < total) requestAnimationFrame(tick);
        else el.textContent = final;
      })();
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.scramble').forEach((el) => obs.observe(el));
})();

/* ============================================================
   3D tilt cards
   ============================================================ */
(function tilt() {
  if (reduceMotion || !window.matchMedia('(hover: hover)').matches) return;
  document.querySelectorAll('.tilt').forEach((card) => {
    let raf = null;
    card.addEventListener('pointermove', (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateY(${px * 7}deg) rotateX(${-py * 7}deg) translateY(-3px)`;
        raf = null;
      });
    });
    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
    });
  });
})();

/* ============================================================
   stat counters
   ============================================================ */
(function counters() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      obs.unobserve(e.target);
      const el = e.target, target = +el.dataset.count;
      if (reduceMotion) { el.textContent = target; return; }
      const t0 = performance.now(), dur = 1200;
      (function step(t) {
        const p = Math.min((t - t0) / dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach((el) => obs.observe(el));
})();
