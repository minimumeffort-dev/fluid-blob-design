# Fluid Blob Design

Fluid Blob Design is a Codex skill for creating calm, organic blobs that feel like part of a real interface, not a generic shader demo.

It grew out of practical design work around hero blobs, portrait shells, color-season pages, and responsive layouts. The skill helps Codex preserve the colors and composition that already make a project feel distinct.

## What it helps with

- Large animated hero blobs
- Portrait shells where the image stays still and the surrounding shape moves
- Palette-driven WebGPU materials
- Lightweight CSS and SVG alternatives
- Off-screen placement without local clipping or horizontal scrolling
- Smooth transparent edges, reduced motion, and static fallbacks

The default direction is intentionally restrained. Motion is slow, hover does not move the composition, shadows stay off, and the original palette remains recognizable.

## Install the skill

### Ask Codex to install it

Open Codex and ask:

```text
Install the skill from https://github.com/minimumeffort-dev/fluid-blob-design
```

Codex will install it in your personal skills directory. Start a new task after installation so the skill is available.

### Install it with GitHub CLI

First, make sure GitHub CLI is signed in:

```sh
gh auth login
```

Then clone the repository into your personal Codex skills directory:

```sh
gh repo clone minimumeffort-dev/fluid-blob-design ~/.codex/skills/fluid-blob-design
```

Start a new Codex task after cloning it.

### Update an existing installation

```sh
git -C ~/.codex/skills/fluid-blob-design pull
```

## Use it

Mention the skill directly when you want predictable results:

```text
$fluid-blob-design create a floating hero blob using the colors already defined for this page
```

```text
$fluid-blob-design add a portrait blob, but keep the avatar image completely still
```

```text
$fluid-blob-design refine this blob so it can sit partly off-screen without clipping or horizontal scroll
```

Codex can also select the skill automatically when a request clearly involves an animated fluid blob.

## Use the vgpu starter in a project

The reusable React and Next.js starter lives in [`assets/vgpu-next`](assets/vgpu-next). It includes the component, renderer, WGSL shader, CSS fallback, and TypeScript declarations.

Install vgpu in the target project:

```sh
npm install vgpu
```

Then ask Codex to adapt the starter to that project's framework, palette, layout, and browser requirements. The detailed setup and validation notes are in [`references/vgpu-pattern.md`](references/vgpu-pattern.md).

Installing this Codex skill does not add vgpu to every project. The dependency is only needed when a project uses the WebGPU starter.

## What is in the repository

- [`SKILL.md`](SKILL.md) contains the design workflow and core rules.
- [`references/vgpu-pattern.md`](references/vgpu-pattern.md) covers the vgpu and WebGPU implementation pattern.
- [`references/review-checklist.md`](references/review-checklist.md) covers visual quality, motion, clipping, and responsive checks.
- [`assets/vgpu-next`](assets/vgpu-next) contains the reusable implementation starter.

The goal is simple: make fluid motion feel native to the page while keeping the page's own colors and hierarchy intact.
