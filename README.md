# PØLÆRIS

The PØLÆRIS robotics site pairs a scroll-controlled short film with the team roster, NRL story, and sponsorship pitch. Open index.html directly or serve the directory with a static HTTP server. There are no dependencies or build steps; fonts (Space Grotesk, JetBrains Mono) load from Google Fonts.

## Film

The film is drawn entirely in `film.js` on a canvas, in the PØLÆRIS palette of gold, blue, black and white:

- **Opening plate** – an original circuit tree on a hill under a gold horizon, with a perspective grid, constellation and Polaris flare. It is painted once per viewport size into an offscreen canvas (capped at 4096 px wide), and power pulses race up the trunk traces as you scroll.
- **Monitor plate** – a vector monitor with gold corner brackets, LED desk edge and holographic NAV/TRK panels that boot up as the camera pulls back. Because it is vector, it stays sharp at every zoom.
- Starfield, breach, fragment flight and the gold reticle resolve into the full-colour compass.

No photographic plates are shipped; the only images are `assets/compass.png` and `assets/compass-large.jpg`.

## Site motion

`site.js` handles the scroll progress bar, the auto-revealing nav with active-section tracking, the film HUD (scene label + timecode), scroll reveals and heading wipes, text decode, stat counters, card spotlight and 3D tilt, the magnetic CTA and the reticle cursor. CSS adds the ticker, rotating compass rings, radar sweep, drifting blueprint grid, button shimmer, border trace, glitch title and twinkling backdrop. Everything respects `prefers-reduced-motion`.

## Before going live

Replace the placeholder sponsor address `team@example.com` in `index.html` with the team's real contact email.

Vercel serves the GitHub main branch using the Other preset and repository root.
