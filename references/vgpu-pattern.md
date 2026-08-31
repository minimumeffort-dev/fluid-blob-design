# vgpu/WebGPU pattern

Use this reference for a large, high-quality animated blob in a React or Next.js interface.

## Setup

1. Install `vgpu`.
2. Configure the `.wgsl` loader for the project's bundler and add the shipped WGSL TypeScript declaration.
3. Copy the files from `assets/vgpu-next/` into the component directory.
4. Keep the canvas in a client component and initialize WebGPU only after mount.
5. Validate each shader independently. A normal application build does not validate WGSL.
6. Run the shipped deterministic renderer after adapting the shader or its defaults.

For Next.js with Turbopack, add this top-level configuration:

```ts
const nextConfig = {
  turbopack: {
    rules: {
      "*.wgsl": {
        loaders: ["@vgpu/wgsl/loader-webpack"],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
```

Keep the equivalent webpack rule too when the project uses both bundlers.

## Component architecture

- The layout owns placement and visible size.
- The React wrapper owns the canvas and palette props.
- The renderer owns device setup, surface resizing, the stable effect, and cleanup.
- The WGSL shader owns shape, material, antialiasing, and transparency.
- A CSS pseudo-element supplies the unsupported/loading fallback and disappears after the renderer reports ready.

Do not attach pointer listeners unless the product explicitly requires pointer response. Hero blobs should normally animate autonomously, so hovering does not move the composition.

## Layout pattern

The local visual must remain unclipped while the page remains free of horizontal scrolling:

```css
.page-shell {
  overflow-x: clip;
}

.hero {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.78fr);
}

.hero-blob {
  position: relative;
  z-index: 1;
  width: min(78vw, 1200px);
  aspect-ratio: 1.22;
  justify-self: end;
  margin-bottom: clamp(-420px, -26vw, -280px);
  transform: translate(
    clamp(300px, 24vw, 390px),
    clamp(-170px, -10vw, -125px)
  );
  overflow: visible;
  pointer-events: none;
}

.hero-copy {
  position: relative;
  z-index: 2;
}

@media (max-width: 1050px) {
  .hero {
    grid-template-columns: 1fr;
  }

  .hero-blob {
    width: min(88vw, 620px);
    justify-self: center;
    margin-bottom: 0;
    transform: none;
  }
}
```

An element partly beyond the viewport is intentional. A contour that terminates on a straight line inside the viewport indicates a clipped canvas or an undersized safety margin.

## Shader rules

- Express the contour as a signed-distance field.
- Normalize for aspect ratio before evaluating the SDF.
- Reserve roughly 10–18% transparent canvas margin around the maximum deformation.
- Keep contour harmonics low-frequency and low-amplitude. Two to four sine terms are enough.
- Use `fwidth(distance)` with `smoothstep` for edge antialiasing.
- Return premultiplied color: `vec4f(rgb * alpha, alpha)`.
- Mix source palette colors with normalized weights. Keep specular light separate from the base material instead of baking in a white wash.
- Avoid per-pixel work that does not materially improve the effect. Use a single fullscreen effect unless the design genuinely needs multiple passes.

## Layered material pattern

The shipped shader uses the material structure proven in the reference implementation:

1. Evaluate the signed-distance contour and derive antialiased alpha.
2. Use shallow negative distance to create a narrow inner-edge band and an exponential fine rim.
3. Estimate the contour normal from neighboring SDF samples.
4. Build an angular palette for contour light.
5. Evaluate the six-color liquid palette twice, transforming the second field so the two fields cross.
6. Mix those fields with a low-contrast interference band.
7. Add opposing contour specular lights and a phase-driven glint.
8. Apply grain only inside the alpha mask and return premultiplied color.

This is still one fullscreen effect. The extra quality comes from coordinated fields, not extra render passes. Keep the source colors as uniform data and keep the light separate from the base color.

## Runtime rules

- Use one stable effect and update plain uniform values in place.
- Pass `resolution` from the surface and update it in the resize callback.
- Cap DPR rather than using unbounded `devicePixelRatio`; the shipped hero uses `[2.5, 3.25]` for its large transparent contour. Lower the range when a page renders several smaller blobs at once.
- Precompile before revealing the WebGPU layer.
- Stop the frame loop and dispose the device in React cleanup. If cleanup runs while pipeline compilation is pending, defer device disposal until compilation settles so development remounts do not produce a disposal race.
- Render one still frame when reduced motion is enabled.
- Mark the canvas decorative unless it conveys content that is unavailable elsewhere.

## Validation

Run:

```sh
npx vgpu check path/to/fluid-blob.wgsl --require-validation
npx vgpu doctor --pretty
```

Then run the copied deterministic renderer from the target project root:

```sh
node path/to/render-fluid-blob.mjs
```

The renderer writes landscape, motion, and portrait frames, checks solid and transparent coverage, rejects visible pixels on the canvas edge, and compares two time-separated frames. Treat a low average channel delta as a motion regression even when one still image looks polished.

Then render the real page in a WebGPU-capable browser and inspect the pixels at desktop and mobile widths. Check the browser console for validation or device errors.
