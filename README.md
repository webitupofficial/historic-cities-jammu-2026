# Historic Cities Series 2026 — Jammu Edition

Static site: `index.html`, `styles.css`, `script.js`. No build step, no dependencies.

## Editing content

All text lives in `index.html`. Search for `EDIT:` comments for partners, gallery photos, team and contact email. Dates currently read "To be announced" — search for that phrase to fill them in.

To add photos, place optimised `.webp` files in an `images/` folder and follow the `EDIT:` notes.

## Preview locally

```bash
npx serve .
```

## Deploy

Pushes to `main` deploy automatically once the repository is connected to a Vercel project.
