"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface ScrollExpandMediaProps {
  mediaType?: "video" | "image";
  mediaSrc: string;
  mediaAlt?: string;
  posterSrc?: string;
  bgImageSrc: string;
  title?: string;
  date?: string;
  scrollToExpand?: string;
  textBlend?: boolean;
  children?: ReactNode;
}

const ScrollExpandMedia = ({
  mediaType = "video",
  mediaSrc,
  mediaAlt,
  posterSrc,
  bgImageSrc,
  title,
  date,
  scrollToExpand,
  textBlend,
  children,
}: ScrollExpandMediaProps) => {
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [showContent, setShowContent] = useState<boolean>(false);
  const [mediaFullyExpanded, setMediaFullyExpanded] = useState<boolean>(false);
  // Input accumulates synchronously; React paints at most once per frame.
  const interaction = useRef({ progress: 0, expanded: false, content: false });
  const [isMobileState, setIsMobileState] = useState<boolean>(false);

  const sectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const current = interaction.current;
    current.progress = 0;
    current.expanded = false;
    current.content = false;
    let touchStartY: number | null = null;
    let frame = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const publish = () => {
      frame = 0;
      setScrollProgress(current.progress);
      setMediaFullyExpanded(current.expanded);
      setShowContent(current.content);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(publish); };
    const finishForReducedMotion = () => {
      if (reducedMotion.matches) {
        current.progress = 1;
        current.expanded = true;
        current.content = true;
      }
      schedule();
    };
    finishForReducedMotion();

    const atHeroEntrance = () => {
      const bounds = section.getBoundingClientRect();
      return Math.abs(bounds.top) <= 5 && bounds.bottom > 0 && !document.querySelector("dialog[open]");
    };
    const updateProgress = (scrollDelta: number) => {
      // Supplied clamp, completion threshold and content reveal threshold.
      const newProgress = Math.min(Math.max(current.progress + scrollDelta, 0), 1);
      current.progress = newProgress;
      current.expanded = newProgress >= 1;
      if (newProgress >= 1) current.content = true;
      else if (newProgress < 0.75) current.content = false;
      schedule();
    };
    const shouldCapture = (delta: number) => !reducedMotion.matches && atHeroEntrance()
      && delta !== 0 && !(current.expanded && delta > 0) && !(current.progress === 0 && delta < 0);

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (!event.cancelable || !shouldCapture(event.deltaY)) return;
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
      updateProgress(delta * 0.0009);
    };
    const handleTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches.length === 1 ? event.touches[0].clientY : null;
    };
    const handleTouchMove = (event: TouchEvent) => {
      if (touchStartY === null || event.touches.length !== 1) return;
      const touchY = event.touches[0].clientY;
      const deltaY = touchStartY - touchY;
      touchStartY = touchY;
      if (!event.cancelable || !shouldCapture(deltaY)) return;
      event.preventDefault();
      // Keep the supplied directional touch sensitivity.
      updateProgress(deltaY * (deltaY < 0 ? 0.008 : 0.005));
    };
    const handleTouchEnd = () => { touchStartY = null; };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target !== section) return;
      const direction = event.key === "ArrowDown" || event.key === "PageDown" || event.key === " " ? 1
        : event.key === "ArrowUp" || event.key === "PageUp" ? -1 : 0;
      if (shouldCapture(direction)) { event.preventDefault(); updateProgress(direction * .2); }
    };

    // The gallery is a sibling, so its wheel/touch events never reach these listeners.
    section.addEventListener("wheel", handleWheel, { passive: false });
    section.addEventListener("touchstart", handleTouchStart, { passive: true });
    section.addEventListener("touchmove", handleTouchMove, { passive: false });
    section.addEventListener("touchend", handleTouchEnd);
    section.addEventListener("touchcancel", handleTouchEnd);
    section.addEventListener("keydown", handleKeyDown);
    reducedMotion.addEventListener("change", finishForReducedMotion);
    return () => {
      cancelAnimationFrame(frame);
      section.removeEventListener("wheel", handleWheel);
      section.removeEventListener("touchstart", handleTouchStart);
      section.removeEventListener("touchmove", handleTouchMove);
      section.removeEventListener("touchend", handleTouchEnd);
      section.removeEventListener("touchcancel", handleTouchEnd);
      section.removeEventListener("keydown", handleKeyDown);
      reducedMotion.removeEventListener("change", finishForReducedMotion);
    };
  }, [mediaType, mediaSrc]);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const checkIfMobile = () => setIsMobileState(query.matches);
    checkIfMobile();
    query.addEventListener("change", checkIfMobile);
    return () => query.removeEventListener("change", checkIfMobile);
  }, []);

  // Same linear expansion, fitted to this site's viewport rather than fixed demo sizes.
  const initialWidth = isMobileState ? "min(78vw, 340px)" : "clamp(300px, 38vw, 600px)";
  const mediaWidth = `calc(${initialWidth} * ${1 - scrollProgress} + 95vw * ${scrollProgress})`;
  const mediaHeight = `calc(clamp(280px, 56svh, 520px) * ${1 - scrollProgress} + 85svh * ${scrollProgress})`;
  const textTranslateX = scrollProgress * (isMobileState ? 180 : 150);

  const firstWord = title ? title.split(" ")[0] : "";
  const restOfTitle = title ? title.split(" ").slice(1).join(" ") : "";

  return (
    <div
      ref={sectionRef}
      className="scroll-expansion"
      tabIndex={0}
      role="region"
      aria-label="Scroll to expand the photograph"
      data-expanded={mediaFullyExpanded}
      data-progress={scrollProgress.toFixed(3)}
    >
      <a className="hero-skip" href="#gallery">Skip to photographs</a>
      <section className="relative flex flex-col items-center justify-start min-h-[100svh]">
        <div className="relative w-full flex flex-col items-center min-h-[100svh]">
          <motion.div
            className="absolute inset-0 z-0 h-full pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 - scrollProgress }}
            transition={{ duration: 0.1 }}
          >
            <Image
              src={bgImageSrc}
              alt=""
              fill
              sizes="100vw"
              className="hero-background"
              style={{
                objectFit: "cover",
                objectPosition: "center",
              }}
              loading="eager"
            />
            <div className="absolute inset-0 hero-background-wash" />
          </motion.div>

          <div className="w-full mx-auto flex flex-col items-center justify-start relative z-10">
            <div className="flex flex-col items-center justify-center w-full h-[100svh] relative">
              <div
                className="hero-expanding-media absolute z-0 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-none"
                style={{
                  width: mediaWidth,
                  height: mediaHeight,
                  maxWidth: "95vw",
                  maxHeight: "85svh",
                  boxShadow: "24px 28px 60px #28332d30",
                }}
              >
                {mediaType === "video" ? (
                  mediaSrc.includes("youtube.com") ? (
                    <div className="relative w-full h-full pointer-events-none">
                      <iframe
                        width="100%"
                        height="100%"
                        src={
                          mediaSrc.includes("embed")
                            ? mediaSrc +
                              (mediaSrc.includes("?") ? "&" : "?") +
                              "autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&disablekb=1&modestbranding=1"
                            : mediaSrc.replace("watch?v=", "embed/") +
                              "?autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&disablekb=1&modestbranding=1&playlist=" +
                              mediaSrc.split("v=")[1]
                        }
                        className="w-full h-full rounded-[5px]"
                        title={title || "Expanding video"}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                      <div
                        className="absolute inset-0 z-10"
                        style={{ pointerEvents: "none" }}
                      ></div>

                      <motion.div
                        className="absolute inset-0 bg-black/30 rounded-[5px]"
                        initial={{ opacity: 0.7 }}
                        animate={{ opacity: 0.5 - scrollProgress * 0.3 }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                  ) : (
                    <div className="relative w-full h-full pointer-events-none">
                      <video
                        src={mediaSrc}
                        poster={posterSrc}
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover rounded-[5px]"
                        controls={false}
                        disablePictureInPicture
                        disableRemotePlayback
                      />
                      <div
                        className="absolute inset-0 z-10"
                        style={{ pointerEvents: "none" }}
                      ></div>

                      <motion.div
                        className="absolute inset-0 bg-black/30 rounded-[5px]"
                        initial={{ opacity: 0.7 }}
                        animate={{ opacity: 0.5 - scrollProgress * 0.3 }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                  )
                ) : (
                  <div className="relative w-full h-full">
                    <Image
                      src={mediaSrc}
                      alt={mediaAlt || title || "Media content"}
                      fill
                      sizes="95vw"
                      preload
                      className="w-full h-full object-cover rounded-[5px]"
                    />

                    <motion.div
                      className="absolute inset-0 bg-black/50 rounded-[5px]"
                      initial={{ opacity: 0.7 }}
                      animate={{ opacity: 0.7 - scrollProgress * 0.3 }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                )}

                <div className="hero-caption flex flex-col items-center text-center relative z-10 mt-4 transition-none">
                  {date && (
                    <p
                      className="hero-caption-text"
                      style={{ transform: `translateX(-${textTranslateX}vw)` }}
                    >
                      {date}
                    </p>
                  )}
                  {scrollToExpand && (
                    <p
                      className="hero-caption-text"
                      style={{ transform: `translateX(${textTranslateX}vw)` }}
                    >
                      {scrollToExpand}
                    </p>
                  )}
                </div>
              </div>

              <div
                className={`hero-title pointer-events-none flex items-center justify-center text-center gap-4 w-full relative z-10 transition-none flex-col ${
                  textBlend ? "mix-blend-difference" : "mix-blend-normal"
                }`}
              >
                <motion.h2
                  className="hero-title-line"
                  style={{ transform: `translateX(-${textTranslateX}vw)` }}
                >
                  {firstWord}
                </motion.h2>
                <motion.h2
                  className="hero-title-line"
                  style={{ transform: `translateX(${textTranslateX}vw)` }}
                >
                  {restOfTitle}
                </motion.h2>
              </div>
            </div>

            {children && <motion.section
              className="hero-content flex flex-col w-full px-8 py-10 md:px-16 lg:py-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: showContent ? 1 : 0 }}
              transition={{ duration: 0.7 }}
            >
              {children}
            </motion.section>}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ScrollExpandMedia;