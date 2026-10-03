import './styles/main.css';
import './styles/project.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import info from './data/info.json';
import { projects } from './data/projects.js';
import { fillContent } from './modules/content.js';
import { initScroll } from './modules/scroll.js';
import { createProjectInfo } from './modules/projectInfo.js';
import { getProjectAssets, getCarouselImage } from './modules/projectAssets.js';

gsap.registerPlugin(ScrollTrigger);

// The intro animation assumes the page starts at the top
history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Same media query as the rotated video styles in project.css
const PORTRAIT_PHONE = window.matchMedia('(max-width: 767px) and (orientation: portrait)');

// project.html?id=3 -> the project with "id": 3 in projects.json
const id = Number(new URLSearchParams(location.search).get('id'));
const index = projects.findIndex((project) => project.id === id);

// Videos only play while on screen, so several of them don't download and decode at the same time
const videoObserver = new IntersectionObserver((entries) => {
  entries.forEach(({ target, isIntersecting }) => {
    if (isIntersecting) target.play().catch(() => {});
    else target.pause();
  });
});

function renderGallery(container, gallery, title) {
  container.replaceChildren(
    ...gallery.map((file, i) => {
      if (file.isVideo) {
        const video = document.createElement('video');
        // Muted + playsInline are required for browsers (and iOS) to allow playback without a click
        Object.assign(video, { muted: true, loop: true, playsInline: true, preload: 'metadata', src: file.url });
        video.setAttribute('muted', '');
        videoObserver.observe(video);
        return video;
      }
      const img = document.createElement('img');
      Object.assign(img, { src: file.url, alt: `${title} — ${info.project.imageAlt} ${i + 1}`, loading: 'lazy' });
      return img;
    })
  );
}

// Image center relative to the hero, so `top` can be tweened (the CSS centers it with translate -50%)
function measure(media, hero) {
  const rect = media.getBoundingClientRect();
  const heroTop = hero.getBoundingClientRect().top;
  return { width: rect.width, height: rect.height, top: rect.top - heroTop + rect.height / 2 };
}

function playIntro({ isVideo }) {
  const hero = document.querySelector('.project-hero');
  const media = hero.querySelector('.project-hero__media');
  const cover = hero.querySelector('[data-hero-cover]');
  // Everything from the Work frame except the title fades away
  const extras = [
    ...hero.querySelectorAll('.work__label, .work__hint'),
    ...document.querySelectorAll('.project-info > :not(.project-info__title)'),
  ];
  // The CSS rotates the expanded video (and the title) only on portrait phones
  const expand = () => {
    media.classList.add('is-expanded');
    document.body.classList.toggle('is-video-view', isVideo);
  };
  // Menu-style blend on the title, only once the rest of the project info is gone (see project.css)
  const blendTitle = () => document.body.classList.add('is-title-blend');

  // Video on a portrait phone: the "rotate your phone" screen covers the switch to rotated fullscreen,
  // so there is no size tween here (the start image is hidden behind the hint anyway)
  if (isVideo && PORTRAIT_PHONE.matches) {
    const hint = document.querySelector('.rotate-hint');
    const phone = hint.querySelector('.rotate-hint__phone');
    const motion = reducedMotion ? 0 : 1;
    return gsap
      .timeline()
      .to(extras, { autoAlpha: 0, duration: 0.5 * motion }, 0)
      .to(hint, { autoAlpha: 1, duration: 0.4 * motion }, 0.2 * motion)
      // Counter-clockwise: the video turns clockwise, so that's the way to hold the phone
      .to(phone, { rotation: -90, duration: 0.9 * motion, ease: 'power2.inOut' }, 0.7 * motion)
      .add(() => {
        expand();
        blendTitle();
        gsap.set(cover, { opacity: 1 });
      }, 1.9)
      .to(hint, { autoAlpha: 0, duration: 0.5 * motion }, 2)
      .then();
  }

  if (reducedMotion) {
    expand();
    blendTitle();
    gsap.set(extras, { autoAlpha: 0 });
    gsap.set(cover, { opacity: 1 });
    return Promise.resolve();
  }

  // Measure the start (carousel size) and end (16:9) states from the CSS, then tween between them
  const start = measure(media, hero);
  expand();
  const end = measure(media, hero);

  return gsap
    .timeline()
    .to(extras, { autoAlpha: 0, duration: 0.5, ease: 'power1.out', onComplete: blendTitle }, 0)
    .fromTo(
      media,
      start,
      // clearProps hands control back to the CSS, so the image stays responsive on resize
      { ...end, duration: 1.4, ease: 'expo.inOut', clearProps: 'width,height,top' },
      0.2
    )
    .to(cover, { opacity: 1, duration: 0.9, ease: 'power1.inOut' }, 0.5)
    .then();
}

// Hero video for video projects (1.mp4): replaces the <picture>, muted + inline so it can autoplay
function createHeroVideo(url, picture) {
  const video = document.createElement('video');
  Object.assign(video, { muted: true, loop: true, playsInline: true, src: url });
  video.setAttribute('muted', '');
  video.className = 'project-hero__img';
  video.dataset.heroCover = '';
  picture.replaceWith(video);
  return video;
}

// Resolves once the first frame can be drawn (or fails / takes too long: the intro must not hang)
function videoReady(video, timeout = 5000) {
  if (video.readyState >= 2) return Promise.resolve();
  return new Promise((resolve) => {
    video.addEventListener('loadeddata', resolve, { once: true });
    video.addEventListener('error', resolve, { once: true });
    setTimeout(resolve, timeout);
  });
}

async function init() {
  // Unknown or missing id: go back to the home page
  if (index === -1) {
    location.replace('./');
    return;
  }
  const project = projects[index];
  const { cover, coverMobile, gallery } = getProjectAssets(project.id);

  fillContent();
  document.title = `${project.title} — ${info.name}`;
  // Back link lands on this same project inside the carousel
  document.querySelector('[data-back]').href = `./?project=${index}#work`;
  createProjectInfo(document.querySelector('.project-info')).show(index);

  // Starts with the same image as the carousel; the cover (1.png / 1m.png / 1.mp4) fades in while it grows.
  // No cover yet -> reuse the carousel image
  const startImg = document.querySelector('[data-hero-start]');
  const startUrl = getCarouselImage(project);
  startImg.src = startUrl;
  const media = document.querySelector('.project-hero__media');
  const isVideo = Boolean(cover?.isVideo);
  media.classList.toggle('is-video', isVideo);

  // The expanded box takes the cover's own aspect ratio (--cover-ratio in project.css)
  const setRatio = (width, height) => {
    if (width && height) media.style.setProperty('--cover-ratio', width / height);
  };
  let coverEl;
  let updateCoverRatio;
  let coverLoaded;

  if (isVideo) {
    coverEl = createHeroVideo(cover.url, document.querySelector('.project-hero__media picture'));
    updateCoverRatio = () => setRatio(coverEl.videoWidth, coverEl.videoHeight);
    coverLoaded = videoReady(coverEl);
  } else {
    coverEl = document.querySelector('[data-hero-cover]');
    const coverSource = document.querySelector('[data-hero-cover-mobile]');
    if (coverMobile) coverSource.srcset = coverMobile.url;
    else coverSource.remove(); // no 1m.png -> mobile uses 1.png too
    coverEl.src = cover?.url ?? startUrl;
    coverEl.alt = project.title;
    // Ratio of whichever file <picture> picked; 'load' fires again if a resize crosses the breakpoint
    updateCoverRatio = () => setRatio(coverEl.naturalWidth, coverEl.naturalHeight);
    coverEl.addEventListener('load', updateCoverRatio);
    coverLoaded = coverEl.decode();
  }

  const gallerySection = document.querySelector('[data-gallery]');
  renderGallery(gallerySection, gallery, project.title);

  // A broken file must not block the intro, so failures count as done
  await Promise.allSettled([document.fonts.ready, startImg.decode(), coverLoaded]);
  // The ratio must be known before playIntro() measures the end state
  updateCoverRatio();
  if (isVideo) coverEl.play().catch(() => {});
  await playIntro({ isVideo });

  document.body.classList.remove('is-loading');
  initScroll({ reducedMotion });

  if (!reducedMotion) {
    gallerySection.querySelectorAll('img, video').forEach((item) => {
      gsap.from(item, {
        opacity: 0,
        y: 60,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: item, start: 'top 90%' },
      });
    });
  }
}

init();
