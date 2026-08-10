import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Logo } from './Logo';

describe('Logo', () => {
  it('renderiza con role="img" y aria-label accesible', () => {
    render(<Logo />);
    expect(screen.getByRole('img', { name: /workrules logo/i })).toBeInTheDocument();
  });

  it('la altura del SVG crece con size (sm < md < lg)', () => {
    const heights = (['sm', 'md', 'lg'] as const).map((size) => {
      const { container } = render(<Logo size={size} />);
      return Number(container.querySelector('svg')?.getAttribute('height'));
    });
    expect(heights[0]).toBeLessThan(heights[1]);
    expect(heights[1]).toBeLessThan(heights[2]);
  });

  it('cada variant expone un viewBox distinto', () => {
    const viewBoxes = (['full', 'icon', 'text'] as const).map((variant) => {
      const { container } = render(<Logo variant={variant} />);
      return container.querySelector('svg')?.getAttribute('viewBox');
    });
    expect(viewBoxes).not.toContain(undefined);
    expect(viewBoxes).not.toContain(null);
    expect(new Set(viewBoxes).size).toBe(viewBoxes.length);
  });
});
