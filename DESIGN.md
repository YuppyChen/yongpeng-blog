---
version: alpha
name: huasheng.ai
description: Dark, editorial personal brand site for Huasheng Alchain with a cinematic hero, serif-led typography, muted gold accent, and restrained card/button system.
colors:
  primary: "#b8894e"
  secondary: "#f2eadc"
  tertiary: "#374151"
  neutral: "#121212"
  surface: "#121212"
  on-surface: "#f2eadc"
  error: "#b8894e"
typography:
  headline-display:
    fontFamily: "Playfair Display"
    fontSize: "96px"
    fontWeight: 400
    lineHeight: 115
    letterSpacing: "-1.92px"
    fontFeature: "normal"
  headline-lg:
    fontFamily: "Playfair Display"
    fontSize: "68px"
    fontWeight: 400
    lineHeight: 82
    letterSpacing: "-0.32px"
    fontFeature: "normal"
  headline-md:
    fontFamily: "Playfair Display"
    fontSize: "48px"
    fontWeight: 400
    lineHeight: 58
    letterSpacing: "-0.28px"
    fontFeature: "normal"
  body-lg:
    fontFamily: "Playfair Display"
    fontSize: "24px"
    fontWeight: 300
    lineHeight: 36
    letterSpacing: "0px"
    fontFeature: "normal"
  body-md:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 24
    letterSpacing: "0px"
    fontFeature: "normal"
  body-sm:
    fontFamily: "Inter"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 20
    letterSpacing: "0.02em"
    fontFeature: "normal"
  label-lg:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: 300
    lineHeight: 24
    letterSpacing: "0.08em"
    fontFeature: "small-caps"
  label-md:
    fontFamily: "Inter"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 16
    letterSpacing: "0.18em"
    fontFeature: "small-caps"
  label-sm:
    fontFamily: "Inter"
    fontSize: "10px"
    fontWeight: 400
    lineHeight: 14
    letterSpacing: "0.22em"
    fontFeature: "small-caps"
rounded:
  none: "0px"
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "24px"
  md: "40px"
  lg: "64px"
  xl: "120px"
components:
  button:
    primary:
      borderRadius: "{rounded.sm}"
      borderWidth: "1px"
      borderStyle: solid
      padding: "8px 16px"
      fontSize: "{typography.body-md.fontSize}"
      fontWeight: 400
      minWidth: "120px"
      minHeight: "44px"
      textDecoration: none
      boxShadow: none
      backgroundColor: "{colors.secondary}"
      color: "{colors.neutral}"
      borderColor: transparent
    secondary:
      borderRadius: "{rounded.none}"
      borderWidth: "1px"
      borderStyle: solid
      padding: "8px 16px"
      fontSize: "{typography.body-md.fontSize}"
      fontWeight: 400
      minWidth: "120px"
      minHeight: "44px"
      textDecoration: none
      boxShadow: none
      backgroundColor: transparent
      color: "{colors.on-surface}"
      borderColor: "#f2eadc1f"
    link:
      borderRadius: "{rounded.none}"
      borderWidth: "0px"
      borderStyle: none
      padding: "0px"
      fontSize: "{typography.body-md.fontSize}"
      fontWeight: 300
      minWidth: "0px"
      minHeight: "0px"
      textDecoration: underline
      boxShadow: none
      backgroundColor: transparent
      color: "{colors.on-surface}"
  card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.tertiary}"
    borderRadius: "{rounded.md}"
    borderWidth: "1px"
    borderStyle: solid
    padding: "16px"
    boxShadow: none
    textColor: "{colors.on-surface}"
---

# Overview

huasheng.ai is a dark, premium personal-brand homepage with a cinematic editorial tone. The visual language blends high-contrast monochrome imagery, warm gold accents, and elegant serif headlines with restrained sans-serif utility text. The page should feel like a creator portfolio, not a SaaS dashboard: sparse, deliberate, and confident.

Primary layout cues from the screenshot and homepage copy:
- Large hero on the left, framed portrait on the right.
- Thin, low-contrast navigation at the top.
- Small-caps metadata and section labels throughout.
- Minimal chrome, no decorative shadows, no loud gradients.
- Strong emphasis on typography hierarchy and whitespace.

# Colors

Use a dark base with warm text and muted gold accent.

- `primary` is the brand accent gold used for the italic wordmark, primary CTA, and small emphasis details.
- `secondary` is the main light text color for readable content on dark surfaces.
- `tertiary` is a subdued structural gray for dividers, borders, and low-emphasis UI.
- `neutral` and `surface` are the same near-black background tone.
- `on-surface` is the default text color on dark backgrounds.
- `error` is currently mapped to the brand accent because the source token set does not provide a distinct error color; treat this as provisional.

Usage guidance:
- Prefer `#121212` backgrounds with `#f2eadc` text.
- Reserve `#b8894e` for emphasis, active CTAs, and brand highlights.
- Keep borders faint and infrequent; the design should not look grid-heavy.
- Do not introduce brighter accent colors unless a new brand decision is made.

# Typography

Typography is the core of the system. Use Playfair Display for expressive, editorial hierarchy and Inter for utility/navigation/button text.

## Headline styles
- `headline-display`: 96px / 115px, Playfair Display, regular weight, tight tracking.
- `headline-lg`: 68px / 82px, Playfair Display, regular weight.
- `headline-md`: 48px / 58px, Playfair Display, regular weight.

## Body styles
- `body-lg`: 24px / 36px, Playfair Display, light weight; used for the hero strapline and editorial intro text.
- `body-md`: 16px / 24px, Inter; use for buttons, nav, metadata, and supporting UI.
- `body-sm`: 14px / 20px, Inter; use for dense labels and captions.

## Label styles
- `label-lg`, `label-md`, `label-sm`: all Inter-based with wide tracking and small-caps behavior for section tags, reel labels, and metadata.

Typography rules:
- Headlines should be left-aligned and allow generous line breaks.
- Maintain the serif/sans contrast; do not replace the hero serif with Inter.
- Use letterspacing sparingly; only labels and navigation should feel airy.
- Avoid heavy weights. The brand voice is refined, not bold or shouted.

# Layout

The layout is a spacious, asymmetrical two-column hero followed by stacked editorial sections.

## Page structure
1. Top nav: brand on the left, compact section links across the top.
2. Hero: large title cluster left, image panel right.
3. Supporting statement and CTAs beneath the hero title.
4. Content sections below with section labels, metrics, works, media, and services.

## Spacing
Use the spacing tokens consistently:
- `xs` for tight label/icon gaps.
- `sm` for inline text blocks and button groups.
- `md` for section-internal separation.
- `lg` for section spacing.
- `xl` for major vertical rhythm and transitions between page regions.

## Alignment and rhythm
- Keep content aligned to a clear left edge grid.
- Preserve large negative space around the hero.
- Use narrow, low-contrast dividers rather than boxed containers.
- Let images carry visual weight; text should remain lightweight and editorial.

# Elevation & Depth

The system intentionally avoids elevation.

- All shadow tokens are `none`.
- Do not use material-style depth, floating cards, or colored glows.
- Depth should come from contrast, image framing, and whitespace only.
- If a component needs separation, use a 1px border in `tertiary` or a faint alpha border.

# Shapes

The shape language is minimal and rectilinear.

- `none`: 0px
- `sm`: 4px, used for primary buttons and small affordances.
- `md`: 8px, used for cards and framed content containers.
- `lg`: 12px, `xl`: 16px, use sparingly if a larger container radius is required.
- `full`: reserve for pill-style chips only.

Shape rules:
- Buttons may be slightly rounded, but most containers should remain sharp or near-sharp.
- Avoid fully rounded cards.
- Image frames should feel precise and architectural.

# Components

## Buttons
### Primary
Use for the main conversion action, such as “Get in Touch”.
- Light fill, dark text, `sm` rounding.
- Minimum height 44px.
- Clear hit target, restrained padding.
- Best placed near the hero statement.

### Secondary
Use for tertiary navigation or alternate CTA actions.
- Transparent background.
- Very subtle border.
- Sharp corners.
- Avoid making it visually louder than the primary button.

### Link
Use for inline or low-emphasis actions such as “View Works”.
- No container chrome.
- Underlined or otherwise clearly textual.
- Light text on dark surface.

## Card
Use for framed content blocks, work items, and media previews.
- Dark surface with 1px border.
- `md` radius.
- No shadow.
- Padding should feel generous but not padded like a dashboard.

## Navigation
- Keep nav text small, widely tracked, and low-contrast.
- Active state can use the accent gold or a brighter opacity of the base text.
- Maintain a simple horizontal row; do not convert top navigation into a hamburger on desktop.

## Hero image panel
- Use a bordered image frame with minimal chrome.
- Prefer monochrome or low-saturation imagery.
- Keep the panel aligned with the hero title cluster rather than centered on the viewport.

## Section labels and metrics
- Render labels in uppercase/small-caps style with Inter.
- Keep metrics compact and editorial, not KPI-dashboard-like.
- Use thin separators and careful spacing instead of boxed stat cards.

# Do's and Don'ts

## Do
- Do use `#121212` as the dominant background.
- Do use Playfair Display for the main headline and hero paragraph.
- Do use Inter for navigation, labels, buttons, and metadata.
- Do keep the hero composition asymmetrical with a strong left text block and right image.
- Do use the gold accent sparingly for emphasis and primary CTA buttons.
- Do preserve generous whitespace and quiet, low-contrast borders.
- Do keep component shadows at `none`.

## Don't
- Don't introduce bright gradients, neon colors, or glassmorphism.
- Don't add heavy shadows, glows, or layered elevation.
- Don't use rounded, bubbly UI chrome or pill buttons for primary actions.
- Don't center everything; the design should retain an editorial left bias.
- Don't replace the serif headline system with a generic sans-only stack.
- Don't overcrowd the page with boxed widgets or dashboard-style cards.
- Don't use saturated error states or attention-grabbing reds unless a new token set is introduced.