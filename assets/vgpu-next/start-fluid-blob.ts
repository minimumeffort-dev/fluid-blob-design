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
  dpr?: [number, number];
};

const FALLBACK_COLORS = [
  "#ff785a",
  "#f7be3b",
  "#79bf69",
  "#26b8b0",
  "#ef6c96",
  "#f7e9ce",
] as const;

function hexToRgba(hex: string): Rgba {
  const value = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return [0.44, 0.5, 0.47, 1];
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
  let compiling = false;
  let gpuDisposed = false;
  let loop: FrameLoopHandle | undefined;
  let gpu: Awaited<ReturnType<typeof init>> | undefined;
  let unsubscribeResize: (() => void) | undefined;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const motion = reducedMotion ? 0 : (options.motion ?? 1);
  const validColors = options.colors.filter((color) => /^#[0-9a-f]{6}$/i.test(color));
  const colors = validColors.length > 0 ? validColors : FALLBACK_COLORS;
  const colorAt = (index: number) => hexToRgba(colors[index % colors.length]);
  const root = canvas.parentElement;
  const disposeGpu = () => {
    if (!gpu || gpuDisposed) return;
    gpuDisposed = true;
    gpu.dispose();
  };

  void (async () => {
    try {
      gpu = await init();
      if (disposed) return disposeGpu();

      const webGpuNavigator = navigator as Navigator & {
        gpu: { getPreferredCanvasFormat: () => "bgra8unorm" | "rgba8unorm" };
      };
      const format = webGpuNavigator.gpu.getPreferredCanvasFormat();
      const target = surface(gpu, canvas, {
        dpr: options.dpr ?? [2.5, 3.25],
        alphaMode: "premultiplied",
        colorSpace: "srgb",
        format,
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
            motion,
            shape_mode: options.shape === "portrait" ? 1 : 0,
          },
        },
      });

      unsubscribeResize = target.onResize(({ width, height }) => {
        blob.set({ params: { resolution: [width, height] } });
      });

      compiling = true;
      await blob.compile({ colors: [format] });
      compiling = false;
      if (disposed) return disposeGpu();

      root?.setAttribute("data-webgpu", "ready");
      const time = clock(gpu);
      if (motion === 0) {
        frame(gpu, (currentFrame) => currentFrame.pass(target, blob));
      } else {
        loop = frameLoop(gpu, (currentFrame) => {
          blob.set({ params: { time: time.time } });
          currentFrame.pass(target, blob);
        });
      }
    } catch (error) {
      compiling = false;
      if (disposed) return disposeGpu();
      disposeGpu();
      root?.setAttribute("data-webgpu", "unsupported");
      console.warn("WebGPU blob unavailable; using the CSS fallback.", error);
    }
  })();

  return () => {
    disposed = true;
    unsubscribeResize?.();
    loop?.stop();
    if (!compiling) disposeGpu();
  };
}
