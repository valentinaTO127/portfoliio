import { gsap } from 'gsap';

// Shows a 0-100% counter while `tasks` (an array of promises) resolve.
// Resolves once the exit animation has finished.
export function runPreloader(tasks, { reducedMotion }) {
  const root = document.querySelector('.preloader');
  const countEl = root.querySelector('.preloader__count');
  const counter = { value: 0 };
  let loaded = 0;

  return new Promise((resolve) => {
    function exit() {
      gsap.to(root, {
        yPercent: -100,
        duration: reducedMotion ? 0 : 0.9,
        ease: 'expo.inOut',
        onComplete: () => {
          root.remove();
          document.body.classList.remove('is-loading');
          resolve();
        },
      });
    }

    function onTaskDone() {
      loaded += 1;
      const target = (loaded / tasks.length) * 100;
      // Tween the displayed number instead of jumping, so it reads as progress
      gsap.to(counter, {
        value: target,
        duration: reducedMotion ? 0 : 0.6,
        ease: 'power2.out',
        overwrite: true,
        onUpdate: () => {
          countEl.textContent = Math.round(counter.value);
        },
        onComplete: () => {
          if (loaded === tasks.length) exit();
        },
      });
    }

    if (tasks.length === 0) {
      exit();
      return;
    }
    // A failed asset must not block the site: count it as done anyway
    tasks.forEach((task) => Promise.resolve(task).catch(console.warn).finally(onTaskDone));
  });
}
