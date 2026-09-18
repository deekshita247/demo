"use client";
import { useEffect, useState } from "react";
import PhotoStack from "@/components/PhotoStack";
import { galleryImages } from "@/lib/gallery-images";
import PhotoRelay from "@/components/PhotoRelay";
import ImageViewer from "@/components/ImageViewer";
import LiquidImageTransition from "@/components/LiquidImageTransition";
export default function ImageGalleryExperience() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewer, setViewer] = useState<{ index: number; source: HTMLButtonElement; rect: DOMRect } | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const select = (index: number, source: HTMLButtonElement) => {
    setActiveIndex(index);
    setViewer({ index, source, rect: source.getBoundingClientRect() });
  };
  return <div id="gallery" className="gallery-page">
    <div className="grain" aria-hidden="true" />
    <header className="gallery-header"><p className="header-mark">A study in movement</p></header>
    <section className="gallery-hero" aria-labelledby="gallery-title">
      <div className="gallery-copy"><h1 id="gallery-title">The shape<br />of stillness.</h1><p className="gallery-intro">A small collection of places that refuse to stay still. Open the stack, then choose a frame.</p></div>
      <div className="gallery-stage">
        <div className="liquid-frame"><LiquidImageTransition images={galleryImages} activeIndex={activeIndex} reducedMotion={reducedMotion} /></div>
        <PhotoStack images={galleryImages} activeIndex={activeIndex} onSelect={select} />
      </div>
    </section>
    <footer className="gallery-footer"><span>Photography / Open archive</span></footer>
    <PhotoRelay images={galleryImages} activeIndex={activeIndex} onSelect={setActiveIndex} />
    {viewer && <ImageViewer image={galleryImages[viewer.index]} source={viewer.source} rect={viewer.rect} reducedMotion={reducedMotion} onClose={() => setViewer(null)} />}
  </div>;
}
