#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const DOM_TO_PPTX_BUNDLE_PATH = path.join(__dirname, 'node_modules/dom-to-pptx/dist/dom-to-pptx.bundle.js');

async function convertHtmlToPptx(htmlPath, outputPath, options = {}) {
  const absoluteHtmlPath = path.resolve(htmlPath);

  if (!fs.existsSync(absoluteHtmlPath)) {
    console.error(`Error: HTML file not found: ${absoluteHtmlPath}`);
    process.exit(1);
  }

  console.log(`Converting: ${absoluteHtmlPath}`);
  console.log(`Output: ${outputPath}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--allow-file-access-from-files',
      '--disable-web-security'
    ]
  });

  let conversionError = null;

  try {
    const page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 1080 });

    await page.goto(`file://${absoluteHtmlPath}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await page.evaluate(async () => {
      async function toDataURL(url) {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      const imgs = document.querySelectorAll('img');
      for (const img of imgs) {
        if (img.src && !img.src.startsWith('data:')) {
          try {
            img.src = await toDataURL(img.src);
          } catch (e) {
            console.error('Failed to inline image:', img.src, e);
          }
        }
      }

      const elements = document.querySelectorAll('*');
      for (const el of elements) {
        const style = window.getComputedStyle(el);
        const bgImg = style.backgroundImage;
        if (bgImg && bgImg !== 'none' && bgImg.includes('url(') && !bgImg.includes('data:')) {
          const urlMatch = bgImg.match(/url\(['"]?(.*?)['"]?\)/);
          if (urlMatch && urlMatch[1]) {
            try {
              const dataUrl = await toDataURL(urlMatch[1]);
              el.style.backgroundImage = `url("${dataUrl}")`;
            } catch (e) {
              console.error('Failed to inline background image:', urlMatch[1], e);
            }
          }
        }
      }
    });

    await page.addScriptTag({
      path: DOM_TO_PPTX_BUNDLE_PATH
    });

    await page.waitForFunction(() => typeof window.domToPptx !== 'undefined', {
      timeout: 10000
    });

    const slideSelector = options.slideSelector || '.slide';
    const svgAsVector = options.svgAsVector !== false;

    const pptxData = await page.evaluate(async (selector, svgAsVector) => {
      const slides = document.querySelectorAll(selector);

      if (slides.length === 0) {
        throw new Error(`No slides found with selector: ${selector}`);
      }

      console.log(`Found ${slides.length} slides`);

      const blob = await window.domToPptx.exportToPptx(Array.from(slides), {
        skipDownload: true,
        svgAsVector: svgAsVector,
        autoEmbedFonts: true
      });

      const arrayBuffer = await blob.arrayBuffer();
      return Array.from(new Uint8Array(arrayBuffer));
    }, slideSelector, svgAsVector);

    const buffer = Buffer.from(pptxData);
    fs.writeFileSync(outputPath, buffer);

    console.log(`Success! PPTX saved to: ${outputPath}`);
    console.log(`File size: ${(buffer.length / 1024).toFixed(2)} KB`);

  } catch (error) {
    console.error('Conversion failed:', error.message);
    conversionError = error;
  } finally {
    await browser.close();
  }

  if (conversionError) {
    process.exit(1);
  }
}

function printUsage() {
  console.log(`
Usage: node convert.js <input.html> [output.pptx] [options]

Arguments:
  input.html    Path to the HTML file containing slides
  output.pptx   Output PPTX file path (default: output.pptx)

Options:
  --selector    CSS selector for slides (default: .slide)
  --no-svg      Rasterize SVGs instead of keeping as vectors

Examples:
  node convert.js presentation.html
  node convert.js presentation.html my-slides.pptx
  node convert.js presentation.html output.pptx --selector ".page"
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const htmlPath = args[0];
  let outputPath = 'output.pptx';
  const options = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--selector' && args[i + 1]) {
      options.slideSelector = args[i + 1];
      i++;
    } else if (arg === '--no-svg') {
      options.svgAsVector = false;
    } else if (!arg.startsWith('--') && !outputPath.endsWith('.pptx')) {
      outputPath = arg;
    } else if (!arg.startsWith('--')) {
      outputPath = arg;
    }
  }

  if (!outputPath.endsWith('.pptx')) {
    outputPath += '.pptx';
  }

  await convertHtmlToPptx(htmlPath, outputPath, options);
}

main().catch(console.error);
