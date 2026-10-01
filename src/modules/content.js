import info from '../data/info.json';

// Reads a nested value with a dot path: get(info, 'work.labels.role') -> 'Role'
const get = (object, path) => path.split('.').reduce((value, key) => value?.[key], object);

// Fills every piece of page text from info.json (projects come from projects.json)
export function fillContent() {
  document.title = info.meta.title;
  document.querySelector('meta[name="description"]').content = info.meta.description;

  // Generic text: <tag data-text="about.heading">
  document.querySelectorAll('[data-text]').forEach((el) => {
    el.textContent = get(info, el.dataset.text) ?? '';
  });

  // Hero title: one line per array item
  const title = document.querySelector('.hero__title');
  title.replaceChildren(
    ...info.hero.titleLines.flatMap((line, index) => (index ? [document.createElement('br'), line] : [line]))
  );

  document.querySelectorAll('[data-email]').forEach((link) => {
    link.href = `mailto:${info.contact.email}`;
    link.textContent = info.contact.email;
  });

  document.querySelectorAll('[data-socials]').forEach((list) => {
    list.innerHTML = info.contact.socials
      .map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${s.label}</a></li>`)
      .join('');
  });
}
