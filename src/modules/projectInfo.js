import { gsap } from 'gsap';
import { projects } from '../data/projects.js';

export function createProjectInfo(root) {
  const indexEl = root.querySelector('.project-info__index');
  const titleEl = root.querySelector('.project-info__title');
  const field = (name) => root.querySelector(`[data-field="${name}"]`);
  const fields = {
    role: field('role'),
    date: field('date'),
    category: field('category'),
    about: field('about'),
    url: field('url'),
  };
  let currentIndex = -1;

  function render(index) {
    const project = projects[index];
    const pad = (n) => String(n).padStart(2, '0');
    indexEl.textContent = `${pad(index + 1)} / ${pad(projects.length)}`;
    titleEl.textContent = project.title;
    fields.role.textContent = project.role;
    fields.date.textContent = project.date;
    fields.category.textContent = project.category;
    fields.about.textContent = project.about;
    fields.url.href = project.url;
  }

  return {
    show(index) {
      if (index === currentIndex) return;
      const isFirst = currentIndex === -1;
      currentIndex = index;
      if (isFirst) {
        render(index);
        return;
      }
      const items = root.children;
      gsap.killTweensOf(items);
      gsap
        .timeline()
        .to(items, { opacity: 0, y: -8, duration: 0.15, ease: 'power1.in' })
        .add(() => render(index))
        .to(items, { opacity: 1, y: 0, duration: 0.35, stagger: 0.03, ease: 'power3.out' });
    },
  };
}
