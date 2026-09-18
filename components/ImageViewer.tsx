"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import type { GalleryImage } from "./PhotoStack";

export default function ImageViewer({ image, source, rect, reducedMotion, onClose }: {
  image: GalleryImage; source: HTMLButtonElement; rect: DOMRect;
  reducedMotion: boolean; onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const photo = imageRef.current;
    if (!dialog || !photo) return;
    dialog.showModal();
    let tween: gsap.core.Tween | undefined;
    const animate = () => {
      const target = photo.getBoundingClientRect();
      tween = gsap.fromTo(photo, {
        x: rect.x + rect.width / 2 - target.x - target.width / 2,
        y: rect.y + rect.height / 2 - target.y - target.height / 2,
        scaleX: rect.width / target.width, scaleY: rect.height / target.height,
      }, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: reducedMotion ? 0 : .65, ease: "power3.out" });
    };
    if (photo.complete) animate();
    else photo.addEventListener("load", animate, { once: true });
    return () => {
      photo.removeEventListener("load", animate);
      tween?.kill();
      dialog.close();
      source.focus({ preventScroll: true });
    };
  }, [source, rect, reducedMotion]);
  return <dialog ref={dialogRef} className="image-viewer" aria-label={image.label}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <button className="viewer-close" autoFocus onClick={onClose} aria-label="Close photograph">Close ×</button>
    {/* Native dimensions preserve the photograph's original aspect ratio. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img ref={imageRef} src={image.src} alt={image.alt} />
  </dialog>;
}
