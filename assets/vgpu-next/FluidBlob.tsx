"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import styles from "./fluid-blob.module.css";
import { startFluidBlob } from "./start-fluid-blob";

type FluidBlobProps = {
  colors: readonly string[];
  shape?: "landscape" | "portrait";
  motion?: number;
  highlightStrength?: number;
  depthStrength?: number;
  className?: string;
};

export function FluidBlob({
  colors,
  shape = "landscape",
  motion = 0.8,
  highlightStrength = 0.1,
  depthStrength = 0.14,
  className = "",
}: FluidBlobProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorKey = colors.slice(0, 6).join(":");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return startFluidBlob(canvas, {
      colors: colorKey.split(":"),
      shape,
      motion,
      highlightStrength,
      depthStrength,
    });
  }, [colorKey, depthStrength, highlightStrength, motion, shape]);

  const colorAt = (index: number) => colors[index % Math.max(colors.length, 1)] ?? "#718079";
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
