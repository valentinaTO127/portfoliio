import { gsap } from 'gsap';
import { scrollTo, stopScroll, startScroll } from './scroll.js';

const DESKTOP = window.matchMedia('(min-width: 768px)');

export function initNav() {
  const burger = document.querySelector('.header__burger');
  const panel = document.querySelector('.mobile-panel');
  let isOpen = false;

  // Paused timeline: play() opens the panel, reverse() closes it
  const timeline = gsap
    .timeline({ paused: true })
    .set(panel, { visibility: 'visible' })
    .to(panel, { clipPath: 'inset(0 0 0% 0)', duration: 0.7, ease: 'expo.inOut' })
    .from(
      panel.querySelectorAll('.mobile-panel__nav a, .mobile-panel__contact'),
      { yPercent: 60, opacity: 0, stagger: 0.06, duration: 0.5, ease: 'power3.out' },
      '-=0.3'
    );

  function toggle(force) {
    isOpen = force ?? !isOpen;
    document.body.classList.toggle('menu-open', isOpen);
    burger.setAttribute('aria-expanded', String(isOpen));
    burger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    panel.setAttribute('aria-hidden', String(!isOpen));
    if (isOpen) {
      stopScroll();
      timeline.play();
    } else {
      startScroll();
      timeline.reverse();
    }
  }

  burger.addEventListener('click', () => toggle());

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen) toggle(false);
  });

  // Close the panel if the viewport grows to desktop while it is open
  DESKTOP.addEventListener('change', (event) => {
    if (event.matches && isOpen) toggle(false);
  });

  // Every in-page link goes through Lenis for smooth scrolling
  document.querySelectorAll('[data-scroll-to]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      if (isOpen) toggle(false);
      const hash = link.getAttribute('href');
      scrollTo(hash === '#hero' ? 0 : hash, { duration: 1.4 });
    });
  });
}
