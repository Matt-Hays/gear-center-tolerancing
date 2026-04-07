import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type RgbaColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

function getStylesheet() {
  return readFileSync(resolve('src/style.css'), 'utf8');
}

function extractBlock(source: string, selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm'));
  if (!match) {
    throw new Error(`Missing CSS block for ${selector}`);
  }

  return match[1];
}

function extractVariable(block: string, name: string) {
  const match = block.match(new RegExp(`${name}:\\s*([^;]+);`));
  if (!match) {
    throw new Error(`Missing CSS variable ${name}`);
  }

  return match[1].trim();
}

function parseColor(input: string): RgbaColor {
  if (input.startsWith('#')) {
    const hex = input.slice(1);
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1
      };
    }

    throw new Error(`Unsupported hex color ${input}`);
  }

  const rgbaMatch = input.match(/^rgba?\(([^)]+)\)$/);
  if (!rgbaMatch) {
    throw new Error(`Unsupported color ${input}`);
  }

  const [r, g, b, a = '1'] = rgbaMatch[1].split(',').map((part) => part.trim());
  return {
    r: Number(r),
    g: Number(g),
    b: Number(b),
    a: Number(a)
  };
}

function composite(foreground: RgbaColor, background: RgbaColor): RgbaColor {
  if (foreground.a >= 1) {
    return foreground;
  }

  return {
    r: Math.round(foreground.r * foreground.a + background.r * (1 - foreground.a)),
    g: Math.round(foreground.g * foreground.a + background.g * (1 - foreground.a)),
    b: Math.round(foreground.b * foreground.a + background.b * (1 - foreground.a)),
    a: 1
  };
}

function toRelativeChannel(value: number) {
  const normalized = value / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(color: RgbaColor) {
  return (
    0.2126 * toRelativeChannel(color.r) +
    0.7152 * toRelativeChannel(color.g) +
    0.0722 * toRelativeChannel(color.b)
  );
}

function contrastRatio(foreground: RgbaColor, background: RgbaColor) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

describe('theme contrast tokens', () => {
  it('defines the semantic readability tokens in both themes', () => {
    const stylesheet = getStylesheet();

    expect(stylesheet).toContain('--text-body');
    expect(stylesheet).toContain('--text-secondary');
    expect(stylesheet).toContain('--text-meta');
    expect(stylesheet).toContain('--surface-muted');
    expect(stylesheet).toContain('--surface-accent');
    expect(stylesheet).toContain('--focus-ring');
  });

  it.each([
    { selector: ':root', name: 'light' },
    { selector: "[data-theme='dark']", name: 'dark' }
  ])('keeps semantic text tokens above AA contrast in the $name theme', ({ selector }) => {
    const stylesheet = getStylesheet();
    const block = extractBlock(stylesheet, selector);

    const panel = parseColor(extractVariable(block, '--panel'));
    const panelStrong = parseColor(extractVariable(block, '--panel-strong'));
    const surfaceMuted = parseColor(extractVariable(block, '--surface-muted'));
    const surfaceAccent = parseColor(extractVariable(block, '--surface-accent'));

    for (const token of ['--text', '--text-body', '--text-secondary', '--text-meta', '--text-muted']) {
      const textColor = parseColor(extractVariable(block, token));

      expect(contrastRatio(textColor, panel)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(textColor, panelStrong)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(textColor, surfaceMuted)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(textColor, surfaceAccent)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each([
    { selector: ':root', accentText: '--text-inverse', accentBg: '--accent', label: 'light' },
    { selector: "[data-theme='dark']", accentText: '--text-inverse', accentBg: '--accent', label: 'dark' }
  ])('keeps action text and status text readable in the $label theme', ({ selector, accentText, accentBg }) => {
    const stylesheet = getStylesheet();
    const block = extractBlock(stylesheet, selector);
    const panel = parseColor(extractVariable(block, '--panel'));

    expect(contrastRatio(parseColor(extractVariable(block, accentText)), parseColor(extractVariable(block, accentBg)))).toBeGreaterThanOrEqual(4.5);

    for (const [textToken, bgToken] of [
      ['--success', '--success-soft'],
      ['--warning', '--warning-soft'],
      ['--danger', '--danger-soft']
    ] as const) {
      const textColor = parseColor(extractVariable(block, textToken));
      const background = composite(parseColor(extractVariable(block, bgToken)), panel);
      expect(contrastRatio(textColor, background)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
