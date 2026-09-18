"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export function usePointerParallax(active: boolean) {
  const target = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!active || window.matchMedia("(pointer: coarse)").matches) return;
    const move = (event: PointerEvent) => {
      if (!target.current) return;
      gsap.to(target.current, { rotateY: (event.clientX / window.innerWidth - 0.5) * 5, rotateX: (event.clientY / window.innerHeight - 0.5) * -5, duration: 0.8, ease: "power3.out", overwrite: true });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [active]);

  return target;
}