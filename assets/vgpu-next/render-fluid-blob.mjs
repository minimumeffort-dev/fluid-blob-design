import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRequire = createRequire(join(process.cwd(), "package.json"));
const { PNG } = projectRequire("pngjs");
const vgpuNodePath = projectRequire.resolve("vgpu/node");
const { effect, init, target } = await import(pathToFileURL(vgpuNodePath).href);

const assetDirectory = dirname(fileURLToPath(import.meta.url));
const shader = readFileSync(join(assetDirectory, "fluid-blob.wgsl"), "utf8");
const outputDirectory = join(process.cwd(), "artifacts", "fluid-blob");

async function main() {
  const gpu = await init();

  try {
    async function renderBlob({ width, height, shapeMode, time, output }) {
      const colorTarget = target(gpu, { size: [width, height] });
      const blob = effect(gpu, shader, {
        set: {
          params: {
            color_a: [1, 0.47, 0.35, 1],
            color_b: [0.97, 0.75, 0.23, 1],
            color_c: [0.47, 0.75, 0.41, 1],
            color_d: [0.15, 0.72, 0.69, 1],
            color_e: [0.94, 0.42, 0.59, 1],
            color_f: [0.97, 0.91, 0.81, 1],
            resolution: [width, height],
            time,
            motion: 1,
            shape_mode: shapeMode,
          },
        },
      });

      blob.draw(colorTarget);
      const pixels = await colorTarget.read();
      const outputPath = join(outputDirectory, output);
      const png = new PNG({ width, height });
      png.data.set(pixels);
      writeFileSync(outputPath, PNG.sync.write(png));

      let solidPixels = 0;
      let transparentPixels = 0;
      let visiblePixels = 0;
      let visibleColorSum = 0;
      let visibleEdgePixels = 0;

      for (let index = 0; index < pixels.length; index += 4) {
        const pixelIndex = index / 4;
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        const alpha = pixels[index + 3];
        if (alpha > 245) solidPixels += 1;
        if (alpha < 8) transparentPixels += 1;
        if ((x < 3 || x >= width - 3 || y < 3 || y >= height - 3) && alpha > 8) {
          visibleEdgePixels += 1;
        }
        if (alpha > 8) {
          visiblePixels += 1;
          visibleColorSum += (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
        }
      }

      const totalPixels = width * height;
      const averageVisibleChannel = visibleColorSum / Math.max(visiblePixels, 1);
      if (
        solidPixels < totalPixels * 0.2
          || transparentPixels < totalPixels * 0.08
          || visiblePixels < totalPixels * 0.25
          || averageVisibleChannel < 12
          || averageVisibleChannel > 210
          || visibleEdgePixels > 0
      ) {
        throw new Error(
          `Unexpected ${output}: solid=${solidPixels}, transparent=${transparentPixels}, visible=${visiblePixels}, average=${averageVisibleChannel}, edge=${visibleEdgePixels}`,
        );
      }

      return {
        pixels,
        metrics: {
          outputPath,
          width,
          height,
          solidPixels,
          transparentPixels,
          visiblePixels,
          visibleEdgePixels,
          averageVisibleChannel: Math.round(averageVisibleChannel),
        },
      };
    }

    mkdirSync(outputDirectory, { recursive: true });
    const firstFrame = await renderBlob({
      width: 320,
      height: 262,
      shapeMode: 0,
      time: 1.25,
      output: "landscape.png",
    });
    const secondFrame = await renderBlob({
      width: 320,
      height: 262,
      shapeMode: 0,
      time: 5.25,
      output: "landscape-motion.png",
    });
    const portraitFrame = await renderBlob({
      width: 230,
      height: 300,
      shapeMode: 1,
      time: 1.25,
      output: "portrait.png",
    });

    let motionDifference = 0;
    for (let index = 0; index < firstFrame.pixels.length; index += 1) {
      motionDifference += Math.abs(firstFrame.pixels[index] - secondFrame.pixels[index]);
    }
    motionDifference /= firstFrame.pixels.length;
    if (motionDifference < 7) {
      throw new Error(`Blob movement is too subtle: average channel delta=${motionDifference}`);
    }

    console.log(JSON.stringify({
      frames: [firstFrame.metrics, secondFrame.metrics, portraitFrame.metrics],
      motionDifference: Math.round(motionDifference),
    }, null, 2));
  } finally {
    gpu.dispose();
  }
}

void main();
