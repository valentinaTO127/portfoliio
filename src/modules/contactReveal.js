import { gsap } from 'gsap';

const RADIUS = 160; // px of the reveal circle when the cursor is far from the email/socials column

// Cursor reveal: the image covers the whole contact section, masked by a circle that follows the cursor.
// Only on desktop width with a real cursor (same query as the CSS); otherwise it's a plain background.
export function initContactReveal({ reducedMotion }) {
  const box = document.querySelector('[data-reveal]');
  if (!box) return;

  const image = box.querySelector('.contact__reveal-image');
  const list = box.querySelector('.contact__list');
  const canHover = window.matchMedia('(min-width: 768px) and (hover: hover) and (pointer: fine)');
  const duration = reducedMotion ? 0 : 0.5;

  // GSAP tweens this plain object; render() copies it into the CSS variables used by the mask
  const circle = { x: 0, y: 0, r: 0 };
  const render = () => {
    image.style.setProperty('--x', `${circle.x}px`);
    image.style.setProperty('--y', `${circle.y}px`);
    image.style.setProperty('--r', `${circle.r}px`);
  };
  const xTo = gsap.quickTo(circle, 'x', { duration, ease: 'power3', onUpdate: render });
  const yTo = gsap.quickTo(circle, 'y', { duration, ease: 'power3', onUpdate: render });
  const rTo = gsap.quickTo(circle, 'r', { duration, ease: 'power3', onUpdate: render });

  // x of the email/socials column's left edge, relative to the section.
  // The image box also ends there (--clip-right), so it can never be drawn over that column.
  let edge = 0;
  const measureEdge = () => {
    const section = box.getBoundingClientRect();
    edge = list.getBoundingClientRect().left - section.left;
    image.style.setProperty('--clip-right', `${section.width - edge}px`);
  };

  // Pointer position relative to the section
  const local = (event) => {
    const rect = box.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  // Full size far from the column; closer than RADIUS, the radius equals the distance to the edge,
  // so the circle shrinks smoothly and reaches 0 right at the column
  const radiusAt = (x) => gsap.utils.clamp(0, RADIUS, edge - x);

  box.addEventListener('pointerenter', (event) => {
    if (!canHover.matches) return;
    measureEdge();
    const { x, y } = local(event);
    // Start the circle where the cursor enters, so it doesn't slide in from the corner
    gsap.set(circle, { x, y, onComplete: render });
    xTo(x);
    yTo(y);
    rTo(radiusAt(x));
  });

  box.addEventListener('pointermove', (event) => {
    if (!canHover.matches) return;
    const { x, y } = local(event);
    xTo(x);
    yTo(y);
    rTo(radiusAt(x));
  });

  box.addEventListener('pointerleave', () => rTo(0));
}
