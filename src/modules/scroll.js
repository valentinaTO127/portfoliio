import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Single Lenis instance shared by every module.
// Stays null when the user prefers reduced motion -> native scroll is used.
let lenis = null;

export function initScroll({ reducedMotion }) {
  if (reducedMotion) return;
  lenis = new Lenis({ lerp: 0.1 });
  // Keep ScrollTrigger in sync with Lenis' smoothed scroll
  lenis.on('scroll', ScrollTrigger.update);
  // Drive Lenis with GSAP's ticker so both share the same frame loop
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

// target: number (px), selector string or element
export function scrollTo(target, options = {}) {
  if (lenis) {
    lenis.scrollTo(target, options);
    return;
  }
  const behavior = options.immediate ? 'instant' : 'smooth';
  if (typeof target === 'number') {
    window.scrollTo({ top: target, behavior });
  } else {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    el?.scrollIntoView({ behavior });
  }
}

export function stopScroll() {
  lenis?.stop();
}

export function startScroll() {
  lenis?.start();
}
