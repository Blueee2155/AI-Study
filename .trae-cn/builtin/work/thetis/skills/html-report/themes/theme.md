# Theme Format Specification

This document defines the standard format for theme files used in the report skill.

## Usage Instructions

To select and apply a theme:

1. **Select a theme** based on the report type, target audience, and domain — use the Themes Available list below as a reference.
2. **Read the theme file** from the `themes/` directory to extract the 7 color roles and 2 font roles.
3. **Apply the theme** — map colors to CSS variables and embed fonts throughout the artifact.

## Themes Available

The following 12 themes are available:

1. **Ocean Depths** - Professional and calming maritime theme
2. **Sunset Boulevard** - Warm and vibrant sunset colors
3. **Forest Canopy** - Natural and grounded earth tones
4. **Modern Minimalist** - Clean and contemporary grayscale
5. **Golden Hour** - Rich and warm autumnal palette
6. **Arctic Frost** - Cool and crisp winter-inspired theme
7. **Desert Rose** - Soft and sophisticated dusty tones
8. **Tech Innovation** - Bold and modern tech aesthetic (dark theme)
9. **Botanical Garden** - Fresh and organic garden colors
10. **Midnight Galaxy** - Dramatic and cosmic deep tones (dark theme)
11. **Indigo Dusk** - Refined indigo accents on cool gray for specs and planning docs
12. **Soft Morandi** - Japanese-inspired muted sage and warm cream tones

## Theme File Format

Each theme file follows this exact structure:

```markdown
# [Theme Name]

[One-line description]

## Color Palette

| Role | Hex | Usage |
|------|-----|-------|
| background | `#xxxxxx` | Page canvas background (large area) |
| surface | `#xxxxxx` | Secondary background (cards, callouts, code blocks) |
| text | `#xxxxxx` | Primary text color |
| text-muted | `#xxxxxx` | Secondary text (meta, captions, auxiliary info) |
| border | `#xxxxxx` | Dividers, strokes |
| primary | `#xxxxxx` | Primary accent (links, heading decorations, quote lines) |
| secondary | `#xxxxxx` | Secondary accent (tag backgrounds, hover states, subtle highlights) |

## Typography

| Role | Font | Weights | Files |
|------|------|---------|-------|
| font | [FontName] | [weight1], [weight2] | [FontName]-Regular.ttf, [FontName]-Bold.ttf |
| mono | [FontName] | 400 | [FontName]-Regular.ttf |

## Best Used For

[Use cases description]
```

## Semantic Color Roles

| Role | Purpose |
|------|---------|
| `background` | Main page canvas background (large area fill) |
| `surface` | Secondary background for cards, callouts, code blocks |
| `text` | Primary text color — must have ≥ 4.5:1 contrast ratio against `background` (WCAG AA) |
| `text-muted` | Secondary text for meta info, captions, less important content |
| `border` | Dividers, strokes, separators |
| `primary` | Main accent color for links, heading decorations, quote lines |
| `secondary` | Supporting accent for tag backgrounds, hover states, subtle highlights |

## Typography Roles

| Role | Purpose |
|------|---------|
| `font` | Document font for all text (headings use Bold weight, body uses Regular weight). Hierarchy is achieved through size and weight, not different font families. |
| `mono` | Monospace font for code blocks and inline code |

## Contrast Requirements

- `text` on `background`: ≥ 4.5:1 (WCAG AA for normal text)
- `text-muted` on `background`: ≥ 3:1 (WCAG AA for large text / UI components)
- `text` on `surface`: ≥ 4.5:1

## Font Selection Rules

- Fonts must be chosen from the `canvas-fonts/` directory
- The `font` role should have both Regular and Bold weights available (preferred)
- The `mono` role needs at least a Regular weight
- Font names in the Files column must match actual filenames in `canvas-fonts/`

## Application Process

After a preferred theme is selected:
1. Read the corresponding theme file from the `themes/` directory
2. Apply the specified colors and fonts consistently throughout the deck
3. Ensure proper contrast and readability
4. Maintain the theme's visual identity across all slides

## Create your Own Theme

To handle cases where none of the existing themes work for an artifact, create a custom theme following the format above. Based on provided inputs, generate a new theme with appropriate colors and fonts from `canvas-fonts/`. Give the theme a descriptive name. After generating the theme, show it for review and verification. Following that, apply the theme as described above.
