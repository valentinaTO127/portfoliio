import * as THREE from 'three';
import { projects } from '../data/projects.js';
import { scrollTo } from './scroll.js';
import { getCarouselImage } from './projectAssets.js';

const lerp = (from, to, amount) => from + (to - from) * amount;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const CLICK_THRESHOLD = 5; // px of movement allowed before a pointerup stops counting as a click
const PLANE_RATIO = 3 / 4; // width / height of every project image
const PLANE_GAP = 0.4; // empty space between images, as a fraction of one image's width
const CORNER_RADIUS = 0.03; // rounded corners, as a fraction of the image width

// Relative URL so it also works under the /portfoliio/ base on GitHub Pages
const projectUrl = (project) => `project.html?id=${project.id}`;

// Crops the texture like CSS object-fit: cover, so any image fills the plane without stretching
function coverTexture(texture) {
  const { width, height } = texture.image;
  const imageRatio = width / height;
  if (imageRatio > PLANE_RATIO) {
    texture.repeat.set(PLANE_RATIO / imageRatio, 1);
  } else {
    texture.repeat.set(1, imageRatio / PLANE_RATIO);
  }
  texture.offset.set((1 - texture.repeat.x) / 2, (1 - texture.repeat.y) / 2);
}

// Image plane with rounded corners.
// A plane has no border-radius, so the corners are cut per pixel with a rounded-rectangle
// signed distance field (SDF): d < 0 inside the shape, 0 on the edge, > 0 outside.
function createImageMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uMap: { value: null },
      uUvRepeat: { value: new THREE.Vector2(1, 1) },
      uUvOffset: { value: new THREE.Vector2(0, 0) },
      uPlaceholder: { value: new THREE.Color(0xe6dfd9) },
      uOpacity: { value: 1 },
      uRatio: { value: PLANE_RATIO },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec2 uUvRepeat;
      uniform vec2 uUvOffset;
      uniform vec3 uPlaceholder;
      uniform float uOpacity;
      uniform float uRatio;
      varying vec2 vUv;

      // Rounded rectangle SDF centered at 0 (half size b, corner radius r)
      float roundedBox(vec2 p, vec2 b, float r) {
        vec2 q = abs(p) - b + r;
        return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
      }

      void main() {
        // Work in units of the image width so the radius looks the same on every corner
        vec2 size = vec2(1.0, 1.0 / uRatio);
        vec2 p = (vUv - 0.5) * size;
        float d = roundedBox(p, size * 0.5, ${CORNER_RADIUS.toFixed(3)});

        // Smooth (antialiased) cut at the rounded edge
        float aa = fwidth(d);
        float shape = 1.0 - smoothstep(-aa, aa, d);

        vec3 color = uPlaceholder;
        #ifdef HAS_MAP
          color = texture2D(uMap, vUv * uUvRepeat + uUvOffset).rgb;
        #endif

        gl_FragColor = vec4(color, shape * uOpacity);
        #include <colorspace_fragment>
      }
    `,
  });
}

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
    const material = createImageMaterial();
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
    let planeW = planeH * PLANE_RATIO;
    if (planeW > viewW * 0.75) {
      planeW = viewW * 0.75;
      planeH = planeW / PLANE_RATIO;
    }
    Object.assign(layout, {
      planeW,
      planeH,
      spacing: planeW * (1 + PLANE_GAP),
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
    // Clicking the active image opens its project page; any other image just slides to the center
    if (clicked === active) location.href = projectUrl(projects[clicked]);
    else goTo(clicked);
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
      mesh.material.uniforms.uOpacity.value = clamp(1 - distance * 0.35, 0.15, 1);
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
    // Jumps straight to a project (used when coming back from project.html)
    jumpTo(index) {
      scrollTo(scrollForIndex(clamp(index, 0, count - 1)), { immediate: true });
    },
    // One promise per texture so the preloader can count them
    loadTextures() {
      const loader = new THREE.TextureLoader();
      return projects.map((project, index) =>
        loader.loadAsync(getCarouselImage(project)).then((texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          coverTexture(texture);
          const { material } = meshes[index];
          material.uniforms.uMap.value = texture;
          // coverTexture() crops via repeat/offset; a ShaderMaterial has to apply them itself
          material.uniforms.uUvRepeat.value.copy(texture.repeat);
          material.uniforms.uUvOffset.value.copy(texture.offset);
          material.defines.HAS_MAP = '';
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
    .map(
      (p, i) =>
        `<a href="${projectUrl(p)}"><img src="${getCarouselImage(p)}" alt="${p.title}" data-index="${i}" loading="lazy" /></a>`
    )
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
