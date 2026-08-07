# GitHub Branding Specifications

This document defines the branding and metadata required to configure the GitHub repository optimally for discovery, professional presentation, and social sharing.

## 1. Repository Metadata

### Repository Name

`VibePulse`

### Short Description (About)

The Engineering Search & Investigation Engine. Observe development activity deterministically without code execution.

### Topics / Tags

`developer-tools`, `observability`, `fastapi`, `react`, `typescript`, `python`, `static-analysis`, `engineering-analytics`, `time-machine`

### Website Link

`https://vibepulse.dev` (or link directly to the docs/README)

---

## 2. Social Preview Image (OpenGraph)

When links to the repository are shared on Twitter/X, Slack, or LinkedIn, this image provides the first impression.

- **Dimensions**: `1280 x 640` pixels (2:1 aspect ratio)
- **Format**: `.png`
- **Background**: Dark, slightly textured (#09090b - Tailwind Zinc 950)
- **Content**:
  - Centered VibePulse Logo (high contrast, glowing effect).
  - A subtle watermark of the Replay Engine UI in the background (opacity 15%).
  - Text: "VibePulse: The Engineering Investigation Engine" in Inter or Roboto Mono font.
- **File Name**: `docs/assets/social-preview.png` (Upload this via Settings > General > Social preview).

---

## 3. README Hero Banner

The top of `README.md` should contain a clean, centered graphic.

- **Dimensions**: `1000 x 300` pixels (or simply a `200x200` logo image above centered text).
- **Format**: `.svg` or `.png` with transparent background.
- **Content**: The logomark paired with the wordmark.
- **Layout Reference**: See the Supabase or Turborepo README headers.

---

## 4. Logo Specification

- **Logomark**: A minimalist representation of a pulse wave crossing a structural grid or a magnifying glass.
- **Colors**:
  - Primary Accent: Emerald (`#10b981`) or Indigo (`#6366f1`) to denote analysis and truth.
  - Text: Crisp white (`#ffffff`) for dark mode, Zinc 900 (`#18181b`) for light mode backgrounds.
- **Formats Required**:
  - `logo-dark.svg`
  - `logo-light.svg`
  - `favicon.ico` (32x32)

---

## 5. GitHub Release Banner

When publishing `v1.0.0` under the GitHub Releases tab, include a custom banner at the top of the release notes.

- **Dimensions**: `1200 x 400` pixels.
- **Content**: Bold text stating "VibePulse v1.0.0: Production Ready" with a collage of the Investigation Engine and Replay Engine screens.
- **Purpose**: Creates an immediate sense of scale and polish for users reading the changelog.
