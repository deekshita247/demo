"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "framer-motion";
import { galleryImages } from "@/lib/gallery-images";

type AnimationPhase = "scatter" | "line" | "circle";
type Dimensions = { width: number; height: number };
const MAX_SCROLL = 2400;
const wrap = (value: number, total: number) => ((value % total) + total) % total;
const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const spring = { stiffness: 105, damping: 25, mass: .8 };

/** Final chapter: an original implementation of the requested scatter / line / ring / arc sequence. */
export default function IntroAnimation() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<AnimationPhase>("scatter");
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 1200, height: 800 });
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [viewerSource, setViewerSource] = useState<HTMLButtonElement | null>(null);
  const reducedMotion = useReducedMotion();
  const progress = useMotionValue(0);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const parallaxX = useSpring(pointerX, spring);
  const parallaxY = useSpring(pointerY, spring);
  const headingY = useTransform(progress, value => -clamp(value / .55) * dimensions.height * .13);
  const ringOpacity = useTransform(progress, value => 1 - clamp(value / .55));
  const closeViewer = useCallback(() => setSelectedImage(null), []);
  const navigateViewer = useCallback((direction: number) => {
    setSelectedImage(index => index === null ? null : wrap(index + direction, galleryImages.length));
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const resize = new ResizeObserver(([entry]) => setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height }));
    resize.observe(stage);
    let started = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started) return;
      started = true;
      // The intro runs only when this final chapter is reached, never at page load.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPhase("circle");
      else {
        timers.push(setTimeout(() => setPhase("line"), 800));
        timers.push(setTimeout(() => setPhase("circle"), 1900));
      }
    }, { threshold: .45 });
    observer.observe(stage);
    return () => { resize.disconnect(); observer.disconnect(); timers.forEach(clearTimeout); };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let touch: { x: number; y: number } | null = null;
    const consume = (delta: number, event: Event) => {
      if (phase !== "circle" || !event.cancelable || document.querySelector("dialog[open]")) return;
      const bounds = stage.getBoundingClientRect();
      // Capture only while the composition is substantially in view.
      if (bounds.top > innerHeight * .25 || bounds.bottom < innerHeight * .7) return;
      const value = progress.get() * MAX_SCROLL;
      if (!delta || (delta < 0 && value <= 0) || (delta > 0 && value >= MAX_SCROLL)) return;
      event.preventDefault();
      const next = clamp(value + delta, 0, MAX_SCROLL);
      progress.set(next / MAX_SCROLL);
      stage.dataset.scroll = String(Math.round(next));
    };
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      consume(event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientHeight : 1), event);
    };
    const start = (event: TouchEvent) => {
      touch = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
    };
    const move = (event: TouchEvent) => {
      if (!touch || event.touches.length !== 1) return;
      const next = event.touches[0];
      const dy = touch.y - next.clientY;
      const dx = touch.x - next.clientX;
      touch = { x: next.clientX, y: next.clientY };
      if (Math.abs(dy) > Math.abs(dx)) consume(dy * 3, event);
    };
    const end = () => { touch = null; };
    const key = (event: KeyboardEvent) => {
      if (event.target !== stage) return;
      if (event.key === "ArrowDown" || event.key === "PageDown") consume(240, event);
      if (event.key === "ArrowUp" || event.key === "PageUp") consume(-240, event);
    };
    stage.addEventListener("wheel", wheel, { passive: false });
    stage.addEventListener("touchstart", start, { passive: true });
    stage.addEventListener("touchmove", move, { passive: false });
    stage.addEventListener("touchend", end);
    stage.addEventListener("touchcancel", end);
    stage.addEventListener("keydown", key);
    return () => {
      stage.removeEventListener("wheel", wheel);
      stage.removeEventListener("touchstart", start);
      stage.removeEventListener("touchmove", move);
      stage.removeEventListener("touchend", end);
      stage.removeEventListener("touchcancel", end);
      stage.removeEventListener("keydown", key);
    };
  }, [phase, progress]);

  return <section ref={sectionRef} className="morph-chapter" aria-labelledby="morph-heading">
    <div ref={stageRef} className="morph-stage" tabIndex={0} role="region" aria-label="Scroll or use arrow keys to reshape the photographs" data-phase={phase} data-scroll="0"
      onPointerMove={event => {
        if (event.pointerType !== "mouse" || reducedMotion) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        pointerX.set(((event.clientX - bounds.left) / bounds.width - .5) * 12);
        pointerY.set(((event.clientY - bounds.top) / bounds.height - .5) * 10);
      }} onPointerLeave={() => { pointerX.set(0); pointerY.set(0); }}>
      <header className="morph-topline"><span>04 / A final perspective</span><span>Six places. Endless possibilities.</span></header>
      <motion.div className="morph-orbit-guide" style={{ opacity: ringOpacity, width: Math.min(dimensions.width * .32, dimensions.height * .28, 280) * 2, height: Math.min(dimensions.width * .32, dimensions.height * .28, 280) * 2 }} aria-hidden="true" />
      <motion.div className="morph-copy" style={{ y: headingY }} animate={{ opacity: phase === "circle" ? 1 : 0 }} transition={{ duration: reducedMotion ? .1 : .6 }}>
        <p className="morph-eyebrow">The art of looking again</p>
        <h2 id="morph-heading">A different<br /><em>perspective.</em></h2>
        <p className="morph-description">The same places.<br />A new way to see them.</p>
      </motion.div>
      <motion.div className="morph-composition" style={{ x: reducedMotion ? 0 : parallaxX, y: reducedMotion ? 0 : parallaxY }}>
        {galleryImages.map((image, index) => <FlipCard key={image.src} index={index} total={galleryImages.length} image={image}
          phase={phase} dimensions={dimensions} progress={progress} reducedMotion={!!reducedMotion}
          onClick={source => { setViewerSource(source); setSelectedImage(index); }} />)}
      </motion.div>
      <div className="morph-scroll-note"><span>{phase === "circle" ? "Scroll to reshape / Select a frame" : "A collection, coming together"}</span><div><motion.i style={{ scaleX: progress }} /></div></div>
    </div>
    <footer className="morph-ending"><p>Some places stay with you.</p><div><span>The shape of stillness.</span><a href="#">Back to the beginning ↗</a></div></footer>
    <AnimatePresence>{selectedImage !== null && <MorphViewer key="morph-viewer" index={selectedImage} source={viewerSource} reducedMotion={!!reducedMotion} onClose={closeViewer} onNavigate={navigateViewer} />}</AnimatePresence>
  </section>;
}

function FlipCard({ image, index, total, phase, dimensions, progress, reducedMotion, onClick }: {
  image: typeof galleryImages[number]; index: number; total: number; phase: AnimationPhase;
  dimensions: Dimensions; progress: MotionValue<number>; reducedMotion: boolean; onClick: (source: HTMLButtonElement) => void;
}) {
  const targetX = useMotionValue(0), targetY = useMotionValue(0), targetRotation = useMotionValue(0), opacity = useMotionValue(1);
  const x = useSpring(targetX, spring), y = useSpring(targetY, spring), rotation = useSpring(targetRotation, spring);
  const cardWidth = clamp(dimensions.width * .1, 66, 124);
  useEffect(() => {
    let previousRelative: number | undefined;
    const update = () => {
      let crossedSeam = false;
      const { width, height } = dimensions;
      let px: number, py: number, angle: number, alpha = 1;
      if (phase === "scatter") {
        px = Math.sin(index * 2.39 + .7) * width * .29;
        py = Math.cos(index * 1.73) * height * .29;
        angle = Math.sin(index * 3.1 + .5) * 32;
      } else if (phase === "line") {
        px = (index - (total - 1) / 2) * Math.min(cardWidth + 18, width / (total + .7));
        py = 0; angle = 0;
      } else {
        const value = progress.get();
        const blend = clamp(value / .55);
        const circleRadius = Math.min(width * .32, height * .28, 280);
        const circleAngle = index / total * Math.PI * 2 - Math.PI / 2;
        const shift = clamp((value - .55) / .45) * total;
        const relative = wrap(index - shift + total / 2, total) - total / 2;
        crossedSeam = previousRelative !== undefined && Math.abs(relative - previousRelative) > total / 2;
        previousRelative = relative;
        const spreadAngle = Math.PI * .68;
        const currentArcAngle = relative / (total / 2) * spreadAngle / 2;
        const arcRadius = Math.min(width * .7, 640);
        const arcApexY = height * .16;
        const arcX = Math.sin(currentArcAngle) * arcRadius;
        const arcY = arcApexY + (1 - Math.cos(currentArcAngle)) * arcRadius;
        px = Math.cos(circleAngle) * circleRadius * (1 - blend) + arcX * blend;
        py = Math.sin(circleAngle) * circleRadius * (1 - blend) + arcY * blend;
        angle = (circleAngle * 180 / Math.PI + 90) * (1 - blend) + currentArcAngle * 180 / Math.PI * blend;
        // Hide the rear seam during cycling so a recycled card never streaks across the arc.
        const seam = clamp((total / 2 - Math.abs(relative)) / .35);
        alpha = 1 - blend + blend * seam;
      }
      targetX.set(px); targetY.set(py); targetRotation.set(reducedMotion ? 0 : angle); opacity.set(alpha);
      if (reducedMotion || crossedSeam) { x.jump(px); y.jump(py); rotation.jump(reducedMotion ? 0 : angle); }
    };
    update();
    return progress.on("change", update);
  }, [phase, dimensions, progress, cardWidth, index, total, reducedMotion, targetX, targetY, targetRotation, opacity, x, y, rotation]);
  const hidden = useTransform(opacity, value => value < .05 ? "hidden" : "visible");
  return <motion.button type="button" className="morph-card" aria-label={`Open ${image.title}`} onClick={event => onClick(event.currentTarget)}
    style={{ x, y, rotate: rotation, opacity, visibility: hidden, width: cardWidth, height: cardWidth * 1.35, marginLeft: -cardWidth / 2, marginTop: -cardWidth * .675 }}>
    <motion.span className="morph-card-face" whileHover={reducedMotion ? undefined : { rotateY: 12, scale: 1.055 }} whileTap={{ scale: .97 }} transition={{ duration: .2 }}>
      {/* Native local assets share the browser cache with the preceding galleries. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.src} alt={image.alt} loading="lazy" decoding="async" draggable={false} />
      <span>{String(index + 1).padStart(2, "0")}</span>
    </motion.span>
  </motion.button>;
}

function MorphViewer({ index, source, reducedMotion, onClose, onNavigate }: {
  index: number; source: HTMLButtonElement | null; reducedMotion: boolean; onClose: () => void; onNavigate: (direction: number) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const image = galleryImages[index];
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => { dialog?.close(); source?.focus({ preventScroll: true }); };
  }, [source]);
  return <motion.dialog ref={dialogRef} className="morph-viewer" aria-label="Fullscreen photograph viewer"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? .1 : .2 }}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    onKeyDown={event => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); onNavigate(event.key === "ArrowLeft" ? -1 : 1); }
    }}>
    <button type="button" className="morph-viewer-close" aria-label="Close image viewer" autoFocus onClick={onClose}>Close ×</button>
    <AnimatePresence mode="wait">
      <motion.img key={image.src} src={image.src} alt={image.alt}
        initial={{ opacity: 0, scale: reducedMotion ? 1 : .94, y: reducedMotion ? 0 : 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
        transition={{ duration: reducedMotion ? .1 : .22, ease: "easeOut" }} />
    </AnimatePresence>
    <button type="button" className="morph-viewer-prev" aria-label="Previous photograph" onClick={() => onNavigate(-1)}>←</button>
    <button type="button" className="morph-viewer-next" aria-label="Next photograph" onClick={() => onNavigate(1)}>→</button>
    <p className="morph-viewer-caption" aria-live="polite">{String(index + 1).padStart(2, "0")} / {String(galleryImages.length).padStart(2, "0")} <span>{image.title}</span></p>
  </motion.dialog>;
}
