"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import type { GalleryImage } from "./PhotoStack";

type RelayImage = GalleryImage & { title: string; subtitle: string };
type Props = { images: RelayImage[]; activeIndex: number; onSelect: (index: number) => void };
const smoothstep = (a: number, b: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const wrap = (value: number, count: number) => ((value % count) + count) % count;
// Adapted from Velocity's RaceCylinderCarousel: signed cyclic distance and depth slots.
const slots = [
  { x: -.76, y: -.38, scale: .42, rotation: -22, tilt: 24, opacity: 0 },
  { x: -.49, y: -.23, scale: .59, rotation: -14, tilt: 20, opacity: .42 },
  { x: -.32, y: .075, scale: .84, rotation: -6, tilt: 12, opacity: .83 },
  { x: 0, y: 0, scale: 1, rotation: 0, tilt: 0, opacity: 1 },
  { x: .32, y: -.035, scale: .86, rotation: 7, tilt: -12, opacity: .85 },
  { x: .49, y: .25, scale: .57, rotation: 16, tilt: -20, opacity: .42 },
  { x: .76, y: .38, scale: .42, rotation: 23, tilt: -24, opacity: 0 },
];

export default function PhotoRelay({ images, activeIndex, onSelect }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  const [selected, setSelected] = useState(activeIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const lastPublished = useRef(activeIndex);
  const playRef = useRef(false);
  const controls = useRef<{ step: (direction: number) => void; select: (index: number) => void } | null>(null);
  const gesture = useRef<{ x: number; y: number; id: number } | null>(null);
  const suppressClick = useRef(false);
  const pause = useCallback(() => { playRef.current = false; setIsPlaying(false); }, []);
  const navigate = useCallback((direction: number) => { pause(); controls.current?.step(direction); }, [pause]);
  const togglePlay = useCallback(() => {
    playRef.current = !playRef.current;
    setIsPlaying(playRef.current);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const section = sectionRef.current;
    if (!stage || !section || !images.length) return;
    const count = images.length;
    const current = { position: lastPublished.current, target: lastPublished.current };
    let tween: gsap.core.Tween | undefined;
    let disposed = false;
    let width = stage.clientWidth;
    let height = stage.clientHeight;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const draw = () => {
      const mobile = width < 600;
      cards.current.forEach((card, index) => {
        if (!card) return;
        const distance = wrap(index - current.position + count / 2, count) - count / 2;
        const depth = Math.abs(distance);
        const slot = Math.max(0, Math.min(6, distance * 6 / count + 3));
        const left = Math.min(5, Math.floor(slot));
        const fraction = slot - left;
        const a = slots[left], b = slots[left + 1];
        const mix = (key: keyof typeof a) => a[key] + (b[key] - a[key]) * fraction;
        const rotation = preference.matches ? 0 : mix("rotation");
        const tilt = preference.matches ? 0 : mix("tilt");
        // The rear seam is invisible on both sides, so wrapping never crosses the center.
        const opacity = mix("opacity") * (1 - smoothstep(count / 2 - .5, count / 2, depth));
        card.style.transform = `translate(-50%, -50%) translate3d(${mix("x") * width * (mobile ? 1.38 : 1)}px, ${mix("y") * height}px, 0) rotateY(${tilt}deg) rotateZ(${rotation}deg) scale(${mix("scale")})`;
        card.style.opacity = String(opacity);
        card.style.zIndex = String(100 - Math.round(depth * 20));
        card.style.visibility = opacity > .01 ? "visible" : "hidden";
        card.style.pointerEvents = opacity > .1 ? "auto" : "none";
        card.tabIndex = depth < 1.5 ? 0 : -1;
        card.setAttribute("aria-hidden", String(opacity <= .01));
        card.dataset.distance = distance.toFixed(3);
      });
      section.dataset.position = current.position.toFixed(3);
    };
    const advance = () => {
      if (disposed || tween || Math.abs(current.target - current.position) < .001) return;
      const next = Math.round(current.position) + Math.sign(current.target - current.position);
      tween = gsap.to(current, {
        position: next, duration: preference.matches ? .16 : .88, ease: "power3.inOut",
        onUpdate: draw,
        onComplete: () => {
          tween = undefined;
          const index = wrap(next, count);
          lastPublished.current = index;
          setSelected(index);
          onSelect(index);
          // Rebase by whole cycles only; all signed distances stay identical.
          const cycles = Math.floor(current.position / count) * count;
          current.position -= cycles;
          current.target -= cycles;
          draw();
          advance();
        },
      });
    };
    controls.current = {
      step: direction => { current.target += direction; advance(); },
      select: index => {
        current.target += wrap(index - current.target + count / 2, count) - count / 2;
        advance();
      },
    };
    const resize = new ResizeObserver(() => { width = stage.clientWidth; height = stage.clientHeight; draw(); });
    resize.observe(stage);
    preference.addEventListener("change", draw);
    draw();
    // Warm every stable slide before it enters the center. No per-selection image remounts.
    const warm = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      stage.querySelectorAll("img").forEach(image => { image.loading = "eager"; void image.decode().catch(() => {}); });
      warm.disconnect();
    }, { rootMargin: "600px" });
    warm.observe(section);
    const visibility = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) pause(); });
    visibility.observe(section);
    const hide = () => { if (document.hidden) pause(); };
    document.addEventListener("visibilitychange", hide);
    return () => {
      disposed = true;
      tween?.kill();
      controls.current = null;
      resize.disconnect();
      warm.disconnect();
      visibility.disconnect();
      preference.removeEventListener("change", draw);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [images, onSelect, pause]);

  useEffect(() => {
    if (activeIndex !== lastPublished.current) {
      pause();
      controls.current?.select(activeIndex);
    }
  }, [activeIndex, pause]);
  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => { if (playRef.current) controls.current?.step(1); }, 4000);
    return () => window.clearInterval(interval);
  }, [isPlaying]);

  const image = images[selected];
  return <section ref={sectionRef} className="photo-relay" aria-labelledby="relay-heading"
    aria-roledescription="carousel" tabIndex={0} data-playing={isPlaying}
    onKeyDown={event => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault(); navigate(event.key === "ArrowLeft" ? -1 : 1);
      } else if (event.key === " " && event.target === event.currentTarget) {
        event.preventDefault(); togglePlay();
      }
    }}>
    <header className="relay-heading">
      <p className="relay-kicker"><span /> Frames in motion</p>
      <h2 id="relay-heading">Follow your<br /><em>own rhythm.</em></h2>
      <span className="relay-edition">A continuous photographic study</span>
    </header>
    <div ref={stageRef} className="relay-stage"
      onPointerDown={event => {
        if (event.button !== 0) return;
        pause(); suppressClick.current = false;
        gesture.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
      }}
      onPointerMove={event => {
        const start = gesture.current;
        if (start?.id === event.pointerId && Math.abs(event.clientX - start.x) > 12) {
          suppressClick.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
        }
      }}
      onPointerUp={event => {
        const start = gesture.current;
        gesture.current = null;
        if (!start || start.id !== event.pointerId) return;
        const dx = event.clientX - start.x;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(event.clientY - start.y)) navigate(dx < 0 ? 1 : -1);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => { gesture.current = null; suppressClick.current = false; }}>
      {images.map((photo, index) => <button key={photo.src} ref={node => { cards.current[index] = node; }}
        type="button" className="relay-photo" aria-label={`Center ${photo.title}`} aria-pressed={selected === index}
        onClick={() => { if (!suppressClick.current) { pause(); controls.current?.select(index); } }}>
        {/* Stable local assets are also used by the stack, viewer, and WebGL texture cache. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" draggable={false} />
        <span className="relay-photo-number">{String(index + 1).padStart(2, "0")}</span>
      </button>)}
    </div>
    <div className="relay-player">
      <div className="relay-caption" aria-live={isPlaying ? "off" : "polite"} aria-atomic="true">
        <p className="relay-counter">{String(selected + 1).padStart(2, "0")} <span>/ {String(images.length).padStart(2, "0")}</span></p>
        <h3>{image.title}</h3>
        <p className="relay-subtitle">{image.subtitle}</p>
      </div>
      <nav className="relay-controls" aria-label="Photo relay controls">
        <button type="button" aria-label="Previous image" onClick={() => navigate(-1)}><Arrow /></button>
        <button type="button" className="relay-play" aria-label={isPlaying ? "Pause carousel" : "Play carousel"} onClick={togglePlay}>
          <svg viewBox="0 0 24 24" aria-hidden="true">{isPlaying ? <path d="M8 6v12M16 6v12" fill="none" stroke="currentColor" strokeWidth="2" /> : <path d="m9 5 10 7-10 7Z" fill="currentColor" />}</svg>
        </button>
        <button type="button" aria-label="Next image" onClick={() => navigate(1)}><Arrow next /></button>
      </nav>
      <div className="relay-track" aria-hidden="true">{images.map((photo, index) => <span key={photo.src} className={index === selected ? "is-current" : ""} />)}</div>
    </div>
    <footer className="relay-footer"><span>Places / Perspective / Passage</span><span>Always in motion <i>↗</i></span></footer>
  </section>;
}

function Arrow({ next = false }: { next?: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" style={{ transform: next ? "rotate(180deg)" : undefined }}><path d="M19 12H5m6-6-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
