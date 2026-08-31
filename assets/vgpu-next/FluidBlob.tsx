"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import styles from "./fluid-blob.module.css";

type FluidBlobProps = {
  colors: readonly string[];
  shape?: "landscape" | "portrait";
  motion?: number;
  className?: string;
};

export function FluidBlob({
  colors,
  shape = "landscape",
  motion = 1,
  className = "",
}: FluidBlobProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorKey = colors.slice(0, 6).join(":");

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = canvas?.parentElement;
    if (!canvas || !root) return;

    let stop: (() => void) | undefined;
    let observer: IntersectionObserver | undefined;
    let active = false;
    let loading = false;

    const start = () => {
      active = true;
      if (stop || loading) return;
      loading = true;
      root.setAttribute("data-webgpu", "loading");
      void import("./start-fluid-blob")
        .then(({ startFluidBlob }) => {
          loading = false;
          if (!active) return;
          stop = startFluidBlob(canvas, {
            colors: colorKey.split(":"),
            shape,
            motion,
          });
        })
        .catch((error: unknown) => {
          loading = false;
          if (!active) return;
          root.setAttribute("data-webgpu", "unsupported");
          console.warn("WebGPU blob module unavailable; using the CSS fallback.", error);
        });
    };

    const suspend = () => {
      active = false;
      stop?.();
      stop = undefined;
      root.setAttribute("data-webgpu", "loading");
    };

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) start();
          else suspend();
        },
        { rootMargin: "320px 0px" },
      );
      observer.observe(root);
    } else {
      start();
    }

    return () => {
      observer?.disconnect();
      suspend();
    };
  }, [colorKey, motion, shape]);

  const colorAt = (index: number) =>
    colors[index % Math.max(colors.length, 1)] ?? "#718079";
  const variables = {
    "--blob-a": colorAt(0),
    "--blob-b": colorAt(1),
    "--blob-c": colorAt(2),
    "--blob-d": colorAt(3),
    "--blob-e": colorAt(4),
    "--blob-f": colorAt(5),
  } as CSSProperties;

  return (
    <div
      className={`${styles.root} ${shape === "portrait" ? styles.portrait : ""} ${className}`}
      style={variables}
      data-webgpu="loading"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
