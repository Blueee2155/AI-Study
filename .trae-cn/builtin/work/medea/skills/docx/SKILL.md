---
name: docx
description: "Comprehensive document creation, editing, and analysis with support for tracked changes, comments, formatting preservation, and text extraction. When you need to work with professional documents (.docx files) for: (1) Creating new documents, (2) Modifying or editing content, (3) Working with tracked changes, (4) Adding comments, or any other document tasks"
license: Proprietary. LICENSE.txt has complete terms
---

# DOCX creation, editing, and analysis

## Overview

A .docx file is a ZIP archive containing XML files.

## Quick Reference

| Task | Approach |
|------|----------|
| Read/analyze content | `pandoc` or unpack for raw XML |
| Create new document | **Step 1: Outline** → **Step 2: Draft (Multi-file)** → Step 3: **`md2docx.js` script** |
| Edit existing document | Unpack → edit XML → repack - see Editing Existing Documents below |

### Converting .doc to .docx

Legacy `.doc` files must be converted before editing:

```bash
soffice --headless --convert-to docx document.doc
```

### Reading Content

```bash
# Text extraction with tracked changes
pandoc --track-changes=all document.docx -o output.md

# Raw XML access
python scripts/unpack.py document.docx unpacked/
```

### Converting to Images

```bash
soffice --headless --convert-to pdf document.docx
pdftoppm -jpeg -r 150 document.pdf page
```

### Accepting Tracked Changes

To produce a clean document with all tracked changes accepted (requires LibreOffice):

```bash
python scripts/accept_changes.py input.docx output.docx
```

---

## Creating New Documents

### ⚠️ Mandatory 3-Step Workflow

**DO NOT use docx-js until Step 3.** You must write the full content in Markdown first.

#### Step 1: Create Outline (outline.md)

**Action:** Create a file named `outline.md`.
**Content:**
1. Document title and section headings.
2. **CRITICAL:** For EACH section, specify the **target word count** (e.g., 400-600 words, 800-1000 words). This ensures comprehensive coverage and consistent depth across the document and write into `outline.md`
3. **CRITICAL:** For EACH section, generate **5 probing questions** that the section will answer. These questions MUST be written into `outline.md`.
  - Include at least one question about **visualization** or **data presentation**: Eg: "What diagrams, charts, or images would help illustrate this section?","What data or comparisons would be clearer in a table?"
  - Examples: "What are the underlying principles?", "What are the common pitfalls?", "How does this interact with other components?", "Can we provide a concrete example?", "What are the trade-offs?", "What visual elements would enhance understanding?"

#### Step 2: Expand to Full Draft (Multi-file Strategy)

**Action:** iteratively expand `outline.md` into multiple content files (e.g. `chapter-01.md`, `chapter-02.md`).
**Rule:** Do NOT write code yet. Focus on writing high-quality text content in Markdown format.
**Constraint:** **NEVER** generate the entire content in a single turn. You must iterate section by section.
**Loop:**
1. Pick **ONE** section from the outline.
2. **Review & Inquiry:** Read the guiding questions for this section from `outline.md`.
3. **Drafting with Depth:** Write the full content for that section by systematically answering the questions.
   - **Constraint:** Content must be **comprehensive** (target **400+ words per section**). Avoid high-level summaries; favor detailed explanations, examples, and critical analysis.
   - **Images & Visuals:** When appropriate, include placeholder Markdown image syntax: `![Alt Text](images/figure-name.png)`. Describe what the image should show in the alt text.
   - **Create Images (CRITICAL RULE):** You MUST generate the actual, data-driven image synchronously when drafting the section.`
     - **ALWAYS** write a robust script (e.g., using matplotlib`, `seaborn`, `mermaid`) that uses realistic or generated data to render a high-quality, professional chart or diagram that accurately reflects the text. Also, you can use `GenerateImage` tool to generate images.
     - Save images to an `images/` directory with descriptive filenames (e.g., `images/architecture-diagram.png`).
   - **Tables:** Use standard Markdown table syntax when you need to present structured data:
     ```markdown
     | Column 1 | Column 2 | Column 3 |
     |----------|----------|----------|
     | Data 1   | Data 2   | Data 3   |
     | Data 4   | Data 5   | Data 6   |
     ```
     - Use tables for comparisons, specifications, results, or any structured information.
     - Keep table headers clear and descriptive.
     - Align columns appropriately (left, center, or right).
4. Save the content to a NEW file for that section (e.g. `section-01-introduction.md`).
5. **Feedback:** Ask user for feedback on the section.
6. **REPEAT** until all sections are written as individual Markdown files.

#### Step 3: Convert to DOCX (Final Output)

**Action:** ONLY after all section files are complete and all images are generated, run the conversion script:

```bash
node scripts/md2docx.js --input "section-*.md" --output report.docx --title "Document Title"
```

The script automatically handles:
- Markdown parsing (headings, paragraphs, bold, italic, lists, tables, images)
- CJK font configuration (Arial + Microsoft YaHei)
- Page layout (US Letter with 1-inch margins)
- Image embedding from `images/` directory
- Table rendering with proper widths and borders
- Numbered and bulleted lists

**Optional Configuration:** Create `docx-config.json` to customize fonts, page size, margins, etc. (see Script Configuration below)

---

## Script Configuration

### Prerequisites

Before using the conversion script, install the required dependencies:

```bash
cd apps/icube_server_rs/modules/ai-agent/builtin/work/medea/skills/docx/scripts
npm install
```

This installs the `docx` package and other dependencies locally in the scripts directory.

### md2docx.js Script

The `scripts/md2docx.js` script converts Markdown files to professional DOCX documents.

```bash
node scripts/md2docx.js --input "section-*.md" --output report.docx --title "My Report"
```

**Command Options:**
- `--input`: Glob pattern for input Markdown files (e.g., `"section-*.md"`, `"chapter-*.md"`)
- `--output`: Output DOCX file path (e.g., `report.docx`)
- `--title`: Document title (optional, adds title page)
- `--config`: Path to config JSON file (optional, defaults to built-in config)

**Supported Markdown Features:**
- Headings: `# H1`, `## H2`, `### H3`, etc.
- Text formatting: `**bold**`, `*italic*`, `***bold italic***`
- Lists: Numbered (`1. Item`) and bulleted (`- Item` or `* Item`)
- Tables: Standard Markdown table syntax with `|` separators
- Images: `![Alt text](images/figure.png)` (automatically embedded)
- Paragraphs: Plain text with automatic line wrapping

**Configuration File** (`docx-config.json`):
```json
{
  "pageSize": "US_LETTER",
  "fonts": {
    "ascii": "Arial",
    "eastAsia": "Microsoft YaHei"
  },
  "margins": {
    "top": 1440,
    "right": 1440,
    "bottom": 1440,
    "left": 1440
  },
  "includeTableOfContents": false,
  "imageWidth": 600
}
```

**Page Size Options:**
- `US_LETTER`: 8.5" × 11" (default)
- `A4`: 210mm × 297mm

**Font Configuration:**
- `ascii`/`hAnsi`: Font for Latin characters (default: Arial)
- `eastAsia`: Font for CJK characters (default: Microsoft YaHei)

**Additional Notes:**
- The script automatically handles all CJK font configuration
- Tables are rendered with proper widths and borders
- Images are automatically embedded from relative paths
- Lists use proper Word numbering (not unicode bullets)
- All text formatting (bold, italic) is preserved

### Advanced Customization

If you need features not supported by the script (e.g., headers/footers, custom styles), you can:
1. Use the script to generate a base document
2. Manually edit using the XML workflow (see "Editing Existing Documents" below)
3. Or write custom docx-js code following the patterns in the script source

---

## Editing Existing Documents

**⚠️ This section is for editing RAW XML files (unpack/pack workflow). XML entities (`&#x201C;`) are ONLY valid here, NOT in docx-js code above.**

**Follow all 3 steps in order.**

### Step 1: Unpack
```bash
python scripts/unpack.py document.docx unpacked/
```
Extracts XML, pretty-prints, merges adjacent runs, and converts smart quotes to XML entities (`&#x201C;` etc.) so they survive editing. Use `--merge-runs false` to skip run merging.

### Step 2: Edit XML

Edit files in `unpacked/word/`. See XML Reference below for patterns.

**Use "AI Assistant" as the author** for tracked changes and comments, unless the user explicitly requests use of a different name.

**Use the Edit tool directly for string replacement. Do not write Python scripts.** Scripts introduce unnecessary complexity. The Edit tool shows exactly what is being replaced.

**CRITICAL: Use smart quotes for new content.** When adding text with apostrophes or quotes, use XML entities to produce smart quotes:
```xml
<!-- Use these entities for professional typography -->
<w:t>Here&#x2019;s a quote: &#x201C;Hello&#x201D;</w:t>
```
| Entity | Character |
|--------|-----------|
| `&#x2018;` | ‘ (left single) |
| `&#x2019;` | ’ (right single / apostrophe) |
| `&#x201C;` | “ (left double) |
| `&#x201D;` | ” (right double) |

**Adding comments:** Use `comment.py` to handle boilerplate across multiple XML files (text must be pre-escaped XML):
```bash
python scripts/comment.py unpacked/ 0 "Comment text with &amp; and &#x2019;"
python scripts/comment.py unpacked/ 1 "Reply text" --parent 0  # reply to comment 0
python scripts/comment.py unpacked/ 0 "Text" --author "Custom Author"  # custom author name
```
Then add markers to document.xml (see Comments in XML Reference).

### Step 3: Pack
```bash
python scripts/pack.py unpacked/ output.docx --original document.docx
```
Validates with auto-repair, condenses XML, and creates DOCX. Use `--validate false` to skip.

**Auto-repair will fix:**
- `durableId` >= 0x7FFFFFFF (regenerates valid ID)
- Missing `xml:space="preserve"` on `<w:t>` with whitespace

**Auto-repair won't fix:**
- Malformed XML, invalid element nesting, missing relationships, schema violations

### Common Pitfalls

- **Replace entire `<w:r>` elements**: When adding tracked changes, replace the whole `<w:r>...</w:r>` block with `<w:del>...<w:ins>...` as siblings. Don't inject tracked change tags inside a run.
- **Preserve `<w:rPr>` formatting**: Copy the original run's `<w:rPr>` block into your tracked change runs to maintain bold, font size, etc.

---

## XML Reference

### Schema Compliance

- **Element order in `<w:pPr>`**: `<w:pStyle>`, `<w:numPr>`, `<w:spacing>`, `<w:ind>`, `<w:jc>`, `<w:rPr>` last
- **Whitespace**: Add `xml:space="preserve"` to `<w:t>` with leading/trailing spaces
- **RSIDs**: Must be 8-digit hex (e.g., `00AB1234`)

### Tracked Changes

**Insertion:**
```xml
<w:ins w:id="1" w:author="AI Assistant" w:date="2025-01-01T00:00:00Z">
  <w:r><w:t>inserted text</w:t></w:r>
</w:ins>
```

**Deletion:**
```xml
<w:del w:id="2" w:author="AI Assistant" w:date="2025-01-01T00:00:00Z">
  <w:r><w:delText>deleted text</w:delText></w:r>
</w:del>
```

**Inside `<w:del>`**: Use `<w:delText>` instead of `<w:t>`, and `<w:delInstrText>` instead of `<w:instrText>`.

**Minimal edits** - only mark what changes:
```xml
<!-- Change "30 days" to "60 days" -->
<w:r><w:t>The term is </w:t></w:r>
<w:del w:id="1" w:author="AI Assistant" w:date="...">
  <w:r><w:delText>30</w:delText></w:r>
</w:del>
<w:ins w:id="2" w:author="AI Assistant" w:date="...">
  <w:r><w:t>60</w:t></w:r>
</w:ins>
<w:r><w:t> days.</w:t></w:r>
```

**Deleting entire paragraphs/list items** - when removing ALL content from a paragraph, also mark the paragraph mark as deleted so it merges with the next paragraph. Add `<w:del/>` inside `<w:pPr><w:rPr>`:
```xml
<w:p>
  <w:pPr>
    <w:numPr>...</w:numPr>  <!-- list numbering if present -->
    <w:rPr>
      <w:del w:id="1" w:author="AI Assistant" w:date="2025-01-01T00:00:00Z"/>
    </w:rPr>
  </w:pPr>
  <w:del w:id="2" w:author="AI Assistant" w:date="2025-01-01T00:00:00Z">
    <w:r><w:delText>Entire paragraph content being deleted...</w:delText></w:r>
  </w:del>
</w:p>
```
Without the `<w:del/>` in `<w:pPr><w:rPr>`, accepting changes leaves an empty paragraph/list item.

**Rejecting another author's insertion** - nest deletion inside their insertion:
```xml
<w:ins w:author="Jane" w:id="5">
  <w:del w:author="AI Assistant" w:id="10">
    <w:r><w:delText>their inserted text</w:delText></w:r>
  </w:del>
</w:ins>
```

**Restoring another author's deletion** - add insertion after (don't modify their deletion):
```xml
<w:del w:author="Jane" w:id="5">
  <w:r><w:delText>deleted text</w:delText></w:r>
</w:del>
<w:ins w:author="AI Assistant" w:id="10">
  <w:r><w:t>deleted text</w:t></w:r>
</w:ins>
```

### Comments

After running `comment.py` (see Step 2), add markers to document.xml. For replies, use `--parent` flag and nest markers inside the parent's.

**CRITICAL: `<w:commentRangeStart>` and `<w:commentRangeEnd>` are siblings of `<w:r>`, never inside `<w:r>`.**

```xml
<!-- Comment markers are direct children of w:p, never inside w:r -->
<w:commentRangeStart w:id="0"/>
<w:del w:id="1" w:author="AI Assistant" w:date="2025-01-01T00:00:00Z">
  <w:r><w:delText>deleted</w:delText></w:r>
</w:del>
<w:r><w:t> more text</w:t></w:r>
<w:commentRangeEnd w:id="0"/>
<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="0"/></w:r>

<!-- Comment 0 with reply 1 nested inside -->
<w:commentRangeStart w:id="0"/>
  <w:commentRangeStart w:id="1"/>
  <w:r><w:t>text</w:t></w:r>
  <w:commentRangeEnd w:id="1"/>
<w:commentRangeEnd w:id="0"/>
<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="0"/></w:r>
<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="1"/></w:r>
```

### Images

1. Add image file to `word/media/`
2. Add relationship to `word/_rels/document.xml.rels`:
```xml
<Relationship Id="rId5" Type=".../image" Target="media/image1.png"/>
```
3. Add content type to `[Content_Types].xml`:
```xml
<Default Extension="png" ContentType="image/png"/>
```
4. Reference in document.xml:
```xml
<w:drawing>
  <wp:inline>
    <wp:extent cx="914400" cy="914400"/>  <!-- EMUs: 914400 = 1 inch -->
    <a:graphic>
      <a:graphicData uri=".../picture">
        <pic:pic>
          <pic:blipFill><a:blip r:embed="rId5"/></pic:blipFill>
        </pic:pic>
      </a:graphicData>
    </a:graphic>
  </wp:inline>
</w:drawing>
```

---

## Dependencies

- **pandoc**: Text extraction
- **docx**: `npm install docx` (project dependency for new documents)
- **LibreOffice**: PDF conversion
- **Poppler**: `pdftoppm` for images
