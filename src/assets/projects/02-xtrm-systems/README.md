# XTRM Systems — files

Drop this project's files here. They show up automatically (no code changes).

| File | Where it appears |
|---|---|
| `1.png` (or .jpg / .webp) | `project.html?id=2` hero: the image the carousel image grows into (desktop), at its own aspect ratio |
| `1.mp4` | Same, for video projects. On a portrait phone it is shown rotated 90° in fullscreen, after a "Rotate your phone" screen |
| `1m.png` | Mobile version of `1.png` (< 768px). Optional: without it, mobile uses `1` |
| `projectImg.png` | Index carousel image only (never shown on `project.html`) |
| `2`, `3`, `4` … | Gallery below the hero, in number order. Images and videos can be mixed |

- Carousel image: `projectImg` → `1m` → the `"image"` field in `projects.json`.
- Accepted: jpg, jpeg, png, webp, avif, gif, svg, mp4, webm (videos play muted in a loop).
- Keep the folder name prefix (`02-`): it links the folder to the project with `"id": 2` in `projects.json`.
