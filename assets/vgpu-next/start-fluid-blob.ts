import {
  clock,
  effect,
  frame,
  frameLoop,
  init,
  surface,
  type FrameLoopHandle,
} from "vgpu";
import shader from "./fluid-blob.wgsl";

type Rgba = [number, number, number, number];

export type FluidBlobOptions = {
  colors: readonly string[];
  shape?: "landscape" | "portrait";
  motion?: number;
  highlightStrength?: number;
  depthStrength?: number;
  dpr?: [number, number];
};

const FALLBACK_COLORS = [
  "#e28c77",
  "#d1a655",
  "#709060",
  "#4f8c84",
  "#8b6e8f",
  "#c6a98e",
] as const;

function hexToRgba(hex: string): Rgba {
  const value = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return [0.5, 0.5, 0.5, 1];
  return [
    Number.parseInt(value.slice(0, 2), 16) / 255,
    Number.parseInt(value.slice(2, 4), 16) / 255,
    Number.parseInt(value.slice(4, 6), 16) / 255,
    1,
  ];
}

export function startFluidBlob(
  canvas: HTMLCanvasElement,
  options: FluidBlobOptions,
): () => void {
  let disposed = false;
  let loop: FrameLoopHandle | undefined;
  let gpu: Awaited<ReturnType<typeof init>> | undefined;
  let unsubscribeResize: (() => void) | undefined;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const validColors = options.colors.filter((color) => /^#[0-9a-f]{6}$/i.test(color));
  const colors = validColors.length > 0 ? validColors : FALLBACK_COLORS;
  const colorAt = (index: number) => hexToRgba(colors[index % colors.length]);
  const root = canvas.parentElement;

  void (async () => {
    try {
      gpu = await init();
      if (disposed) return gpu.dispose();

      const target = surface(gpu, canvas, {
        dpr: options.dpr ?? [1.75, 3],
        alphaMode: "premultiplied",
        colorSpace: "srgb",
        label: "fluid-blob-surface",
      });
      const blob = effect(gpu, shader, {
        label: "fluid-blob",
        set: {
          params: {
            color_a: colorAt(0),
            color_b: colorAt(1),
            color_c: colorAt(2),
            color_d: colorAt(3),
            color_e: colorAt(4),
            color_f: colorAt(5),
            resolution: target.size,
            time: 0,
            motion: reducedMotion ? 0 : (options.motion ?? 0.8),
            shape_mode: options.shape === "portrait" ? 1 : 0,
            highlight_strength: options.highlightStrength ?? 0.1,
            depth_strength: options.depthStrength ?? 0.14,
          },
        },
      });

      unsubscribeResize = target.onResize(({ width, height }) => {
        blob.set({ params: { resolution: [width, height] } });
      });

      await blob.compile({ colors: [navigator.gpu.getPreferredCanvasFormat()] });
      root?.setAttribute("data-webgpu", "ready");

      const time = clock(gpu);
      if (reducedMotion || (options.motion ?? 0.8) === 0) {
        frame(gpu, (currentFrame) => currentFrame.pass(target, blob));
      } else {
        loop = frameLoop(gpu, (currentFrame) => {
          blob.set({ params: { time: time.time } });
          currentFrame.pass(target, blob);
        });
      }
    } catch (error) {
      root?.setAttribute("data-webgpu", "unsupported");
      console.warn("WebGPU blob unavailable; using the CSS fallback.", error);
    }
  })();

  return () => {
    disposed = true;
    unsubscribeResize?.();
    loop?.stop();
    gpu?.dispose();
  };
}
