# Visual and implementation review

## Composition

- The blob supports the hierarchy instead of competing with the headline.
- The visual center is deliberate at common desktop and mobile widths.
- Going off-screen is intentional and does not create horizontal scrolling.
- No local wrapper, card, or canvas edge clips the shape inside the viewport.
- Text is outside the blob unless the design specifically calls for it.

## Color and material

- The supplied palette remains recognizable; no generic rainbow or black center replaced it.
- Highlights are restrained and do not create a milky white tint.
- There is no aurora or colored haze outside the intended shape.
- No outer shadow reveals the canvas rectangle or changes the page background near an edge.
- The fallback uses the same palette and roughly the same silhouette.

## Motion

- The contour morphs slowly without translating around the page.
- Hover does not move the blob unless explicitly requested.
- The loop has no visible jump, twitch, or sudden area change.
- Portrait imagery is stationary while only the surrounding shell moves.
- Reduced-motion mode produces a composed still frame.

## Rendering quality

- Curves remain smooth on high-DPI screens and at browser zoom.
- Transparent edges blend cleanly with the page background.
- DPR is capped, resize updates the render resolution, and no per-frame resources are recreated.
- The shader is validated with `vgpu check --require-validation`.
- WebGPU failure leaves a usable static treatment rather than an empty rectangle.

## Responsive behavior

- Review at narrow mobile, tablet, laptop, and wide desktop widths.
- Check the exact moments where the blob crosses a viewport edge.
- Verify the document width equals the viewport width and there is no horizontal scrollbar.
- Confirm content remains selectable and interactive above the decorative canvas.
