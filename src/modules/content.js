import info from '../data/info.json';
// Imported (not public/ paths) so Vite bundles them with hashed URLs, like the project images
import contactImageDesktop from '../assets/contactoImgDesk.png';
import contactImageMobile from '../assets/contactoImgMobile.png';

// Reads a nested value with a dot path: get(info, 'work.labels.role') -> 'Role'
const get = (object, path) => path.split('.').reduce((value, key) => value?.[key], object);

// Fills every piece of page text from info.json (projects come from projects.json).
// Shared by index.html and project.html, so blocks that only exist on one page are optional.
export function fillContent() {
  document.title = info.meta.title;
  document.querySelector('meta[name="description"]').content = info.meta.description;

  // Generic text: <tag data-text="about.heading">
  document.querySelectorAll('[data-text]').forEach((el) => {
    el.textContent = get(info, el.dataset.text) ?? '';
  });

  // Hero title: one line per array item
  const title = document.querySelector('.hero__title');
  title?.replaceChildren(
    ...info.hero.titleLines.flatMap((line, index) => (index ? [document.createElement('br'), line] : [line]))
  );

  document.querySelectorAll('[data-email]').forEach((link) => {
    link.href = `mailto:${info.contact.email}`;
    link.textContent = info.contact.email;
  });

  // Contact images: desktop cursor reveal and mobile image (CSS shows only one of them)
  const revealImage = document.querySelector('.contact__reveal-image');
  if (revealImage) revealImage.src = contactImageDesktop;
  const mobileImage = document.querySelector('.contact__mobile-image');
  if (mobileImage) mobileImage.src = contactImageMobile;

  // Skills marquee: two identical groups; the second one is only visual, so screen readers skip it
  const skillsTrack = document.querySelector('[data-skills]');
  const skillsGroup = (hidden) => {
    const list = document.createElement('ul');
    list.className = 'marquee__group';
    if (hidden) list.setAttribute('aria-hidden', 'true');
    info.about.skills.forEach((skill) => {
      const item = document.createElement('li');
      item.className = 'marquee__item';
      item.textContent = skill;
      list.append(item);
    });
    return list;
  };
  skillsTrack?.replaceChildren(skillsGroup(false), skillsGroup(true));

  // mailto: links open the mail app, so only web links get a new tab
  document.querySelectorAll('[data-socials]').forEach((list) => {
    list.innerHTML = info.contact.socials
      .map((s) => {
        const newTab = s.url.startsWith('mailto:') ? '' : ' target="_blank" rel="noopener"';
        return `<li><a href="${s.url}"${newTab}>${s.label}</a></li>`;
      })
      .join('');
  });
}
