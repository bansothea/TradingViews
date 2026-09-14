# Static assets

Served from the site root, so `public/brand/logo.svg` is `/brand/logo.svg`.

| Folder    | Holds                                                            |
| --------- | ---------------------------------------------------------------- |
| `brand/`  | Logo files used outside React (favicon, OG images, emails).       |
| `images/` | Page artwork (auth hero, marketing illustrations).                |

Conventions:

- **Logo in the UI** comes from `src/components/brand/logo.tsx`, not from this
  folder — the inline SVG inherits color and size and never flashes on load.
  `brand/logo.svg` is the same mark for contexts that need a real file; keep
  the two in sync.
- **Reference images through `next/image`** so they are sized and lazy-loaded.
- **Fonts are not here.** They are loaded in `src/lib/fonts.ts` via
  `next/font`, which self-hosts and preloads them automatically.
- `images/auth-hero.svg` is placeholder artwork. Dropping in a photograph is a
  two-line change: add the file here and point `AuthShell` at it (use `.jpg`
  or `.webp`, roughly 1200×1600, and keep it under ~300 KB).
