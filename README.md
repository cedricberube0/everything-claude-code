# Maison des fêtes

A responsive marketing site for **Maison des fêtes** — a quarterly artisan
subscription box from Ottawa-area makers. Built from a Claude design mockup and
inspired by the warm, section-per-colour feel of [gruns.co](https://gruns.co).

Plain HTML, CSS and vanilla JavaScript — no build step, no dependencies.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Semantic page markup |
| `styles.css` | Fluid, responsive styles (CSS custom properties, clamp typography) |
| `script.js` | Interactions + data-driven content (no framework) |
| `assets/logo.png` | House-and-wreath brand mark |

## Running it

It's a static site — open `index.html` in a browser, or serve the folder:

```bash
cd maison-des-fetes
python3 -m http.server 8000
# then visit http://localhost:8000
```

## What's built in

- **Fully responsive** — one, two and three-column layouts collapse cleanly from
  desktop down to 360px; a hamburger menu takes over below 860px.
- **Smooth & professional** — sticky header, scroll-reveal animations, hover
  lifts on cards and buttons, animated "boxes left" meter, live ship countdown.
- **Interactive** — maker selector, FAQ accordion, and newsletter form with
  email validation, all keyboard-accessible.
- **Accessible** — skip link, focus-visible rings, ARIA state on tabs/accordion,
  and `prefers-reduced-motion` support.
- **Robust** — content is readable without JavaScript, and the scripts are
  decoupled from the web-font stylesheet so they never block on a slow font load.

## Customising

- **Season** — set `SEASON` at the top of `script.js` (`Summer` / `Autumn` /
  `Winter` / `Spring`); all season labels update automatically.
- **Content** — makers, box items and FAQs are arrays at the top of `script.js`.
- **Colours & type** — everything lives in the `:root` custom properties in
  `styles.css`.

Copy, prices and imagery are placeholder content from the design mockup — swap in
real photography and text before going live.
