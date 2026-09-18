"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import type { GalleryImage } from "@/components/PhotoStack";

type Props = { images: GalleryImage[]; activeIndex: number; reducedMotion: boolean };
const vertexShader = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`;
const fragmentShader = `uniform sampler2D uTextureA; uniform sampler2D uTextureB; uniform float uProgress; uniform float uTime; uniform float uAspect; uniform float uAspectA; uniform float uAspectB; varying vec2 vUv; float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); } float noise(vec2 p) { vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y); } vec2 fit(vec2 uv, float aspect) { return (uv - .5) * vec2(min(uAspect / aspect, 1.), min(aspect / uAspect, 1.)) + .5; } void main() { float wave=sin(uProgress*3.14159265); float n=noise(vUv*5.0+vec2(uTime*.22,-uTime*.16)); vec2 flow=vec2(noise(vUv*7.0+uTime)-.5,noise(vUv*6.0-uTime*.8)-.5); vec2 uvA=vUv+flow*wave*(.075+n*.025); vec2 uvB=vUv-flow*wave*.06; vec4 a=texture2D(uTextureA,fit(uvA,uAspectA)); vec4 b=texture2D(uTextureB,fit(uvB,uAspectB)); float edge=mix(-.2,1.2,uProgress); float reveal=1.-smoothstep(edge-.18,edge+.18,vUv.x+(n-.5)*wave*.3); gl_FragColor=mix(a,b,reveal); }`;
type LiquidState = {
  target: number; index: number; reducedMotion: boolean;
  tween?: gsap.core.Tween;
};
export default function LiquidImageTransition({ images, activeIndex, reducedMotion }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useRef<LiquidState>({ target: 0, index: 0, reducedMotion: false });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !images.length) return;
    const current: LiquidState = { target: 0, index: 0, reducedMotion: false };
    state.current = current;
    let nearViewport = false;
    let disposeRenderer: (() => void) | undefined;
    const initialize = () => {
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      let disposed = false;
      const ready = new Set<number>();
      const textures = images.map((image, index) => new THREE.TextureLoader().load(image.src, texture => {
        if (disposed) { texture.dispose(); return; }
        ready.add(index);
      }));
      textures.forEach(texture => { texture.colorSpace = THREE.SRGBColorSpace; texture.minFilter = THREE.LinearFilter; });
      const material = new THREE.ShaderMaterial({ uniforms: {
        uTextureA: { value: textures[0] }, uTextureB: { value: textures[0] },
        uProgress: { value: 0 }, uTime: { value: 0 },
        uAspect: { value: 1 }, uAspectA: { value: 1 }, uAspectB: { value: 1 },
      }, vertexShader, fragmentShader });
      const geometry = new THREE.PlaneGeometry(2, 2);
      scene.add(new THREE.Mesh(geometry, material));
      const aspect = (index: number) => {
        const image = textures[index].image as { width: number; height: number };
        return image.width / image.height;
      };
      const resize = () => {
        const { width, height } = canvas.getBoundingClientRect();
        renderer.setSize(width, height, false);
        material.uniforms.uAspect.value = width / Math.max(height, 1);
      };
      let raf = 0;
      const render = (time: number) => {
        if (nearViewport && ready.has(current.index)) {
          if (!current.tween && current.index !== current.target && ready.has(current.target)) {
            const previousIndex = current.index;
            const incoming = current.target;
            material.uniforms.uTextureA.value = textures[previousIndex];
            material.uniforms.uTextureB.value = textures[incoming];
            material.uniforms.uAspectA.value = aspect(previousIndex);
            material.uniforms.uAspectB.value = aspect(incoming);
            material.uniforms.uProgress.value = 0;
            current.tween = gsap.to(material.uniforms.uProgress, {
              value: 1, duration: current.reducedMotion ? .2 : 1.08, ease: "power3.inOut",
              onComplete: () => {
                // Commit only after the old texture has fully dissolved into the new one.
                current.index = incoming;
                material.uniforms.uTextureA.value = textures[incoming];
                material.uniforms.uTextureB.value = textures[incoming];
                material.uniforms.uAspectA.value = aspect(incoming);
                material.uniforms.uAspectB.value = aspect(incoming);
                material.uniforms.uProgress.value = 1;
                current.tween = undefined;
              },
            });
          } else if (!current.tween) {
            material.uniforms.uTextureA.value = textures[current.index];
            material.uniforms.uTextureB.value = textures[current.index];
            material.uniforms.uAspectA.value = aspect(current.index);
            material.uniforms.uAspectB.value = aspect(current.index);
          }
          material.uniforms.uTime.value = time * .001;
          renderer.render(scene, camera);
        }
        raf = requestAnimationFrame(render);
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(canvas);
      window.addEventListener("resize", resize);
      raf = requestAnimationFrame(render);
      return () => {
        disposed = true;
        cancelAnimationFrame(raf);
        observer.disconnect();
        window.removeEventListener("resize", resize);
        current.tween?.kill();
        textures.forEach(texture => texture.dispose());
        geometry.dispose();
        material.dispose();
        renderer.dispose();
      };
    };
    // Keep the original renderer and transition logic; defer its cost until near the gallery.
    const visibility = new IntersectionObserver(([entry]) => {
      nearViewport = entry.isIntersecting;
      if (nearViewport && !disposeRenderer) disposeRenderer = initialize();
    }, { rootMargin: "300px" });
    visibility.observe(canvas);
    return () => {
      visibility.disconnect();
      disposeRenderer?.();
    };
  }, [images]);
  useEffect(() => {
    // Queue the latest selection; finish the current ripple before starting another.
    state.current.target = Math.max(0, Math.min(activeIndex, images.length - 1));
    state.current.reducedMotion = reducedMotion;
  }, [activeIndex, reducedMotion, images]);
  return <canvas ref={canvasRef} className="liquid-canvas" aria-label={images[activeIndex]?.alt} role="img" />;
}
