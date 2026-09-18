"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { usePointerParallax } from "@/hooks/usePointerParallax";

export type GalleryImage = { src: string; alt: string; label: string };
type PhotoStackProps = {
  images: GalleryImage[]; activeIndex: number;
  onSelect: (index: number, source: HTMLButtonElement) => void;
};
const scatter = [
  { x: -146, y: -112, r: -12, s: .98 }, { x: 148, y: -104, r: 10, s: 1.02 },
  { x: -180, y: 12, r: -7, s: .96 }, { x: 178, y: 30, r: 13, s: .98 },
  { x: -98, y: 142, r: 9, s: 1.01 }, { x: 116, y: 138, r: -10, s: .97 },
];

export default function PhotoStack({ images, activeIndex, onSelect }: PhotoStackProps) {
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const stageRef = usePointerParallax(true);
  const [exploded, setExploded] = useState(false);
  const reducedMotion = useRef(false);
  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const items = itemRefs.current;
    return () => { items.forEach(item => { if (item) gsap.killTweensOf(item); }); };
  }, []);
  const fan = (next: boolean) => {
    setExploded(next);
    itemRefs.current.forEach((item, index) => {
      if (!item) return;
      const position = scatter[index % scatter.length];
      const target = next ? {
        x: position.x * Math.min(1, (window.innerWidth - 40) / 700),
        y: position.y * Math.min(1, window.innerWidth / 700),
        rotation: position.r, scale: window.innerWidth < 600 ? .62 : position.s,
      } : { x: 0, y: 0, rotation: index % 2 ? 1.4 : -1.2, scale: 1 };
      gsap.to(item, { ...target, duration: reducedMotion.current ? .18 : next ? .95 : .72,
        delay: reducedMotion.current ? 0 : next ? index * .045 : (images.length - index) * .035,
        ease: next ? "expo.out" : "elastic.out(1, .72)", overwrite: true });
    });
  };
  const select = (index: number) => {
    const source = itemRefs.current[index];
    if (source) onSelect(index, source);
    fan(false);
  };
  return <div className={`photo-stack-shell ${exploded ? "is-exploded" : ""}`}
    onPointerEnter={event => { if (event.pointerType === "mouse") fan(true); }}
    onPointerLeave={event => { if (event.pointerType === "mouse") fan(false); }}
    onClick={() => { if (!exploded) fan(true); }}
    onKeyDown={event => {
      if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault(); fan(!exploded);
      }
    }} role="group" tabIndex={0} aria-label="Photograph stack. Focus and press Enter to fan out.">
    <div ref={stageRef} className="photo-stack-stage">
      {images.map((image, index) => <button key={image.src}
        ref={node => { itemRefs.current[index] = node; }}
        className={`photo-stack-item ${index === activeIndex ? "is-active" : ""}`}
        style={{ zIndex: !exploded && index === activeIndex ? 12 : index + 1 }}
        onClick={event => {
          event.stopPropagation();
          if (exploded || event.detail === 0) select(index);
          else fan(true);
        }} aria-label={`Select ${image.label}`} aria-pressed={index === activeIndex}>
        {/* The same gallery asset is shared with the WebGL textures and full-size viewer. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.src} alt={image.alt} draggable={false} loading="lazy" decoding="async" />
        <span>{String(index + 1).padStart(2, "0")}</span>
      </button>)}
    </div>
  </div>;
}
