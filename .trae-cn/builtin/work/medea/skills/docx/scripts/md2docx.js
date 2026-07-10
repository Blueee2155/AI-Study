#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Header, Footer, AlignmentType, PageOrientation, LevelFormat, ExternalHyperlink,
  TableOfContents, HeadingLevel, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageNumber, PageBreak } = require('docx');

const defaultConfig = {
  pageSize: 'US_LETTER',
  fonts: {
    ascii: 'Arial',
    eastAsia: 'Microsoft YaHei'
  },
  margins: {
    top: 1440,
    right: 1440,
    bottom: 1440,
    left: 1440
  },
  includeTableOfContents: false,
  imageWidth: 600
};

const PAGE_SIZES = {
  US_LETTER: { width: 12240, height: 15840 },
  A4: { width: 11906, height: 16838 }
};

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && i + 1 < args.length) {
      result.input = args[++i];
    } else if (args[i] === '--output' && i + 1 < args.length) {
      result.output = args[++i];
    } else if (args[i] === '--title' && i + 1 < args.length) {
      result.title = args[++i];
    } else if (args[i] === '--config' && i + 1 < args.length) {
      result.config = args[++i];
    }
  }

  if (!result.input || !result.output) {
    console.error('Usage: node md2docx.js --input "section-*.md" --output report.docx [--title "Title"] [--config config.json]');
    process.exit(1);
  }

  return result;
}

function loadConfig(configPath) {
  if (!configPath || !fs.existsSync(configPath)) {
    return defaultConfig;
  }

  try {
    const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return { ...defaultConfig, ...userConfig };
  } catch (error) {
    console.warn(`Warning: Failed to load config from ${configPath}, using defaults`);
    return defaultConfig;
  }
}

function findMarkdownFiles(pattern) {
  const dir = path.dirname(pattern) || '.';
  const filePattern = path.basename(pattern);

  if (!fs.existsSync(dir)) {
    console.error(`Error: Directory not found: ${dir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(dir)
    .filter(f => {
      if (!f.endsWith('.md')) return false;
      if (f === 'outline.md' || f === 'README.md') return false;

      const regex = new RegExp('^' + filePattern.replace(/\*/g, '.*') + '$');
      return regex.test(f);
    })
    .map(f => path.join(dir, f))
    .sort();

  if (files.length === 0) {
    console.error(`Error: No markdown files found matching pattern: ${pattern}`);
    process.exit(1);
  }

  return files;
}

function parseTextWithFormatting(text) {
  const segments = [];
  const regex = /(\*\*\*|___|(?<!\*)\*\*(?!\*)|(?<!_)__(?!_)|(?<!\*)\*(?!\*)|(?<!_)_(?!_))(.*?)\1/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push(new TextRun(text.substring(lastIndex, match.index)));
    }

    const marker = match[1];
    const content = match[2];
    let textRun;

    if (marker === '***' || marker === '___') {
      textRun = new TextRun({ text: content, bold: true, italics: true });
    } else if (marker === '**' || marker === '__') {
      textRun = new TextRun({ text: content, bold: true });
    } else if (marker === '*' || marker === '_') {
      textRun = new TextRun({ text: content, italics: true });
    }

    segments.push(textRun);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push(new TextRun(text.substring(lastIndex)));
  }

  return segments.length > 0 ? segments : [new TextRun(text)];
}

function parseMarkdownContent(content, config, workingDir) {
  const lines = content.split('\n');
  const elements = [];
  let currentListItems = [];
  let listReference = null;
  let listCounter = 0;
  let inTable = false;
  let tableRows = [];

  const flushList = () => {
    if (currentListItems.length > 0) {
      elements.push(...currentListItems);
      currentListItems = [];
      listReference = null;
    }
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
      const borders = { top: border, bottom: border, left: border, right: border };

      const columnCount = tableRows[0].length;
      const columnWidth = Math.floor(9360 / columnCount);
      const columnWidths = new Array(columnCount).fill(columnWidth);

      const rows = tableRows.map((row, rowIndex) => {
        const cells = row.map(cellText => new TableCell({
          borders,
          width: { size: columnWidth, type: WidthType.DXA },
          shading: {
            fill: rowIndex === 0 ? 'D5E8F0' : 'FFFFFF',
            type: ShadingType.CLEAR
          },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: parseTextWithFormatting(cellText.trim()) })]
        }));

        return new TableRow({ children: cells, cantSplit: true });
      });

      elements.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths,
        rows
      }));

      tableRows = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/^\|.+\|$/)) {
      flushList();

      if (i + 1 < lines.length && lines[i + 1].match(/^\|[-:\s|]+\|$/)) {
        inTable = true;
        const headerCells = line.split('|').filter(s => s.trim()).map(s => s.trim());
        tableRows.push(headerCells);
        i++;
        continue;
      } else if (inTable) {
        const cells = line.split('|').filter(s => s.trim()).map(s => s.trim());
        tableRows.push(cells);
        continue;
      }
    } else if (inTable) {
      flushTable();
    }

    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      flushList();
      flushTable();

      const altText = imageMatch[1];
      const imagePath = path.join(workingDir, imageMatch[2]);

      if (fs.existsSync(imagePath)) {
        try {
          const imageExt = path.extname(imagePath).slice(1).toLowerCase();
          const imageType = imageExt === 'jpg' ? 'jpeg' : imageExt;

          elements.push(new Paragraph({
            children: [new ImageRun({
              type: imageType,
              data: fs.readFileSync(imagePath),
              transformation: { width: config.imageWidth, height: config.imageWidth * 0.75 },
              altText: { title: altText, description: altText, name: path.basename(imagePath) }
            })]
          }));
        } catch (error) {
          console.warn(`Warning: Failed to embed image ${imagePath}: ${error.message}`);
          elements.push(new Paragraph({ children: [new TextRun(`[Image: ${altText}]`)] }));
        }
      } else {
        console.warn(`Warning: Image not found: ${imagePath}`);
        elements.push(new Paragraph({ children: [new TextRun(`[Image not found: ${altText}]`)] }));
      }
      continue;
    }

    if (line.match(/^#{1,6}\s/)) {
      flushList();
      flushTable();

      const level = line.match(/^#{1,6}/)[0].length;
      const text = line.replace(/^#{1,6}\s+/, '');

      const headingLevels = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
        4: HeadingLevel.HEADING_4,
        5: HeadingLevel.HEADING_5,
        6: HeadingLevel.HEADING_6
      };

      elements.push(new Paragraph({
        heading: headingLevels[level],
        children: parseTextWithFormatting(text)
      }));
    } else if (line.match(/^\d+\.\s/)) {
      flushTable();

      const text = line.replace(/^\d+\.\s+/, '');

      if (!listReference || !listReference.startsWith('numbers-')) {
        flushList();
        listReference = `numbers-${listCounter}`;
        listCounter++;
      }

      currentListItems.push(new Paragraph({
        numbering: { reference: listReference, level: 0 },
        children: parseTextWithFormatting(text)
      }));
    } else if (line.match(/^[-*]\s/)) {
      flushTable();

      const text = line.replace(/^[-*]\s+/, '');

      if (!listReference || !listReference.startsWith('bullets-')) {
        flushList();
        listReference = `bullets-${listCounter}`;
        listCounter++;
      }

      currentListItems.push(new Paragraph({
        numbering: { reference: listReference, level: 0 },
        children: parseTextWithFormatting(text)
      }));
    } else if (line.trim() === '') {
      flushList();
      flushTable();
      elements.push(new Paragraph({ children: [new TextRun('')] }));
    } else if (line.trim() !== '') {
      flushList();
      flushTable();
      elements.push(new Paragraph({ children: parseTextWithFormatting(line) }));
    }
  }

  flushList();
  flushTable();

  return elements;
}

function createNumberingConfig(listCounter) {
  const config = [];

  for (let i = 0; i < listCounter; i++) {
    config.push({
      reference: `bullets-${i}`,
      levels: [{
        level: 0,
        format: LevelFormat.BULLET,
        text: '•',
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } }
      }]
    });

    config.push({
      reference: `numbers-${i}`,
      levels: [{
        level: 0,
        format: LevelFormat.DECIMAL,
        text: '%1.',
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } }
      }]
    });
  }

  return config;
}

function main() {
  const args = parseArgs();
  const config = loadConfig(args.config);
  const files = findMarkdownFiles(args.input);

  console.log(`Found ${files.length} markdown file(s):`);
  files.forEach(f => console.log(`  - ${f}`));

  const workingDir = path.dirname(files[0]);
  let fullContent = '';

  files.forEach(file => {
    fullContent += fs.readFileSync(file, 'utf-8') + '\n\n';
  });

  console.log('\nParsing markdown content...');
  const elements = parseMarkdownContent(fullContent, config, workingDir);

  if (args.title) {
    elements.unshift(new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun(args.title)]
    }));
    elements.unshift(new Paragraph({ children: [new PageBreak()] }));
  }

  if (config.includeTableOfContents) {
    elements.unshift(new TableOfContents('Table of Contents', {
      hyperlink: true,
      headingStyleRange: '1-3'
    }));
    elements.unshift(new Paragraph({ children: [new PageBreak()] }));
  }

  const pageSize = PAGE_SIZES[config.pageSize] || PAGE_SIZES.US_LETTER;

  const doc = new Document({
    numbering: {
      config: createNumberingConfig(100)
    },
    styles: {
      default: {
        document: {
          run: {
            font: {
              ascii: config.fonts.ascii,
              hAnsi: config.fonts.ascii,
              eastAsia: config.fonts.eastAsia
            },
            size: 24
          }
        }
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            size: 32,
            bold: true,
            font: {
              ascii: config.fonts.ascii,
              hAnsi: config.fonts.ascii,
              eastAsia: config.fonts.eastAsia
            }
          },
          paragraph: {
            spacing: { before: 240, after: 240 },
            outlineLevel: 0,
            keepNext: false,
            keepLines: false
          }
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            size: 28,
            bold: true,
            font: {
              ascii: config.fonts.ascii,
              hAnsi: config.fonts.ascii,
              eastAsia: config.fonts.eastAsia
            }
          },
          paragraph: {
            spacing: { before: 180, after: 180 },
            outlineLevel: 1,
            keepNext: false,
            keepLines: false
          }
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            size: 26,
            bold: true,
            font: {
              ascii: config.fonts.ascii,
              hAnsi: config.fonts.ascii,
              eastAsia: config.fonts.eastAsia
            }
          },
          paragraph: {
            spacing: { before: 160, after: 160 },
            outlineLevel: 2,
            keepNext: false,
            keepLines: false
          }
        }
      ]
    },
    sections: [{
      properties: {
        page: {
          size: pageSize,
          margin: config.margins
        }
      },
      children: elements
    }]
  });

  console.log('\nGenerating DOCX file...');

  Packer.toBuffer(doc).then(buffer => {
    fs.writeFileSync(args.output, buffer);
    console.log(`✅ Success! Document saved to: ${args.output}`);
  }).catch(error => {
    console.error(`❌ Error generating DOCX: ${error.message}`);
    process.exit(1);
  });
}

main();
