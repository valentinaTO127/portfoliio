import './styles/main.css';
import { gsap } from 'gsap';
import { initNav } from './modules/nav.js';
import { initScroll, scrollTo } from './modules/scroll.js';
import { runPreloader } from './modules/preloader.js';
import { initHero } from './modules/hero.js';
import { createCarousel, createFallback } from './modules/carousel.js';
import { createProjectInfo } from './modules/projectInfo.js';
import { fillContent } from './modules/content.js';
import { initAboutReveal } from './modules/aboutReveal.js';
import { initContactReveal } from './modules/contactReveal.js';

// The preloader runs on every direct load, so always start at the top
history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

async function init() {
  fillContent();
  initNav();

  const info = createProjectInfo(document.querySelector('.project-info'));
  const onChange = (index) => info.show(index);
  const tasks = [document.fonts.ready];
  let carousel = null;

  if (hasWebGL()) {
    initHero(document.querySelector('.hero__canvas'), { reducedMotion });
    carousel = createCarousel(document.querySelector('.work__canvas'), { onChange, reducedMotion });
    tasks.push(...carousel.loadTextures());
  } else {
    createFallback(document.querySelector('.work__fallback'), { onChange });
  }

  await runPreloader(tasks, { reducedMotion });
  initScroll({ reducedMotion });
  initAboutReveal({ reducedMotion });
  initContactReveal({ reducedMotion });

  // Coming back from project.html (./?project=2#work): land on that same project in the carousel
  if (location.hash === '#work') {
    const projectIndex = Number(new URLSearchParams(location.search).get('project')) || 0;
    if (carousel) carousel.jumpTo(projectIndex);
    else scrollTo('#work', { immediate: true });
  }

  // Lines grow from their center, then the CSS transition fades their color
  const lines = document.querySelector('.hero__lines');
  lines.classList.add('is-drawn');

  if (!reducedMotion) {
    gsap.from('.hero__lines-vertical', { scaleY: 0, duration: 1.6, ease: 'power2.out' });
    gsap.from('.hero__lines-horizontal', { scaleX: 0, duration: 1.6, ease: 'power2.out' });
    gsap.from('.hero__title, .hero__subtitle', {
      yPercent: 40,
      opacity: 0,
      duration: 1.2,
      stagger: 0.1,
      ease: 'expo.out',
    });
    gsap.from('.header > *', { opacity: 0, y: -10, duration: 0.8, stagger: 0.05, delay: 0.2 });
  }
}

init();
