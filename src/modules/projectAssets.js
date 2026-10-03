// Every image/video inside src/assets/projects/<folder>/ is picked up at build time.
// Vite resolves each match to its final (hashed) URL, so no paths have to be written by hand.
// Folder names start with the project id padded to 2 digits: "03-video-loop" -> project id 3.
const files = import.meta.glob('../assets/projects/*/*.{jpg,jpeg,png,webp,avif,gif,svg,mp4,webm}', {
  eager: true,
  import: 'default',
});

const VIDEO = /\.(mp4|webm)$/i;
const COVER = /^1\./i; // "1.png" / "1.mp4": the hero the carousel image grows into
const COVER_MOBILE = /^1m\./i; // "1m.png": same hero image for mobile
const THUMB = /^projectImg\./i; // "projectImg.png": carousel image only, never shown on project.html
const pad = (n) => String(n).padStart(2, '0');

// Returns the files of one project id:
// cover / coverMobile / thumb: { url, isVideo } or null.
// gallery: every other file, sorted by its number (2, 3, 4 ... 10), images and videos mixed.
export function getProjectAssets(id) {
  const entries = Object.entries(files)
    .map(([path, url]) => {
      const [folder, name] = path.split('/').slice(-2);
      return { folder, name, url, isVideo: VIDEO.test(name) };
    })
    .filter((file) => file.folder.split('-')[0] === pad(id))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  const cover = entries.find((file) => COVER.test(file.name)) ?? null;
  const coverMobile = entries.find((file) => COVER_MOBILE.test(file.name)) ?? null;
  const thumb = entries.find((file) => THUMB.test(file.name)) ?? null;
  return {
    cover,
    coverMobile,
    thumb,
    gallery: entries.filter((file) => ![cover, coverMobile, thumb].includes(file)),
  };
}

// Image shown in the index carousel (and where the project.html hero starts):
// projectImg -> 1m -> the "image" field in projects.json
export function getCarouselImage(project) {
  const { thumb, coverMobile } = getProjectAssets(project.id);
  return thumb?.url ?? coverMobile?.url ?? project.image;
}
