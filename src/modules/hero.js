import * as THREE from 'three';

export function initHero(canvas, { reducedMotion }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.z = 9;

  // PLACEHOLDER model. When the real .glb exists in /public/models,
  // load it with GLTFLoader (three/addons/loaders/GLTFLoader.js) and add it to `pivot`.
  const pivot = new THREE.Group();
  const model = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1.4, 0.45, 220, 32),
    new THREE.MeshStandardMaterial({ color: 0x7AFAB9, roughness: 0.35, metalness: 0.1 })
  );
  pivot.add(model);
  scene.add(pivot);

  scene.add(new THREE.AmbientLight(0x5555ff, 1.2));
  const light = new THREE.DirectionalLight(0xffffff, 2.5);
  light.position.set(3, 4, 5);
  scene.add(light);

  // Mouse parallax: pointer position tilts the model a little
  const pointer = { x: 0, y: 0 };
  window.addEventListener('pointermove', (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
  });

  function resize() {
    const { clientWidth: width, clientHeight: height } = canvas;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const speed = reducedMotion ? 0 : 0.0004;
  let lastTime = 0;
  function tick(time) {
    const delta = lastTime ? time - lastTime : 16;
    lastTime = time;
    model.rotation.y += delta * speed;
    model.rotation.x += delta * speed * 0.5;
    pivot.rotation.y += (pointer.x * 0.3 - pivot.rotation.y) * 0.05;
    pivot.rotation.x += (pointer.y * 0.2 - pivot.rotation.x) * 0.05;
    renderer.render(scene, camera);
  }

  // Only render while the hero is on screen
  new IntersectionObserver(([entry]) => {
    lastTime = 0;
    renderer.setAnimationLoop(entry.isIntersecting ? tick : null);
  }).observe(canvas);
}
