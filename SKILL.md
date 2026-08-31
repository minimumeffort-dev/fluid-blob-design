---
name: fluid-blob-design
description: Design, implement, or refine animated fluid blobs for web interfaces, including season heroes, decorative page fields, and portrait shells. Use when a project needs organic morphing shapes with palette-faithful color, transparent edges, responsive off-screen placement, high-quality WebGPU rendering, or a lightweight CSS/SVG alternative; do not use for ordinary static gradients.
---

# Fluid Blob Design

Create a shape that feels like one calm, continuous material. Preserve the project's palette and composition instead of treating the blob as a generic aurora effect.

## Start with the visual contract

Inspect the existing page and record:

- the exact source colors and whether lighting may lighten or darken them;
- whether the blob is a hero, background accent, or shell around a fixed image;
- the intended visible size and how far it may extend beyond the viewport;
- whether pointer response, shadow, text, or hover motion was explicitly requested;
- the required browser support and motion/accessibility constraints.

Treat unspecified interaction as absent. Default to slow autonomous morphing, no pointer tracking, no hover displacement, no outer shadow, and no text inside the blob.

## Choose the smallest suitable renderer

- Use CSS gradients plus animated `border-radius` for small decorations or fallbacks.
- Use SVG when the contour must follow a directed path or needs crisp vector masking.
- Use vgpu/WebGPU for large hero blobs, fluid internal color mixing, soft material lighting, or continuously changing signed-distance contours. Read [references/vgpu-pattern.md](references/vgpu-pattern.md) before implementing this path.
- Do not add WebGPU to a project for a tiny static accent. Do not replace a working WebGPU treatment with CSS when visual continuity and edge quality matter.

## Preserve these invariants

1. Pass palette colors as data. Never replace them with a generic rainbow, black core, white wash, or unrelated aurora.
2. Morph the contour and internal material, not the component's page position. For portrait treatments, keep the image still and animate only its surrounding shell.
3. Render transparent pixels outside the signed shape. Use premultiplied alpha and derivative-based edge antialiasing.
4. Leave safety area inside the canvas so the contour never ends on a straight canvas boundary. Let the containing layout extend off-screen when the composition calls for it.
5. Keep the blob wrapper `overflow: visible`. Prevent document-level horizontal scrolling with `overflow-x: clip` on the page shell, not by clipping the blob inside its local component.
6. Keep shadows off by default. If depth is requested, prefer restrained internal lighting; never add a rectangular canvas haze.
7. Cap device-pixel ratio, update resolution on resize, precompile the effect, reuse stable uniforms, and dispose render loops on unmount.
8. Respect `prefers-reduced-motion` with a still frame and provide a palette-faithful CSS or SVG fallback.

## Build in this order

1. Place a static blob at the correct size and z-index before adding motion.
2. Confirm it can go off-screen without local clipping or horizontal scroll.
3. Bind the exact palette and verify recognizable anchor colors remain visible.
4. Add slow, low-amplitude contour morphing. Avoid whole-element translation and scale pulsing.
5. Add internal material movement only if it supports the design. Keep highlights subtle and palette-derived.
6. Add the reduced-motion frame and unsupported-renderer fallback.
7. Run the checks in [references/review-checklist.md](references/review-checklist.md) at desktop and mobile widths.

## Reuse the starter

For a React/Next.js project that can use vgpu, copy and adapt the files in `assets/vgpu-next/`. The starter includes a transparent WGSL blob, a framework-safe renderer, a React wrapper, and a CSS fallback. Rename the component and labels to match the project rather than exposing “starter” terminology in the product.

Do not copy the starter blindly. Fit its palette, aspect ratio, placement, intensity, and performance settings to the page.
