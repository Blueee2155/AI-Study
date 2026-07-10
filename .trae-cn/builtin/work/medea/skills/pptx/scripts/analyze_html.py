#!/usr/bin/env python3
"""Analyze HTML files to extract design specs for presentation replication.

Extracts color schemes, typography, and content structure from HTML pages
for use in creating or editing PowerPoint presentations.

Usage:
    python analyze_html.py <html_file> [--output json|text]

Examples:
    python analyze_html.py page.html
    python analyze_html.py page.html --output text
    python analyze_html.py page.html > design.json
"""

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import urljoin

from bs4 import BeautifulSoup, Comment

try:
    import tinycss2
    HAS_TINYCSS = True
except ImportError:
    HAS_TINYCSS = False

COLOR_PATTERN = re.compile(
    r"#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b|"
    r"rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)|"
    r"rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*[\d.]+\s*\)"
)

FONT_SIZE_PATTERN = re.compile(r"(\d+(?:\.\d+)?)(px|pt|em|rem)")

COMMON_FONTS = {
    "arial": "Arial",
    "helvetica": "Helvetica",
    "georgia": "Georgia",
    "times": "Times New Roman",
    "times new roman": "Times New Roman",
    "calibri": "Calibri",
    "verdana": "Verdana",
    "tahoma": "Tahoma",
    "trebuchet": "Trebuchet MS",
    "trebuchet ms": "Trebuchet MS",
    "impact": "Impact",
    "consolas": "Consolas",
    "courier": "Courier New",
    "courier new": "Courier New",
    "palatino": "Palatino",
    "garamond": "Garamond",
    "cambria": "Cambria",
}


def normalize_hex(color: str) -> str:
    """Normalize color to 6-digit uppercase hex without #."""
    color = color.lstrip("#").upper()
    if len(color) == 3:
        color = "".join(c * 2 for c in color)
    return color


def rgb_to_hex(r: int, g: int, b: int) -> str:
    """Convert RGB values to 6-digit hex."""
    return f"{r:02X}{g:02X}{b:02X}"


def extract_color(match: re.Match) -> str | None:
    """Extract hex color from regex match."""
    groups = match.groups()
    if groups[0]:  # hex
        return normalize_hex(groups[0])
    elif groups[1]:  # rgb
        return rgb_to_hex(int(groups[1]), int(groups[2]), int(groups[3]))
    elif groups[4]:  # rgba
        return rgb_to_hex(int(groups[4]), int(groups[5]), int(groups[6]))
    return None


def parse_font_size(size_str: str) -> float | None:
    """Parse font size string to points."""
    match = FONT_SIZE_PATTERN.search(size_str)
    if not match:
        return None

    value, unit = float(match.group(1)), match.group(2)
    if unit == "px":
        return value * 0.75  # px to pt
    elif unit == "pt":
        return value
    elif unit in ("em", "rem"):
        return value * 12  # assume 16px base, convert to pt
    return None


def extract_font_family(font_str: str) -> str | None:
    """Extract primary font family from CSS font-family string."""
    fonts = [f.strip().strip("'\"").lower() for f in font_str.split(",")]
    for font in fonts:
        if font in COMMON_FONTS:
            return COMMON_FONTS[font]
        for key, name in COMMON_FONTS.items():
            if key in font:
                return name
    return fonts[0].title() if fonts else None


def analyze_styles(soup: BeautifulSoup, html_content: str) -> dict:
    """Extract color and typography information from HTML/CSS."""
    colors = {"background": [], "text": [], "heading": [], "accent": [], "border": []}
    typography = {"headingFont": None, "bodyFont": None, "sizes": {}}

    inline_styles = []
    for tag in soup.find_all(style=True):
        inline_styles.append(tag.get("style", ""))

    style_tags = soup.find_all("style")
    css_content = " ".join(tag.string or "" for tag in style_tags)

    all_css = css_content + " " + " ".join(inline_styles)

    for match in COLOR_PATTERN.finditer(all_css):
        color = extract_color(match)
        if color and color not in ("FFFFFF", "000000"):
            context = all_css[max(0, match.start() - 50) : match.start()].lower()
            if "background" in context or "bg" in context:
                colors["background"].append(color)
            elif "border" in context:
                colors["border"].append(color)
            elif any(h in context for h in ["h1", "h2", "h3", "heading", "title"]):
                colors["heading"].append(color)
            elif "link" in context or ":hover" in context or "accent" in context:
                colors["accent"].append(color)
            else:
                colors["text"].append(color)

    body = soup.find("body")
    if body:
        body_style = body.get("style", "")
        if "background" in body_style:
            for match in COLOR_PATTERN.finditer(body_style):
                color = extract_color(match)
                if color:
                    colors["background"].insert(0, color)

    for tag in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"]):
        style = tag.get("style", "")
        for match in COLOR_PATTERN.finditer(style):
            color = extract_color(match)
            if color:
                colors["heading"].append(color)

        if "font-family" in style:
            font_match = re.search(r"font-family:\s*([^;]+)", style)
            if font_match and not typography["headingFont"]:
                typography["headingFont"] = extract_font_family(font_match.group(1))

        if "font-size" in style:
            size = parse_font_size(style)
            if size:
                typography["sizes"][tag.name] = size

    for tag in soup.find_all(["p", "span", "div"]):
        style = tag.get("style", "")
        if "font-family" in style:
            font_match = re.search(r"font-family:\s*([^;]+)", style)
            if font_match and not typography["bodyFont"]:
                typography["bodyFont"] = extract_font_family(font_match.group(1))
                break

    font_family_pattern = re.compile(r"font-family:\s*([^;}\n]+)")
    for match in font_family_pattern.finditer(all_css):
        font = extract_font_family(match.group(1))
        if font:
            if not typography["bodyFont"]:
                typography["bodyFont"] = font
            break

    return {"colors": colors, "typography": typography}


def extract_content(soup: BeautifulSoup, base_url: str = "") -> list[dict]:
    """Extract content structure from HTML."""
    content = []

    for comment in soup.find_all(string=lambda t: isinstance(t, Comment)):
        comment.extract()

    main_content = soup.find("main") or soup.find("article") or soup.find("body")
    if not main_content:
        return content

    for element in main_content.find_all(
        ["h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol", "img", "table", "blockquote"],
        recursive=True,
    ):
        if element.find_parent(["nav", "header", "footer", "aside", "script", "style"]):
            continue

        tag_name = element.name

        if tag_name.startswith("h") and len(tag_name) == 2:
            text = element.get_text(strip=True)
            if text:
                content.append({
                    "type": "heading",
                    "level": int(tag_name[1]),
                    "text": text,
                })

        elif tag_name == "p":
            text = element.get_text(strip=True)
            if text and len(text) > 10:
                content.append({"type": "paragraph", "text": text})

        elif tag_name in ("ul", "ol"):
            items = [li.get_text(strip=True) for li in element.find_all("li", recursive=False)]
            items = [item for item in items if item]
            if items:
                content.append({
                    "type": "list",
                    "ordered": tag_name == "ol",
                    "items": items,
                })

        elif tag_name == "img":
            src = element.get("src", "")
            alt = element.get("alt", "")
            if src:
                if base_url and not src.startswith(("http://", "https://", "data:")):
                    src = urljoin(base_url, src)
                content.append({"type": "image", "src": src, "alt": alt})

        elif tag_name == "table":
            rows = []
            for tr in element.find_all("tr"):
                cells = [
                    td.get_text(strip=True)
                    for td in tr.find_all(["th", "td"])
                ]
                if cells:
                    rows.append(cells)
            if rows:
                content.append({"type": "table", "rows": rows})

        elif tag_name == "blockquote":
            text = element.get_text(strip=True)
            if text:
                content.append({"type": "quote", "text": text})

    return content


def get_dominant_color(color_list: list[str]) -> str | None:
    """Get most common color from list."""
    if not color_list:
        return None
    counter = Counter(color_list)
    return counter.most_common(1)[0][0]


def analyze_html(html_file: str, base_url: str = "") -> dict:
    """Analyze HTML file and extract design specifications.

    Args:
        html_file: Path to HTML file
        base_url: Base URL for resolving relative image paths

    Returns:
        Dictionary with colors, typography, and content
    """
    html_path = Path(html_file)

    if not html_path.exists():
        print(f"Error: {html_file} not found", file=sys.stderr)
        sys.exit(1)

    html_content = html_path.read_text(encoding="utf-8")
    soup = BeautifulSoup(html_content, "html.parser")

    style_data = analyze_styles(soup, html_content)

    colors_raw = style_data["colors"]
    colors = {
        "primary": get_dominant_color(colors_raw["heading"]) or get_dominant_color(colors_raw["text"]) or "333333",
        "secondary": get_dominant_color(colors_raw["text"]) or "666666",
        "accent": get_dominant_color(colors_raw["accent"]) or "0066CC",
        "background": get_dominant_color(colors_raw["background"]) or "FFFFFF",
        "border": get_dominant_color(colors_raw["border"]) or "CCCCCC",
    }

    typography = style_data["typography"]
    if not typography["headingFont"]:
        typography["headingFont"] = "Arial"
    if not typography["bodyFont"]:
        typography["bodyFont"] = "Calibri"

    sizes = typography.pop("sizes", {})
    typography["h1Size"] = sizes.get("h1", 36)
    typography["h2Size"] = sizes.get("h2", 28)
    typography["bodySize"] = 14

    content = extract_content(soup, base_url)

    return {
        "colors": colors,
        "typography": typography,
        "content": content,
    }


def format_text_output(result: dict) -> str:
    """Format result as human-readable text."""
    lines = []
    lines.append("=" * 60)
    lines.append("HTML DESIGN ANALYSIS")
    lines.append("=" * 60)

    lines.append("\n## Colors (PPT hex format, no #)")
    for name, value in result["colors"].items():
        lines.append(f"  {name}: {value}")

    lines.append("\n## Typography")
    for name, value in result["typography"].items():
        lines.append(f"  {name}: {value}")

    lines.append(f"\n## Content ({len(result['content'])} elements)")
    for i, item in enumerate(result["content"][:20], 1):
        item_type = item["type"]
        if item_type == "heading":
            lines.append(f"  {i}. [H{item['level']}] {item['text'][:60]}")
        elif item_type == "paragraph":
            lines.append(f"  {i}. [P] {item['text'][:60]}...")
        elif item_type == "list":
            prefix = "OL" if item.get("ordered") else "UL"
            lines.append(f"  {i}. [{prefix}] {len(item['items'])} items")
        elif item_type == "image":
            lines.append(f"  {i}. [IMG] {item['src'][:50]}")
        elif item_type == "table":
            lines.append(f"  {i}. [TABLE] {len(item['rows'])} rows")
        elif item_type == "quote":
            lines.append(f"  {i}. [QUOTE] {item['text'][:50]}...")

    if len(result["content"]) > 20:
        lines.append(f"  ... and {len(result['content']) - 20} more elements")

    lines.append("\n" + "=" * 60)
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Analyze HTML to extract design specs for PPT replication."
    )
    parser.add_argument("html_file", help="Input HTML file")
    parser.add_argument(
        "--output",
        choices=["json", "text"],
        default="json",
        help="Output format (default: json)",
    )
    parser.add_argument(
        "--base-url",
        default="",
        help="Base URL for resolving relative image paths",
    )

    args = parser.parse_args()

    result = analyze_html(args.html_file, args.base_url)

    if args.output == "json":
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print(format_text_output(result))


if __name__ == "__main__":
    main()
