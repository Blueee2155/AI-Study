---
name: html-report
description: Write long-form documents such as research reports, whitepapers, technical proposals, PRDs, feasibility studies, competitive analyses, and strategic plans. Use when the user wants to produce any structured written deliverable — including investigation reports, design documents, project proposals, product requirement documents, market analyses, or any multi-section narrative document that communicates findings, recommendations, or specifications. The final deliverable is a self-contained directory (<name>.html + assets + _shared) deployed to the user's workspace with polished visual design and zero external dependencies.
---

## Step 1: Understand Requirements

Before any planning, clarify with the user (or infer from context):

- **Topic / Scope**: What is the report about? What boundaries?
- **Audience**: Technical peers, executives, external clients, regulators?
- **Deliverable type**: Research report, whitepaper, PRD, proposal, competitive analysis, etc.
- **Key questions to answer**: What are the 3–5 core questions the report must address?
- **Data / evidence**: Does the user provide data, or should the Agent research and cite?

---

## Step 2: Design & Plan

### 2.1 Choose Template

Select a layout template based on the report type. Read the template file from `templates/` for its HTML structure, CSS styles, and design rules.

Available templates:

| Template | Type | Description | File |
|----------|------|-------------|------|
| Editorial | editorial | Editorial long-form layout | `templates/editorial.md` |
| Mosaic | mosaic | Card-based dashboard layout | `templates/mosaic.md` |
| Cockpit | cockpit | Data visualization dashboard with KPI cards, chart grids, and interactive analytics — high information density | `templates/cockpit.md` |
| Folio | folio | Traditional single-column document — medium information density | `templates/folio.md` |
| Canvas | canvas | Notion-like workspace document layout | `templates/canvas.md` |

Read the selected template file to understand:
- **Design Rules**: What visual elements are allowed/forbidden
- **HTML Structure**: The page skeleton with placeholder variables
- **CSS Template**: Key styles using CSS variables
- **Components**: Reusable HTML/CSS snippets for common elements

### 2.2 Choose Theme

Pick a theme that matches the audience and domain. Before selecting a concrete theme, read `themes/theme.md` as the canonical theme specification. Each theme provides **7 semantic color roles + 2 typography roles**.

Available themes:

| Theme | Style | File |
|-------|-------|------|
| Ocean Depths | Deep navy + teal (light) | `themes/ocean-depths.md` |
| Sunset Boulevard | Warm oranges + corals (light) | `themes/sunset-boulevard.md` |
| Forest Canopy | Earth greens + browns (light) | `themes/forest-canopy.md` |
| Modern Minimalist | Grayscale + clean lines (light) | `themes/modern-minimalist.md` |
| Golden Hour | Rich amber + warm tones (light) | `themes/golden-hour.md` |
| Arctic Frost | Cool blues + icy whites (light) | `themes/arctic-frost.md` |
| Desert Rose | Dusty pinks + muted tones (light) | `themes/desert-rose.md` |
| Tech Innovation | Bold neon + dark base (dark) | `themes/tech-innovation.md` |
| Botanical Garden | Fresh greens + florals (light) | `themes/botanical-garden.md` |
| Midnight Galaxy | Deep purples + cosmic (dark) | `themes/midnight-galaxy.md` |
| Indigo Dusk | Indigo accents + cool gray (light) | `themes/indigo-dusk.md` |
| Soft Morandi | Sage green + warm cream (light) | `themes/soft-morandi.md` |

After selecting a theme, read `themes/theme.md` and the selected theme file to extract:

**Color Roles** (7 values):
| Role | CSS Variable | Usage |
|------|-------------|-------|
| background | `--bg` | Page canvas background |
| surface | `--bg2` | Secondary background (cards, callouts) |
| text | `--ink` | Primary text |
| text-muted | `--muted` | Secondary text |
| border | `--rule` | Dividers, strokes |
| primary | `--accent` | Primary accent |
| secondary | `--accent2` | Secondary accent |

**Typography Roles** (2 values):
| Role | CSS Variable | Usage |
|------|-------------|-------|
| font | `--font` | Unified document font; hierarchy via size/weight |
| mono | `--font-mono` | Monospace font for code blocks and inline code only |

### 2.3 Plan Report Structure

Determine the chapter structure and decide what each section should accomplish.

### 2.4 Plan Visuals

Decide what charts and diagrams the report needs:

**Data Charts (ECharts)** — for quantitative data:
```
What is the primary data relationship?
├─ Comparison → Bar, Diverging Bar, Radar
├─ Trend over time → Line, Area, Multi-axis
├─ Proportion → Pie/Donut, Funnel
├─ Distribution → Scatter, Heatmap
├─ Correlation → Scatter (+visualMap)
├─ Flow / Process → Sankey, Funnel
├─ Ranking → Bar (sorted)
└─ Single KPI → Gauge
```

**Structural Diagrams** (optional, only when needed):

| Tool | Available Types | Best For |
|------|----------------|----------|
| **Mermaid** | Flowchart · Sequence · State · ER · Gantt · Class · Mindmap · C4 Context | Preferred when inline rendering is needed with no build step; read `diagrams/mermaid/guide.md` |
| **PlantUML** | Component/Package · Sequence · Activity · Class/Object | Complex layered architectures, swimlane processes |
| **Graphviz** | Dependency graph (dot) · Tree/Hierarchy (dot) · Network topology (neato/fdp) | Directed graphs, module dependencies, topology structures |

> **How to read**: First select tool by requirement, then choose diagram type. Example: need to show microservice call chain → directed graph → Graphviz dot; need to show state transitions → state machine → Mermaid `stateDiagram-v2` or PlantUML.

**Inline SVG Components** — only for extremely simple, non-data-intensive visuals (read from `diagrams/svg/`):

> ⚠️ **Prefer ECharts for all data visualization.** Only use hand-written SVG when the graphic is extremely simple (e.g. a single progress bar, sparkline trend, or map fill). If the chart involves multiple data points, axes, or legends, use ECharts instead.

| Component | Use Case | Reference |
|-----------|----------|-----------|
| World Map | Geographic distribution, audience regions, server locations | `diagrams/svg/world_map.md` |
| Sparkline | Inline trend indicators in tables, KPI cards | `diagrams/svg/sparkline.md` |
| Mini Charts | Progress bars, single-value gauges (≤3 data points only) | `diagrams/svg/mini_charts.md` |

> **Note**: Flowcharts, architecture diagrams, and other structural diagrams MUST NOT be hand-drawn in SVG. Use Mermaid, Graphviz, or PlantUML instead.

**Illustrations / Images (GenerateImage)** — for hero images, conceptual visuals, wireframes, and photos:
- Use `GenerateImage` to produce custom imagery (illustrations, wireframes, hero images, conceptual visuals)
- Use web search only as a last resort for real logos or brand assets that cannot be generated
- Treat each image slot as a separate planned asset

> → Full GenerateImage workflow (prompts, sizes, naming, base64 inlining) is in **Step 4 § Illustration Embedding**.

**Visual type decision summary:**

| Visual Need | Tool |
|-------------|------|
| Quantitative data (bar, line, pie, radar, sankey, heatmap…) | ECharts (external `assets/charts.js`) |
| Process flow / Flowchart / State machine | Mermaid / PlantUML / Graphviz |
| Architecture / Dependency graph | Mermaid / PlantUML / Graphviz |
| World map / Sparkline / Mini chart | Inline SVG (see table above) |
| Illustrations / hero images / conceptual visuals | GenerateImage |
| Page wireframes / UI prototypes | GenerateImage |
| Stock photos / logos / brand assets | Web Search (⚠️ last resort) |

### 2.5 Write plan.md

**You MUST create a `plan.md` file before writing any HTML.** This is an intermediate artifact for internal planning only, NOT the final deliverable presented to the user.

Template:

```markdown
# Report Plan

## Meta
- **Type**: [Research Report / Whitepaper / PRD / Proposal / etc.]
- **Topic**: [one-line topic description]
- **Audience**: [who will read this]
- **Language**: [match user's language]

## Theme
- **Name**: [theme name]
- **Colors**:
  - Background: `#xxxxxx`
  - Surface: `#xxxxxx`
  - Text: `#xxxxxx`
  - Text Muted: `#xxxxxx`
  - Border: `#xxxxxx`
  - Primary: `#xxxxxx`
  - Secondary: `#xxxxxx`
- **Document Font**: [font name]
- **Monospace Font**: [font name]

## Structure
1. [Chapter 1 title] — [brief description]
2. [Chapter 2 title] — [brief description]
3. ...

## Visuals
| Visual | Type | Tool | Purpose |
|--------|------|------|---------|
| Chart 1 | [e.g. Pie] | ECharts | [what it shows] |
| Diagram 1 | [e.g. Flowchart] | Mermaid | [what it shows] |
| Diagram 2 | [e.g. Component] | PlantUML | [what it shows] |
| Diagram 3 | [e.g. Dependency Graph] | Graphviz | [what it shows] |
| Map 1 | [e.g. World Map] | SVG | [what it shows] |
| Illustration 1 | [e.g. Scene] | GenerateImage | [what it shows] |

## Key Arguments / Thesis
- [Core argument 1]
- [Core argument 2]
- [Core argument 3]
```

---

## Step 3: Write Content

Write the full report content following the planned structure. Guidelines:

- **Language consistency**: The entire report MUST use the same language as the user's query.
- **Evidence-based**: Support claims with data, examples, or logical reasoning.
- **Structured**: Use clear headings (H2 for chapters, H3 for sections, H4 for subsections).
- **Concise but thorough**: Aim for depth without padding. Every paragraph should advance the argument.
- **Professional tone**: Match formality to audience (academic for research, direct for PRDs).
- **Transitions**: Each section should flow logically to the next.
- **Key point emphasis**: For longer text sections, highlight key phrases or sentences to help readers quickly grasp the main points. Choose ONE of the following two methods per report and apply it consistently throughout — do NOT mix them:
  - **Method A — Bold**: Use `<strong>` to bold key phrases (suitable for formal/academic reports).
  - **Method B — Accent color**: Use `<mark class="key">` to highlight key phrases with the theme's accent color (suitable for modern/visual reports). Add corresponding CSS: `mark.key { background: none; color: var(--accent); font-weight: 600; }`

---

## Step 3.5: Citations & Sources

When the report uses evidence from searched or provided sources, apply these citation rules consistently.

### Inline Citations

Use superscript numbered links that jump to the corresponding source entry in the footer:

```html
<sup><a href="#cite-1">[1]</a></sup>
```

Multiple citations on the same claim:
```html
<sup><a href="#cite-2">[2]</a></sup><sup><a href="#cite-3">[3]</a></sup>
```

**Rules:**
- Use sequential integer numbering starting from 1.
- The display text is just `[N]` — do NOT include the raw `[cite:N]` format from model output anywhere in the final HTML.
- Every inline citation MUST have a corresponding entry in the Sources section.

### Sources Section (Footer)

Place an ordered list inside `<footer><div class="sources">`:

```html
<footer>
  <div class="sources">
    <h2>Sources</h2>
    <ol>
      <li id="cite-1">
        <span class="src-title">Author/Org, Document Title. Brief description.</span>
        <a class="src-url" href="https://example.com/source" target="_blank" rel="noopener">https://example.com/source</a>
      </li>
      <li id="cite-2">
        <span class="src-title">Author/Org, Document Title. Brief description.</span>
        <a class="src-url" href="https://example.com/other" target="_blank" rel="noopener">https://example.com/other</a>
      </li>
    </ol>
  </div>
</footer>
```

**Rules:**
- Use `<ol>` (ordered list), NOT `<p>` tags — the template CSS already styles `footer .sources ol` and `footer .sources li`.
- Each `<li>` MUST have `id="cite-N"` to serve as the anchor target for inline citation links.
- Source URLs MUST be clickable `<a href="...">` links with `target="_blank"`, NOT plain text or `<span>` elements.
- For user-uploaded documents without a URL, use: `<span class="src-url">User-uploaded document</span>` (no link needed).
- Do NOT include raw `[cite:N]` text in the list — the `<ol>` numbering handles this automatically.
- Source description should be concise: Author/Org, Title, one-line context.

### Required CSS (add to `<style>` if not already in template)

```css
/* Inline citations */
sup a {
  color: var(--accent);
  text-decoration: none;
  font-size: 0.75em;
  font-weight: 600;
}
sup a:hover {
  text-decoration: underline;
}

/* Sources list */
footer .sources ol {
  padding-left: 1.2rem;
  font-size: 0.85rem;
  color: var(--muted);
}
footer .sources li {
  margin-bottom: 0.5rem;
  overflow-wrap: break-word;
  word-break: break-all;
}
footer .sources .src-title {
  color: var(--ink);
  word-break: normal;
}
footer .sources .src-url {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.82rem;
  color: var(--accent);
  word-break: break-all;
}
footer .sources a {
  word-break: break-all;
}
```

---

## Step 4: Build HTML

### Project Setup

First, scaffold the report directory **in your temporary work directory** :

```bash
bash <skill-dir>/scripts/new-report.sh <report-name> <your-work-dir>
```

- **`<skill-dir>`**: The directory where this skill (html-report) is located.
- **`<report-name>`**: A slug for the report (e.g. `market-analysis-2024`).
- **`<your-work-dir>`**: Your temporary work directory for intermediate artifacts (as specified in your system prompt's file handling rules). This is where the report will be created during authoring.

This creates `<your-work-dir>/<report-name>/<report-name>.html` + `<your-work-dir>/<report-name>/assets/` + `<your-work-dir>/<report-name>/_shared/js/` (with JS libraries pre-populated). All authoring happens in this directory.

### HTML Comment Header

**Every HTML file** in the report MUST begin with this exact comment on line 1:

```html
<!-- Generated by Trae Work -->
<!DOCTYPE html>
...
```
If you create multiple HTML files (e.g. multi-page report), each one needs this comment.

### Authoring Architecture

During authoring, the HTML uses **real relative paths** that resolve directly — no path rewriting is needed. The `new-report.sh` scaffold creates a `_shared/` directory alongside the HTML with JS libraries pre-populated. The model copies fonts to `_shared/fonts/` during authoring. All paths work as-is in the final deliverable.

**Path layout** (created by `new-report.sh`, paths are real and resolve during authoring):

| Resource | Path |
|----------|------|
| Shared JS (ECharts, Mermaid, Lightbox) | `./_shared/js/echarts.min.js` |
| Shared fonts (TTF) | `./_shared/fonts/FontName-Regular.ttf` |
| Report-local images | `assets/hero_1024x576.png` |

**Forbidden in authoring HTML**:
- Absolute local paths (`/tmp/...`, `file:///...`)
- Remote URLs (`https://cdn.example.com/...`)
- Base64-encoded assets (bloats the HTML unnecessarily)

**Allowed in authoring HTML**:
- `./_shared/js/` for shared JS libraries
- `./_shared/fonts/` for shared font files
- Relative paths to report-local assets (`assets/...`), including `assets/charts.js`
- Inline `<svg>...</svg>`
- Inline `<style>...</style>`
- `<script src="assets/charts.js"></script>` for chart logic (NOT inline `<script>` blocks)

### Template × Theme Combination

1. **Read the template file** (e.g. `templates/research.md`) — get the HTML structure, CSS styles, design rules, and component snippets.
2. **Read `themes/theme.md`** — use it as the canonical schema for the 7 color roles and 2 typography roles.
3. **Read the selected theme file** (e.g. `themes/ocean-depths.md`) — get the concrete hex values and font names.
4. **Fill CSS variables** — map canonical theme roles into the template's CSS variable definitions:
   ```css
   :root {
     --bg: #xxxxxx;      /* theme → background */
     --bg2: #xxxxxx;     /* theme → surface */
     --ink: #xxxxxx;     /* theme → text */
     --muted: #xxxxxx;   /* theme → text-muted */
     --rule: #xxxxxx;    /* theme → border */
     --accent: #xxxxxx;  /* theme → primary */
     --accent2: #xxxxxx; /* theme → secondary */
     --font: 'FontName', serif;
     --font-mono: 'MonoName', monospace;
     --max: 860px;
   }
   ```
   If a template uses alias variables beyond the canonical names, derive them from the canonical roles instead of inventing new values. Example mappings: `border -> --line`, `secondary -> --accent-soft`, `font -> --body/--display`, `mono -> --mono`.
5. **Reference fonts via url()** — first copy the needed font files from the skill's `canvas-fonts/` directory to `<report>/_shared/fonts/`, then reference them in `@font-face` declarations using `./_shared/fonts/`. These are real relative paths that resolve directly:
   ```css
   @font-face {
     font-family: 'FontName';
     src: url('./_shared/fonts/FontName-Regular.ttf') format('truetype');
     font-weight: 400;
   }
   @font-face {
     font-family: 'FontName';
     src: url('./_shared/fonts/FontName-Bold.ttf') format('truetype');
     font-weight: 700;
   }
   @font-face {
     font-family: 'MonoName';
     src: url('./_shared/fonts/MonoName-Regular.ttf') format('truetype');
     font-weight: 400;
   }
   ```
   **Common mistakes that break font rendering:**
   - ❌ Omitting `@font-face` declarations entirely
   - ❌ Writing base64 data URIs directly (too large for agent context)
   - ❌ Using CDN URLs like `https://fonts.googleapis.com/...`
   - ❌ Using any path other than `./_shared/fonts/` for font references
6. **Build the page** — use the template's HTML structure as the skeleton, fill in report content, apply CSS from the template, and add components as needed.
7. **Follow design rules** — respect the template's design constraints (e.g. editorial template forbids shadows, gradients, and rounded corners ≥ 8px).

### Document Layout

Use the HTML structure from the selected template. For the editorial template:

```html
<body>
  <article class="page">
    <div class="topline">...</div>
    <header>...</header>
    <nav class="toc">...</nav>
    <main>
      <section>...</section>
    </main>
    <footer>...</footer>
  </article>
</body>
```

### ECharts Inclusion

**⚠️ MANDATORY**: The `<script src>` tag below MUST appear in the final HTML. Without it, charts will not render. Do NOT omit it, do NOT replace it with inline script, and do NOT use a CDN URL.

Reference `echarts.min.js` via a `<script src>` tag pointing to the `_shared/js/` directory (created by `new-report.sh` with JS pre-populated).

```html
<!-- REQUIRED: place before </body>, before assets/charts.js -->
<script src="./_shared/js/echarts.min.js"></script>
```

**Common mistakes that break deployment:**
- ❌ Omitting this tag entirely (charts won't work)
- ❌ Using a CDN URL like `https://cdn.jsdelivr.net/...`
- ❌ Writing chart init code directly in `<script>` instead of `assets/charts.js`
- ❌ Adding attributes before `src` (e.g. `<script type="..." src="...">`) — prefer `src` as the first attribute for clarity

### Chart Authoring Rules

- **Title required.** Every chart, diagram, and figure MUST have a visible title. Use `<figcaption>` inside a `<figure>` wrapper, or a heading element (e.g. `<h3>`) immediately before the chart container. Never render a chart without an accompanying title that describes what it shows.
- **External JS file.** All chart initialization logic MUST be written in a separate JS file at `assets/charts.js` (or split into multiple files like `assets/chart-revenue.js`). Do NOT write chart logic in inline `<script>` blocks within the HTML page.
- **Container.** Wrap in a `<figure>` with `<figcaption>`, then reference the external script:
  ```html
  <figure class="chart-figure">
    <figcaption>{chart_title}</figcaption>
    <div id="chart-[name]" style="width:100%;min-height:400px"></div>
  </figure>

  <!-- All chart scripts at the end of <body>, after containers are defined -->
  <script src="assets/charts.js"></script>
  ```
  Alternatively, when using a template's chart panel component (e.g. cockpit's `.chart-panel`), use the panel's built-in title element (e.g. `<h3 class="panel-title">`).
- **JS file structure.** Wrap all chart code in an IIFE to avoid polluting global scope:
  ```javascript
  // assets/charts.js
  (function() {
    var style = getComputedStyle(document.documentElement);
    var accent = style.getPropertyValue('--accent').trim();
    var accent2 = style.getPropertyValue('--accent2').trim();
    var ink = style.getPropertyValue('--ink').trim();
    var muted = style.getPropertyValue('--muted').trim();
    var rule = style.getPropertyValue('--rule').trim();
    var bg2 = style.getPropertyValue('--bg2').trim();

    // --- Chart: [name] ---
    var chart1 = echarts.init(document.getElementById('chart-[name]'), null, { renderer: 'svg' });
    chart1.setOption({ /* ... */ });
    window.addEventListener('resize', function() { chart1.resize(); });

    // --- Chart: [name2] ---
    // ...
  })();
  ```
- **Init.** `echarts.init(el, null, { renderer: 'svg' })`.
- **Colors.** Derive chart colors from CSS variables via `getComputedStyle` (read once at the top of the IIFE, reuse across all charts).
- **Tooltip.** Always include tooltip with `appendToBody: true`.
- **Animation.** Set `animation: false` — reports are static documents.
- **Resize listener.** ALWAYS include `window.addEventListener('resize', () => chart.resize())` for each chart instance.
- **ECharts ONLY.** All quantitative data charts (bar, line, pie, radar, heatmap, sankey, scatter, etc.) MUST use ECharts. Using matplotlib, seaborn, plotly, or any other external charting library to generate PNG/SVG images is **FORBIDDEN** for data visualization. The only exception is structural diagrams rendered via Mermaid/PlantUML/Graphviz as described in the Diagram Embedding section.
- **Heatmap container height.** When y-axis categories ≥ 6, use `.chart-container.tall` (min-height: 560px) or calculate as `categories × 50px + 120px` (for axes + visualMap). Never use `.short` for heatmaps with more than 5 y-axis items. Set `grid.top` ≥ 30 to prevent top rows from being clipped.
- **Heatmap data integrity.** Only include categories on x/y axes that have at least one data point in the series. Do NOT declare axis categories for which no heatmap value exists. Always set `splitArea: { show: false }` on heatmap charts.
- **Heatmap missing-data fallback.** If any grid cell legitimately has no data, fill it explicitly with value `'-'` and render as transparent background + `'N/A'` label in `muted` color. Example:
  ```javascript
  // Fill missing cells
  var fullData = data.slice();
  yData.forEach(function(_, yi) {
    xData.forEach(function(_, xi) {
      if (!data.some(function(d) { return d[0] === xi && d[1] === yi; })) {
        fullData.push([xi, yi, '-']);
      }
    });
  });
  // Series config
  series: [{
    type: 'heatmap',
    data: fullData,
    label: {
      show: true,
      formatter: function(p) { return p.value[2] === '-' ? 'N/A' : Number(p.value[2]).toFixed(2); },
      color: ink
    }
  }]
  // visualMap outOfRange
  visualMap: { ..., outOfRange: { color: 'transparent' } }
  ```

### ECharts Color Specification

All chart colors MUST be derived from the report's CSS variables to maintain visual consistency with the theme. Do NOT use hardcoded hex colors or library default palettes.

**Reading CSS variables (once at the top of `assets/charts.js` IIFE):**
```javascript
var style = getComputedStyle(document.documentElement);
var accent = style.getPropertyValue('--accent').trim();
var accent2 = style.getPropertyValue('--accent2').trim();
var ink = style.getPropertyValue('--ink').trim();
var muted = style.getPropertyValue('--muted').trim();
var rule = style.getPropertyValue('--rule').trim();
var bg2 = style.getPropertyValue('--bg2').trim();
```

**Color palette construction:**
- **Single-series charts** (line, bar, area): use `accent` as primary color
- **Multi-series charts**: build a palette by mixing `accent` and `accent2` with opacity variants:
  ```javascript
  color: [accent, accent2, muted, accent + '99', accent2 + '99']
  ```
- **Heatmap / continuous color mapping**: use `visualMap.inRange.color` derived from theme:
  ```javascript
  visualMap: { inRange: { color: [bg2, accent2, accent] } }
  ```
- **Diverging charts** (positive vs negative comparison): use `accent` for positive values and `accent2 + 'cc'` (or a darker muted tone) for negative values:
  ```javascript
  itemStyle: { color: function(params) { return params.value >= 0 ? accent : accent2; } }
  ```
- **Text elements** (axis labels, legend): use `muted` for secondary text, `ink` for primary text
- **Grid lines / axis lines**: use `rule`

**Forbidden in chart colors:**
- Rainbow or matplotlib-style colormaps (viridis, plasma, inferno, etc.)
- Hardcoded hex values that do not come from CSS variables
- Default ECharts color palette (the auto-assigned blues, greens, oranges)

### Diagram Embedding

**Mermaid**

1. **⚠️ MANDATORY**: Reference `mermaid.min.js` via a `<script src>` tag (same as ECharts — pre-populated in `_shared/js/` by scaffold). This tag MUST appear in the HTML:
   ```html
   <!-- REQUIRED: place before </body> -->
   <script src="./_shared/js/mermaid.min.js"></script>
   ```
2. Initialize: `mermaid.initialize({ startOnLoad: true, theme: 'neutral', securityLevel: 'loose' })`.
3. Write diagram code inside `<pre class="mermaid">` blocks.
4. For detailed syntax and diagram type selection, read `diagrams/mermaid/guide.md`.

```html
<figure class="diagram">
  <pre class="mermaid">
    flowchart LR
      A[Service A] --> B[Service B] --> C[(Database)]
  </pre>
  <figcaption>Figure X: System Architecture</figcaption>
</figure>
```

**PlantUML / Graphviz**

1. Write the diagram source code (`.puml` or `.dot` file).
2. Run the render script: `python diagrams/render_plantuml.py input.puml output.png` or `python diagrams/render_graphviz.py input.dot output.png`.
3. Save the resulting PNG to the report's `assets/` directory with a descriptive name.
4. Reference in HTML via relative path:
   ```html
   <figure class="diagram">
     <img src="assets/architecture_diagram.png" alt="[description]">
     <figcaption>Figure X: [Diagram Title]</figcaption>
   </figure>
   ```

**Inline SVG Components** (only for extremely simple graphics; prefer ECharts for data visualization)

1. Read the reference file for the chosen component (e.g. `diagrams/svg/sparkline.md`).
2. Adapt the SVG code with your actual data values.
3. Inline the `<svg>` element directly in the HTML — no wrapping needed.
4. Use CSS variables (`var(--accent)`, `var(--rule)`, etc.) for all colors to inherit the active theme.
5. If the chart involves >3 data points, axes, legends, or any interactivity → use ECharts instead.

### Illustration Embedding

This is the **single authoritative guide** for generating and embedding images via `GenerateImage`.

#### Workflow

1. **Write a detailed prompt** describing the desired scene, style, color tones, and mood.
2. **Choose the right `image_size`** for the target aspect ratio:
   - `landscape_16_9` — wide landscape (1024×576), for full-width illustrations
   - `landscape_4_3` — landscape (1024×768), for content area illustrations
   - `square_hd` — high-definition square (1024×1024)
   - `portrait_3_4` — portrait (768×1024)
   - `portrait_9_16` — tall portrait (576×1024)
3. **Call GenerateImage** — generate each image one by one. Save to the report's `assets/` directory with naming convention: `assets/{name}_{width}x{height}.png`.
4. **Verify assets** — confirm all planned images exist before proceeding:
   ```bash
   ls -la assets/*_*x*.png assets/*_*x*.jpg 2>/dev/null
   ```
5. **Reference in HTML via relative path**:
   ```html
   <img src="assets/hero_1024x576.png" alt="...">
   ```
   The report's `_shared/` directory and `assets/` directory are both included in the deployed output.

**Only proceed to further authoring after:**
- [ ] All planned `[GenerateImage]` assets from the plan are generated
- [ ] Asset files exist in `assets/` with `{name}_{width}x{height}.png` naming
- [ ] Filename dimensions match actual image dimensions

Do not mention this part to the user

#### Prompt Tips

- **Be specific about style**: "a modern flat illustration of…" or "a photorealistic aerial view of…"
- **Include color guidance**: "using warm tones of terracotta and sage green" to match the report palette
- **Describe composition**: "left side shows X, right side shows Y, with negative space for text overlay"
- **Specify mood**: "professional, clean, and minimal" vs "vibrant, energetic, and bold"
- **Avoid text in images**: Generated text is often garbled — add text as HTML elements instead
- **Prefer illustration style**: AI-generated photos can look uncanny — illustrations and stylized graphics produce better results

**Planning rule:** treat each image slot as a separate task. If one section uses three thumbnails, that means three planned image assets and three generated files, not one shared image.

#### HTML Layout Patterns

```html
<figure class="diagram">
  <img src="assets/product_interface_1024x576.png" alt="Product interface screenshot">
  <figcaption>Figure 1: Product main interface overview</figcaption>
</figure>
```

#### Side-by-side Comparison

```html
<div class="figure-row">
  <figure class="diagram">
    <img src="assets/before_1024x768.png" alt="Before optimization">
    <figcaption>Before</figcaption>
  </figure>
  <figure class="diagram">
    <img src="assets/after_1024x768.png" alt="After optimization">
    <figcaption>After</figcaption>
  </figure>
</div>
```

#### Image Grid

```html
<div class="figure-grid">
  <figure class="diagram">
    <img src="assets/scenario_a_1024x768.png" alt="Scenario A">
    <figcaption>Scenario A</figcaption>
  </figure>
  <figure class="diagram">
    <img src="assets/scenario_b_1024x768.png" alt="Scenario B">
    <figcaption>Scenario B</figcaption>
  </figure>
  <figure class="diagram">
    <img src="assets/scenario_c_1024x768.png" alt="Scenario C">
    <figcaption>Scenario C</figcaption>
  </figure>
  <figure class="diagram">
    <img src="assets/scenario_d_1024x768.png" alt="Scenario D">
    <figcaption>Scenario D</figcaption>
  </figure>
</div>
```

#### Annotated Screenshot

```html
<figure class="diagram annotated">
  <div class="annotated-wrapper">
    <img src="assets/feature_annotations_1024x576.png" alt="Feature annotations">
    <span class="annotation" style="top:20%;left:35%">① Navigation Bar</span>
    <span class="annotation" style="top:45%;left:60%">② Core Action Area</span>
    <span class="annotation" style="top:75%;left:25%">③ Status Panel</span>
  </div>
  <figcaption>Figure 3: Interface functional area annotations</figcaption>
</figure>
```

#### Inline Icon/Badge

```html
<p>
  The system supports three deployment modes:
  <img class="inline-icon" src="assets/icon_cloud_64x64.png" alt="Cloud"> Cloud,
  <img class="inline-icon" src="assets/icon_hybrid_64x64.png" alt="Hybrid"> Hybrid,
  <img class="inline-icon" src="assets/icon_onpremise_64x64.png" alt="On-premise"> On-premise
</p>
```

#### Required CSS

```css
/* Basic figure */
.diagram { margin: 2rem 0; text-align: center; }
.diagram img { max-width: 100%; height: auto; border: 1px solid var(--rule); border-radius: 4px; }
.diagram figcaption { font-size: 0.8rem; color: var(--muted); margin-top: 0.5rem; }

/* Chart figure (ECharts with title) */
.chart-figure { margin: 2rem 0; }
.chart-figure figcaption { font-size: 0.9rem; font-weight: 600; color: var(--ink); margin-bottom: 0.75rem; }

/* Side-by-side */
.figure-row { display: flex; gap: 1.5rem; margin: 2rem 0; }
.figure-row .diagram { flex: 1; margin: 0; }
.figure-row .diagram img { width: 100%; }

/* Grid */
.figure-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin: 2rem 0; }
.figure-grid .diagram { margin: 0; }
.figure-grid .diagram img { width: 100%; }

/* Annotated */
.annotated-wrapper { position: relative; display: inline-block; }
.annotation {
  position: absolute; font-size: 0.75rem; font-weight: 700;
  color: var(--accent); background: var(--bg); padding: 2px 6px;
  border: 1px solid var(--accent); border-radius: 4px;
  white-space: nowrap; transform: translate(-50%, -50%);
}

/* Inline icon */
.inline-icon { height: 1.2em; width: auto; vertical-align: middle; margin: 0 0.2em; }

/* Responsive */
@media (max-width: 600px) {
  .figure-row { flex-direction: column; }
  .figure-grid { grid-template-columns: 1fr; }
}
```

### Responsive & Print Design

- Max-width container centered with `margin: 0 auto`.
- `@media print` styles: hide interactive elements, ensure page breaks at chapter boundaries.
- Minimum font size `14px` for body text, `12px` for captions/footnotes.
- Charts maintain aspect ratio on resize.

### Mobile Adaptation

The HTML may be previewed on mobile devices. Follow these rules:

- **Tables**: Always wrap `<table>` in a `<div class="table-wrap">` container. The `.table-wrap` MUST have both `overflow-x: auto` and `overflow-y: auto` with a `max-height` constraint (default `600px`). This ensures tables scroll both horizontally on narrow screens and vertically when rows exceed the container height. On mobile (≤ 768px), the table is given a `min-width` that triggers horizontal scroll when the viewport is too narrow.
- **Tables in multi-column layouts**: NEVER place tables inside two-column or multi-column grid layouts (e.g. `.two-col`, `.insight-grid`, `.chart-grid.cols-2`). Tables with 4+ columns MUST use full-width single-column layout to avoid overflow.
- **References / Sources**: Long URLs must not overflow the page width. The template CSS applies `word-break: break-all` on source links and list items in the footer `.sources` section.
- **Body padding**: Reduced on mobile to maximize content area.
- **Grid layouts**: All multi-column grids collapse to single-column on small screens.

---

## Step 5: Deploy to Workspace

⚠️ **Always deploy before delivering to the user.** The deploy step copies the report to the user's workspace and performs cleanup.

```bash
bash <skill-dir>/scripts/deploy.sh <report-dir> <output-dir>
```

- **`<skill-dir>`**: The directory where this skill (html-report) is located.
- **`<report-dir>`**: The absolute path to the report directory created in Step 4 (e.g. `<your-work-dir>/<report-name>`).
- **`<output-dir>`**: The user's workspace directory for final deliverables (as specified in your system prompt's file handling rules).

This deploys the report to `<output-dir>/<name>/` with all dependencies included. The deploy script performs a `cp` of the report directory and cleanup (removes unreferenced JS from `_shared/js/`, verifies the HTML comment header). No path rewriting is needed since all paths are already real relative paths.

```
<output-dir>/<name>/
├── <name>.html     (real relative paths to ./_shared/)
├── assets/         (report-local images, charts.js)
└── _shared/
    ├── js/         (only referenced JS libs)
    └── fonts/      (only referenced font files)
```

Open `<name>.html` in any browser. All resources are local — no network dependencies.

### Verification Checklist (do not mention to user)

Before delivery, verify:
- [ ] `deploy.sh` completes without errors
- [ ] `<name>.html` in workspace opens in browser with no console errors
- [ ] All charts render with correct data
- [ ] All diagrams display correctly
- [ ] All images load (no broken image placeholders)
- [ ] Colors and fonts are consistent with the plan
- [ ] Text is readable with proper line-height and spacing
- [ ] Responsive — resizes gracefully on different widths
- [ ] Language matches user's request throughout

---

## File Structure

```
html-report/
├── SKILL.md                 (this file)
├── assets/
│   └── js/                  (shared JS libraries: echarts.min.js, mermaid.min.js)
├── canvas-fonts/            (shared font TTF files)
├── diagrams/                (diagram tools & references)
│   ├── mermaid/             (Mermaid syntax guides)
│   ├── svg/                 (inline SVG component references)
│   ├── render_graphviz.py
│   └── render_plantuml.py
├── templates/               (report layout templates)
│   ├── editorial.md
│   ├── mosaic.md
│   ├── cockpit.md
│   ├── folio.md
│   └── canvas.md
├── themes/                  (color + typography theme definitions)
│   ├── theme.md             (canonical theme spec)
│   └── *.md                 (individual themes)
├── scripts/
│   ├── deploy.sh            (deploy report to workspace directory)
│   └── new-report.sh        (scaffold a report directory in work dir)
```

**Report directory** (created in your temporary work dir by `new-report.sh`):

```
<your-work-dir>/<report-name>/
├── <report-name>.html  (authoring HTML with real relative paths)
├── assets/             (report-local images, charts.js, rendered diagrams)
└── _shared/
    ├── js/             (JS libraries, pre-populated by new-report.sh)
    └── fonts/          (font files, copied by model during authoring)
```
