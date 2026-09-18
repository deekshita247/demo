This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Scroll expansion hero integration

The supplied `ScrollExpandMedia` implementation lives in
`components/ui/scroll-expansion-hero.tsx`. This folder follows the reusable UI
component convention used by shadcn; page-specific gallery components remain in
`components`. The project already includes Next.js, TypeScript, Tailwind CSS v4,
and the `@/*` alias, so no framework reinitialization or shadcn-generated styles
are needed for this component. Global styles remain in `app/globals.css`.
Framer Motion is installed alongside the existing GSAP and Three.js dependencies.

`app/page.tsx` renders the hero before the existing gallery inside one main
landmark. Both use the unchanged six-photo collection from `lib/gallery-images.ts`.
The hero uses photograph 4 in front and photograph 6 as its background.

The supplied progress clamp, completion/content thresholds, wheel multiplier,
directional touch multipliers, split-title translation, image/video branches,
background/overlay Motion animations, and optional children reveal are retained.
The demo wrapper, toggles, and explanatory content are not included.

Integration changes:

- Viewport-based media dimensions, existing fonts/colors, and 5px photo corners.
- Native wheel/touch listeners scoped to the hero and installed once per media
  change. Refs accumulate input and requestAnimationFrame batches React updates.
- Capture only at the hero's top boundary; release on expansion and resume normal
  browser scrolling. Reverse input collapses it when returning to the top.
  The demo's global scroll-to-top listener is removed.
- Responsive Next/Image sources, hero-only preload, lazy gallery photos, and
  WebGL initialization deferred until a canvas approaches the viewport.
- Keyboard expansion, a focus-visible gallery skip link, and reduced-motion
  support without scroll capture.

Validation: `npm run build` and `npm run lint`. For browser checks, scroll or
swipe to expand, continue into the gallery, return to the top and collapse,
then select a stack photo and use the player controls in the photo relay.

## Section 3: photo relay

`components/PhotoRelay.tsx` replaces the old full-size liquid showcase. Section 2
still uses `LiquidImageTransition`; its stack and fullscreen viewer are unchanged.
The gallery's shared active index connects stack selection to the new relay.
Titles and subtitles live alongside the six existing assets in `lib/gallery-images.ts`.

The signed cyclic distance, modulo helper, smoothstep, stable panel references,
and depth ordering are adapted from Velocity's `RaceCylinderCarousel.tsx`.
Its vertical cylinder and wheel capture are not used. One GSAP tween moves a
continuous position through an asymmetric seven-point path; every stable photo
interpolates translation, scale, rotation, and opacity from its wrapped distance.
The two hidden endpoints meet behind the composition. Whole-cycle rebasing
keeps coordinates small without changing any photo's relative position.

Navigation adds to a target position. Only one 880ms tween runs at a time; its
completion starts the next queued step and publishes the settled title/index.
Reduced motion uses 160ms transitions without rotations. Horizontal swipes and
arrow keys use the same navigation path. Vertical scrolling is never captured.

Autoplay uses a four-second interval with effect cleanup. Manual navigation,
explicit pause, leaving the viewport, and hiding the document stop playback;
only the play control restarts it. Cleanup kills the active tween and disconnects
all observers/listeners. Images are decoded as the relay approaches the viewport
and their elements persist throughout navigation.

QA covered all six forward steps, backward wraparound, autoplay 06-to-01,
seven rapid clicks, persistent image nodes and moving transforms, manual pause,
shared stack selection, keyboard navigation, mobile swipe, and reduced motion.
Production build and ESLint pass.
