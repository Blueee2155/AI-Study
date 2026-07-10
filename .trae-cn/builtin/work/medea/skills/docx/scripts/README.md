# DOCX Scripts

This directory contains automation scripts for working with DOCX files.

## Installation

The scripts require Node.js and the `docx` npm package.

### Option 1: Install in the scripts directory (Recommended)

```bash
cd apps/icube_server_rs/modules/ai-agent/builtin/work/medea/skills/docx/scripts
npm install
```

This will install dependencies locally and the script will work from any directory.

### Option 2: Install globally

```bash
npm install -g docx
```

Note: Global installation may not work in all environments due to Node.js module resolution.

## md2docx.js

Converts Markdown files to professional DOCX documents with automatic formatting.

### Usage

```bash
node md2docx.js --input "section-*.md" --output report.docx --title "My Report"
```

### Options

- `--input`: Glob pattern for input Markdown files (e.g., `"section-*.md"`)
- `--output`: Output DOCX file path
- `--title`: Document title (optional)
- `--config`: Path to JSON config file (optional)

### Configuration

Create a `docx-config.json` file to customize output:

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

### Supported Markdown Features

- **Headings**: `# H1`, `## H2`, `### H3`, etc.
- **Text formatting**: `**bold**`, `*italic*`, `***bold italic***`
- **Lists**: Numbered (`1. Item`) and bulleted (`- Item`)
- **Tables**: Standard Markdown table syntax
- **Images**: `![Alt](path)` - automatically embedded
- **Paragraphs**: Plain text with auto line wrapping

## Other Python Scripts

The Python scripts in this directory are for editing existing DOCX files:

- `unpack.py`: Extract and pretty-print XML from DOCX
- `pack.py`: Repack edited XML into DOCX
- `accept_changes.py`: Accept all tracked changes
- `comment.py`: Add comments to documents

See the main SKILL.md for detailed usage instructions.
