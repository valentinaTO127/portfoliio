import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// About text and skills go from transparent + blurred to sharp, tied to the scroll position (scrub).
// The skills reveal targets .marquee (not its track) so it doesn't clash with the CSS marquee transform.
export function initAboutReveal({ reducedMotion }) {
  if (reducedMotion) return;

  document.querySelectorAll('.about h2, .about p, .skills__heading, .marquee').forEach((el) => {
    gsap.from(el, {
      opacity: 0,
      filter: 'blur(12px)',
      ease: 'power1.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 100%',
        end: 'bottom 55%',
        scrub: true,
      },
    });
  });
}
