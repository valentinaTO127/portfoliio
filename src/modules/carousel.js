import * as THREE from 'three';
import { projects } from '../data/projects.js';
import { scrollTo } from './scroll.js';

const lerp = (from, to, amount) => from + (to - from) * amount;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const CLICK_THRESHOLD = 5; // px of movement allowed before a pointerup stops counting as a click

// Scroll-driven WebGL carousel.
// Single source of truth = the page scroll inside the .work section:
// scroll, drag and click all end up moving the scroll, and the carousel follows it.
export function createCarousel(canvas, { onChange, reducedMotion }) {
  const section = document.querySelector('.work');
  const count = projects.length;
  const lastIndex = Math.max(count - 1, 1);
  section.style.height = `${100 + (count - 1) * 70}vh`;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 10;

  const geometry = new THREE.PlaneGeometry(1, 1);
  const meshes = projects.map((project, index) => {
    const material = new THREE.MeshBasicMaterial({ color: 0xe6dfd9, transparent: true });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.index = index;
    scene.add(mesh);
    return mesh;
  });

  // ---------- Layout (world units derived from the visible viewport) ----------
  const layout = { planeW: 1, planeH: 1, spacing: 1, offsetY: 0, viewW: 1 };

  function resize() {
    const { clientWidth: width, clientHeight: height } = canvas;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    const viewH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const viewW = viewH * camera.aspect;
    let planeH = viewH * 0.42;
    let planeW = planeH * 1.5;
    if (planeW > viewW * 0.75) {
      planeW = viewW * 0.75;
      planeH = planeW / 1.5;
    }
    Object.assign(layout, {
      planeW,
      planeH,
      spacing: planeW * 1.15,
      offsetY: viewH * 0.1,
      viewW,
    });
    meshes.forEach((mesh) => mesh.scale.set(planeW, planeH, 1));
  }
  resize();
  window.addEventListener('resize', resize);

  // ---------- Scroll <-> index mapping ----------
  const scrollRange = () => section.offsetHeight - window.innerHeight;
  const scrollForIndex = (index) => section.offsetTop + (index / lastIndex) * scrollRange();

  function indexFromScroll() {
    const progress = clamp((window.scrollY - section.offsetTop) / scrollRange(), 0, 1);
    return progress * lastIndex;
  }

  function goTo(index) {
    scrollTo(scrollForIndex(clamp(index, 0, count - 1)), { duration: 1.2 });
  }

  // ---------- Drag ----------
  const drag = { active: false, startX: 0, startScroll: 0, moved: 0 };

  canvas.addEventListener('pointerdown', (event) => {
    Object.assign(drag, { active: true, startX: event.clientX, startScroll: window.scrollY, moved: 0 });
    canvas.classList.add('is-dragging');
  });

  window.addEventListener('pointermove', (event) => {
    if (!drag.active) return;
    const dx = event.clientX - drag.startX;
    drag.moved = Math.max(drag.moved, Math.abs(dx));
    // Convert horizontal pixels into "how many projects", then into scroll pixels
    const spacingPx = (layout.spacing / layout.viewW) * canvas.clientWidth;
    const scrollPerIndex = scrollRange() / lastIndex;
    scrollTo(drag.startScroll - (dx / spacingPx) * scrollPerIndex, { immediate: true });
  });

  function endDrag(event) {
    if (!drag.active) return;
    drag.active = false;
    canvas.classList.remove('is-dragging');
    // pointercancel = the browser took over (e.g. vertical touch scroll): don't fight it
    if (event.type === 'pointercancel') return;
    if (drag.moved < CLICK_THRESHOLD) handleClick(event);
    else goTo(Math.round(state.target)); // snap to the nearest project
  }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  // ---------- Click (raycasting) ----------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function handleClick(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const [hit] = raycaster.intersectObjects(meshes);
    if (!hit) return;
    const clicked = hit.object.userData.index;
    const active = Math.round(state.current);
    // Clicking the active image advances to the next one (loops at the end)
    goTo(clicked === active ? (active + 1) % count : clicked);
  }

  // ---------- Keyboard ----------
  window.addEventListener('keydown', (event) => {
    if (!state.visible) return;
    if (event.key === 'ArrowRight') goTo(Math.round(state.target) + 1);
    if (event.key === 'ArrowLeft') goTo(Math.round(state.target) - 1);
  });

  // ---------- Render loop ----------
  const state = { current: 0, target: 0, activeIndex: -1, visible: false };

  function tick() {
    state.target = indexFromScroll();
    state.current = lerp(state.current, state.target, reducedMotion ? 1 : 0.1);

    meshes.forEach((mesh, index) => {
      const offset = index - state.current;
      const distance = Math.abs(offset);
      mesh.position.set(offset * layout.spacing, layout.offsetY, -distance * 0.8);
      mesh.rotation.y = -offset * 0.2;
      mesh.material.opacity = clamp(1 - distance * 0.35, 0.15, 1);
    });

    const activeIndex = Math.round(state.current);
    if (activeIndex !== state.activeIndex) {
      state.activeIndex = activeIndex;
      onChange(activeIndex);
    }
    renderer.render(scene, camera);
  }

  // Only render while the section is on screen
  new IntersectionObserver(([entry]) => {
    state.visible = entry.isIntersecting;
    renderer.setAnimationLoop(state.visible ? tick : null);
  }).observe(section);

  onChange(0);
  state.activeIndex = 0;

  return {
    // One promise per texture so the preloader can count them
    loadTextures() {
      const loader = new THREE.TextureLoader();
      return projects.map((project, index) =>
        loader.loadAsync(project.image).then((texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          const { material } = meshes[index];
          material.map = texture;
          material.color.set(0xffffff);
          material.needsUpdate = true;
        })
      );
    },
  };
}

// HTML fallback for browsers without WebGL: horizontal snap list of <img>
export function createFallback(container, { onChange }) {
  const section = document.querySelector('.work');
  section.style.height = '100svh';
  document.querySelector('.work__canvas').hidden = true;
  container.hidden = false;
  container.innerHTML = projects
    .map((p, i) => `<img src="${p.image}" alt="${p.title}" data-index="${i}" loading="lazy" />`)
    .join('');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) onChange(Number(entry.target.dataset.index));
      });
    },
    { root: container, threshold: 0.6 }
  );
  container.querySelectorAll('img').forEach((img) => observer.observe(img));
  onChange(0);
}
