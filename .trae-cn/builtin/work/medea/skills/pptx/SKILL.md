---
name: pptx
description: "Presentation creation, editing, and analysis. When you need to work with presentations (.pptx files) for: (1) Creating new presentations, (2) Modifying or editing content, (3) Working with layouts, (4) Adding comments or speaker notes, or any other presentation tasks"
license: Proprietary. LICENSE.txt has complete terms
---

# PPTX Skill

## Quick Reference

| Task | Guide |
|------|-------|
| Read/analyze content | `python3 -m markitdown presentation.pptx` |
| Edit or create from template | Read [editing.md](editing.md) |
| Create a new from scratch | Read [from-scratch.md](from-scratch.md) |

---

## Reading Content

```bash
# Text extraction
python3 -m markitdown presentation.pptx

# Visual overview
python3 scripts/thumbnail.py presentation.pptx

# Raw XML
python3 scripts/unpack.py presentation.pptx unpacked/
```

---

## Editing Workflow

**Read [editing.md](editing.md) for full details.**

1. Analyze template with `thumbnail.py`
2. Unpack → manipulate slides → edit content → clean → pack

---

## Creating from Scratch (HTML-First Workflow)

Use this workflow when creating presentations from scratch with a design-first approach.

**⚠️ MANDATORY WORKFLOW — DO NOT SKIP STEPS**

You **MUST** follow these steps in order:
1. Create a Design Philosophy document
2. **Generate an HTML preview first** (1920×1080px per slide)
3. Convert HTML to PPTX using `dom-to-pptx`

**Key constraints:**
- Each slide: `1920×1080px` (16:9)
- Pure static display, no animations
- **NO mixing serif and sans-serif fonts**
- **Web fonts only** — system fonts are forbidden for CJK characters

---

### Step 1: Create Design Philosophy

Before writing any code, establish a design philosophy document. This ensures visual consistency and guides all creative decisions.

#### Design Philosophy Template

Create a `.md` file with the following structure:

```markdown
## Design Philosophy: [Topic Name]

**Style Name**: [e.g., "Eastern Elegance", "Tech Minimal", "Corporate Bold"]

### Color System

| Role | Hex | Usage |
|------|-----|-------|
| Primary | XXXXXX | Titles, emphasis (60-70% visual weight) |
| Secondary | XXXXXX | Body text, supporting elements |
| Accent | XXXXXX | Highlights, call-to-actions |
| Background (dark) | XXXXXX | Cover/closing slides |
| Background (light) | XXXXXX | Content slides |

**Color Principle**: One color dominates (60-70%), with 1-2 supporting tones and one sharp accent.

### Typography

| Element | Size | Weight |
|---------|------|--------|
| Slide title | 36-44pt | Bold |
| Section header | 20-24pt | Bold |
| Body text | 14-16pt | Regular |
| Caption | 10-12pt | Light/Muted |

### Page Structure

| Page | Content | Layout Type |
|------|---------|-------------|
| 1 | Cover | Dark fullscreen, centered title |
| 2 | Introduction | Two-column (text + visual) |
| 3-N | Content | Cards / Timeline / Grid |
| N | Closing | Dark fullscreen, summary |

### Visual Motif

Pick ONE distinctive element and repeat across all slides:
- Icons in colored circles
- Left-side accent bars on cards
- Rounded corners on all shapes
- Consistent shadow style
```

---

### Step 2: Generate HTML Preview (REQUIRED)

**⚠️ This step is MANDATORY. You must create an HTML file before generating PPTX.**

#### HTML Constraints

| Constraint | Requirement |
|------------|-------------|
| Slide dimensions | Fixed `1920×1080px` (16:9 ratio) |
| Interactivity | None — pure static display |
| Animations | None — no CSS transitions/animations |
| Font mixing | **Forbidden** — use one font family consistently |
| Colors | Use CSS variables for consistency |
| Fonts | **Web fonts only** — system fonts are forbidden |

#### HTML Template Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Presentation Title</title>
    <!-- Web Fonts: REQUIRED for CJK characters - crossorigin="anonymous" enables font embedding -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet" crossorigin="anonymous">
    <style>
        :root {
            --primary: #XXXXXX;
            --secondary: #XXXXXX;
            --accent: #XXXXXX;
            --bg-dark: #XXXXXX;
            --bg-light: #XXXXXX;
            --font-main: 'Noto Sans SC', sans-serif;  /* Do NOT use system fonts as fallback */
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: var(--font-main);
            background: #1a1a1a;
        }

        .slide {
            width: 1920px;
            height: 1080px;
            position: relative;
            overflow: hidden;
            margin: 0 auto 20px;
            background: var(--bg-light);
        }

        .slide-dark {
            background: var(--bg-dark);
            color: var(--bg-light);
        }
    </style>
</head>
<body>
    <!-- Slide 1: Cover -->
    <div class="slide slide-dark">
        <h1 style="...">Title</h1>
        <p style="...">Subtitle</p>
    </div>

    <!-- Slide 2: Content -->
    <div class="slide">
        <h2 style="...">Section Title</h2>
        <p style="...">Content</p>
    </div>

    <!-- More slides... -->
</body>
</html>
```

#### CSS Positioning Guidelines

Use absolute positioning with pixel values for precise control:

```css
.element {
    position: absolute;
    left: 100px;    /* Distance from left */
    top: 200px;     /* Distance from top */
    width: 400px;   /* Element width */
    height: 300px;  /* Element height */
}
```

These pixel values will be converted to inches during PPTX generation:
- X position: `left_px / 1920 * 10` inches
- Y position: `top_px / 1080 * 5.625` inches
- Width: `width_px / 1920 * 10` inches
- Height: `height_px / 1080 * 5.625` inches

---

### Step 3: Convert HTML to PPTX

Use `dom-to-pptx` for high-fidelity automatic conversion from HTML to PPTX.

#### Installation

```bash
cd skills/pptx/dom-to-pptx
npm install
```

#### Usage

```bash
# Basic usage
node convert.js /path/to/presentation.html output.pptx

# Custom slide selector
node convert.js presentation.html output.pptx --selector ".page"

# Rasterize SVGs (disable vector export)
node convert.js presentation.html output.pptx --no-svg
```

#### How It Works

The conversion script uses Puppeteer to:
1. Load your HTML file in a headless browser
2. Inject the `dom-to-pptx` library
3. Automatically capture computed styles (Flexbox/Grid positions, gradients, shadows)
4. Map styles to native PowerPoint shapes and text boxes
5. Export as a fully editable PPTX file

#### Features

| Feature | Description |
|---------|-------------|
| Auto Font Embedding | Automatically detects and embeds fonts used in HTML |
| Complex Gradients | CSS `linear-gradient` converted to vector SVGs |
| Accurate Shadows | CSS shadows mapped to PPT's polar coordinate system |
| Rounded Images | Anti-halo processing for rounded corners |
| SVG Vector Export | SVGs remain editable in PowerPoint |
| Auto Scaling | 1920×1080 automatically scales to 16:9 PPT slides |

---

### Typography Rules

#### The No-Mixing Principle

**⚠️ NEVER mix serif and sans-serif fonts in the same presentation.**

- Mixed font styles create visual dissonance
- Consistent typography conveys professionalism
- Presentations feel cohesive when fonts match

#### Recommended Font Pairings (Web Fonts Only)

**⚠️ System fonts are FORBIDDEN. Use Google Fonts only.**

| Use Case | Title | Body | Google Fonts URL |
|----------|-------|------|------------------|
| Modern Chinese | Noto Sans SC | Noto Sans SC | `family=Noto+Sans+SC:wght@300;400;500;700` |
| Traditional Chinese | Noto Serif SC | Noto Serif SC | `family=Noto+Serif+SC:wght@400;700` |
| Traditional Chinese (TW) | Noto Sans TC | Noto Sans TC | `family=Noto+Sans+TC:wght@400;700` |
| Japanese | Noto Sans JP | Noto Sans JP | `family=Noto+Sans+JP:wght@400;700` |
| Korean | Noto Sans KR | Noto Sans KR | `family=Noto+Sans+KR:wght@400;700` |
| International | Inter | Inter | `family=Inter:wght@300;400;500;700` |
| Technical | JetBrains Mono | JetBrains Mono | `family=JetBrains+Mono:wght@400;700` |

---

### Web Fonts (Preventing CJK Character Issues)

**⚠️ CRITICAL: Use web fonts to prevent garbled CJK characters in PPTX output.**

System fonts may not be available in the Puppeteer headless environment, causing CJK (Chinese, Japanese, Korean) characters to render incorrectly in the final PPTX. Always use web fonts via Google Fonts or local `@font-face` declarations.

#### Method 1: Google Fonts (Recommended)

**⚠️ IMPORTANT: You MUST add `crossorigin="anonymous"` to the stylesheet link for font embedding to work.**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <!-- crossorigin="anonymous" is REQUIRED for dom-to-pptx font embedding -->
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet" crossorigin="anonymous">
    <style>
        :root {
            --font-main: 'Noto Sans SC', sans-serif;
        }
        body {
            font-family: var(--font-main);
        }
    </style>
</head>
```

#### Available Google CJK Fonts

| Font Name | Style | URL Parameter |
|-----------|-------|---------------|
| Noto Sans SC | Sans-serif (Simplified Chinese) | `family=Noto+Sans+SC:wght@300;400;500;700` |
| Noto Serif SC | Serif (Simplified Chinese) | `family=Noto+Serif+SC:wght@400;700` |
| Noto Sans TC | Sans-serif (Traditional Chinese) | `family=Noto+Sans+TC:wght@400;700` |
| Noto Sans JP | Sans-serif (Japanese) | `family=Noto+Sans+JP:wght@400;700` |
| Noto Sans KR | Sans-serif (Korean) | `family=Noto+Sans+KR:wght@400;700` |
| ZCOOL XiaoWei | Artistic Chinese | `family=ZCOOL+XiaoWei` |
| Ma Shan Zheng | Handwritten Chinese | `family=Ma+Shan+Zheng` |

#### Method 2: Local Font Files (@font-face)

For offline use or custom fonts:

```html
<style>
    @font-face {
        font-family: 'CustomChinese';
        src: url('./fonts/SourceHanSansCN-Regular.woff2') format('woff2'),
             url('./fonts/SourceHanSansCN-Regular.woff') format('woff');
        font-weight: 400;
        font-style: normal;
        font-display: swap;
    }

    @font-face {
        font-family: 'CustomChinese';
        src: url('./fonts/SourceHanSansCN-Bold.woff2') format('woff2'),
             url('./fonts/SourceHanSansCN-Bold.woff') format('woff');
        font-weight: 700;
        font-style: normal;
        font-display: swap;
    }

    :root {
        --font-main: 'CustomChinese', 'Noto Sans SC', sans-serif;
    }

    body {
        font-family: var(--font-main);
    }
</style>
```

#### Troubleshooting Font Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| Garbled characters | Font not loaded in Puppeteer | Use Google Fonts or local @font-face |
| Squares/boxes instead of text | Missing font file | Verify font URL is accessible |
| Wrong font rendered | Font name mismatch | Check exact font-family name in CSS |
| Text looks correct in browser but not PPTX | System font not available in headless mode | Switch to web fonts |

---

### Design Best Practices

#### Color Usage

- **Dark/light sandwich**: Dark backgrounds for cover + closing, light for content
- **OR commit to dark throughout** for a premium feel
- **Never** give all colors equal visual weight

#### Layout Variety

Don't repeat the same layout. Vary between:
- Two-column (text left, visual right)
- Card grids (2×2, 3×2)
- Timeline/process flow
- Full-bleed image with overlay
- Large stat callout

#### Visual Elements

**Every slide needs a visual element** — text-only slides are forgettable.

Add at least one of:
- Icons in colored circles
- Shapes/backgrounds
- Images/illustrations
- Charts/diagrams

#### Spacing

- 0.5" minimum margins from slide edges
- 0.3-0.5" gaps between content blocks
- Leave breathing room — don't fill every inch

---

### Example Workflow

```bash
# 1. Create design philosophy
# (manually create design-philosophy.md)

# 2. Create HTML preview
# (manually create presentation.html following the design)

# 3. Preview in browser
python3 -m http.server 8080
# Open http://localhost:8080/presentation.html

# 4. Convert HTML to PPTX
cd skills/pptx/dom-to-pptx
npm install  # first time only
node convert.js /path/to/presentation.html my-presentation.pptx

# 5. Verify content
python3 -m markitdown my-presentation.pptx

# 6. Visual QA (convert to images)
soffice --headless --convert-to pdf my-presentation.pptx
pdftoppm -jpeg -r 150 my-presentation.pdf slide
```

---

## QA (Required)

**Assume there are problems. Your job is to find them.**

Your first render is almost never correct. Approach QA as a bug hunt, not a confirmation step. If you found zero issues on first inspection, you weren't looking hard enough.

### Content QA

```bash
python3 -m markitdown output.pptx
```

Check for missing content, typos, wrong order.

**When using templates, check for leftover placeholder text:**

```bash
python3 -m markitdown output.pptx | grep -iE "xxxx|lorem|ipsum|this.*(page|slide).*layout"
```

> **Windows (PowerShell):** Use `python3 -m markitdown output.pptx | Select-String -Pattern "xxxx|lorem|ipsum|this.*(page|slide).*layout"` since `grep` is not available on Windows.

If either command returns results, fix them before declaring success.

### Visual QA

**⚠️ USE SUBAGENTS** — even for 2-3 slides. You've been staring at the code and will see what you expect, not what's there. Subagents have fresh eyes.

Convert slides to images (see [Converting to Images](#converting-to-images)), then use this prompt:

```
Visually inspect these slides. Assume there are issues — find them.

Look for:
- Overlapping elements (text through shapes, lines through words, stacked elements)
- Text overflow or cut off at edges/box boundaries
- Decorative lines positioned for single-line text but title wrapped to two lines
- Source citations or footers colliding with content above
- Elements too close (< 0.3" gaps) or cards/sections nearly touching
- Uneven gaps (large empty area in one place, cramped in another)
- Insufficient margin from slide edges (< 0.5")
- Columns or similar elements not aligned consistently
- Low-contrast text (e.g., light gray text on cream-colored background)
- Low-contrast icons (e.g., dark icons on dark backgrounds without a contrasting circle)
- Text boxes too narrow causing excessive wrapping
- Leftover placeholder content

For each slide, list issues or areas of concern, even if minor.

Read and analyze these images:
1. /path/to/slide-01.jpg (Expected: [brief description])
2. /path/to/slide-02.jpg (Expected: [brief description])

Report ALL issues found, including minor ones.
```

### Verification Loop

1. Generate slides → Convert to images → Inspect
2. **List issues found** (if none found, look again more critically)
3. Fix issues
4. **Re-verify affected slides** — one fix often creates another problem
5. Repeat until a full pass reveals no new issues

**Do not declare success until you've completed at least one fix-and-verify cycle.**

---

## Converting to Images

Convert presentations to individual slide images for visual inspection:

```bash
soffice --headless --convert-to pdf output.pptx
pdftoppm -jpeg -r 150 output.pdf slide
```

This creates `slide-01.jpg`, `slide-02.jpg`, etc.

To re-render specific slides after fixes:

```bash
pdftoppm -jpeg -r 150 -f N -l N output.pdf slide-fixed
```

---

## Dependencies

- `pip3 install "markitdown[pptx]"` - text extraction
- `pip3 install Pillow` - thumbnail grids
- `pip3 install beautifulsoup4` - HTML analysis
- `npm install pptxgenjs cheerio` - HTML to PPTX conversion & creating from scratch
- LibreOffice (`soffice`) - PDF conversion
- Poppler (`pdftoppm`) - PDF to images
