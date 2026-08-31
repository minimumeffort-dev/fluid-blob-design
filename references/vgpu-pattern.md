# vgpu/WebGPU pattern

Use this reference for a large, high-quality animated blob in a React or Next.js interface.

## Setup

1. Install `vgpu`.
2. Configure the `.wgsl` loader for the project's bundler and add the shipped WGSL TypeScript declaration.
3. Copy the files from `assets/vgpu-next/` into the component directory.
4. Keep the canvas in a client component and initialize WebGPU only after mount.
5. Validate each shader independently. A normal application build does not validate WGSL.

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
}

.hero-blob {
  position: absolute;
  z-index: 0;
  right: clamp(-22rem, -16vw, -8rem);
  top: 50%;
  width: min(78vw, 74rem);
  aspect-ratio: 1.25;
  transform: translateY(-50%);
  overflow: visible;
  pointer-events: none;
}

.hero-copy {
  position: relative;
  z-index: 1;
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
- Mix source palette colors with normalized weights. Expose lighting strength separately instead of baking in a white wash.
- Avoid per-pixel work that does not materially improve the effect. Use a single fullscreen effect unless the design genuinely needs multiple passes.

## Runtime rules

- Use one stable effect and update plain uniform values in place.
- Pass `resolution` from the surface and update it in the resize callback.
- Cap DPR rather than using unbounded `devicePixelRatio`; a range around `[1.75, 3]` is a strong hero default.
- Precompile before revealing the WebGPU layer.
- Stop the frame loop and dispose the device in React cleanup.
- Render one still frame when reduced motion is enabled.
- Mark the canvas decorative unless it conveys content that is unavailable elsewhere.

## Validation

Run:

```sh
npx vgpu check path/to/fluid-blob.wgsl --require-validation
npx vgpu doctor --pretty
```

Then render the real page in a WebGPU-capable browser and inspect the pixels at desktop and mobile widths. Check the browser console for validation or device errors.
