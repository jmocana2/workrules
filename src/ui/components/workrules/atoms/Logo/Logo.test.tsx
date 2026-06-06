import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Logo } from './Logo';

describe('Logo', () => {
  describe('Renderizado básico', () => {
    it('debe renderizar correctamente con props por defecto', () => {
      render(<Logo />);
      const logo = screen.getByRole('img', { name: /workrules logo/i });
      expect(logo).toBeInTheDocument();
    });

    it('debe tener el atributo aria-label correcto', () => {
      render(<Logo />);
      const logo = screen.getByRole('img');
      expect(logo).toHaveAttribute('aria-label', 'WorkRules logo');
    });

    it('debe tener el role "img" para accesibilidad', () => {
      render(<Logo />);
      const logo = screen.getByRole('img');
      expect(logo).toBeInTheDocument();
    });

    it('debe renderizar un único SVG inline', () => {
      const { container } = render(<Logo />);
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBe(1);
    });
  });

  describe('Variantes (viewBox)', () => {
    it('variante "full" usa el viewBox completo', () => {
      const { container } = render(<Logo variant="full" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 809.846853 307.009461');
    });

    it('variante "icon" recorta al icono', () => {
      const { container } = render(<Logo variant="icon" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('viewBox', '60 30 320 260');
    });

    it('variante "text" recorta al texto', () => {
      const { container } = render(<Logo variant="text" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('viewBox', '340 60 460 200');
    });
  });

  describe('Tamaños (altura del SVG)', () => {
    it('size="sm" → height 24', () => {
      const { container } = render(<Logo variant="full" size="sm" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('height', '24');
    });

    it('size="md" → height 40', () => {
      const { container } = render(<Logo variant="full" size="md" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('height', '56');
    });

    it('size="lg" → height 88', () => {
      const { container } = render(<Logo variant="full" size="lg" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('height', '88');
    });

    it('por defecto usa size="md"', () => {
      const { container } = render(<Logo />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('height', '56');
    });

    it('width se ajusta al aspect ratio del viewBox', () => {
      const { container } = render(<Logo variant="full" size="md" />);
      const svg = container.querySelector('svg');
      // ratio full ≈ 2.638 * 56 ≈ 148
      expect(svg).toHaveAttribute('width', '148');
    });
  });

  describe('Temas', () => {
    it('theme="light" no añade clases dark', () => {
      const logo = render(<Logo theme="light" />).getByRole('img');
      expect(logo).not.toHaveClass('is-dark');
      expect(logo).not.toHaveClass('dark:is-dark');
    });

    it('theme="dark" añade la clase is-dark', () => {
      const logo = render(<Logo theme="dark" />).getByRole('img');
      expect(logo).toHaveClass('is-dark');
    });

    it('theme="auto" añade la clase dark:is-dark', () => {
      const logo = render(<Logo theme="auto" />).getByRole('img');
      expect(logo).toHaveClass('dark:is-dark');
    });

    it('por defecto usa theme="auto"', () => {
      const logo = render(<Logo />).getByRole('img');
      expect(logo).toHaveClass('dark:is-dark');
    });
  });

  describe('ClassName personalizada', () => {
    it('aplica la className personalizada', () => {
      render(<Logo className="custom-logo-class" />);
      const logo = screen.getByRole('img');
      expect(logo).toHaveClass('custom-logo-class');
    });

    it('mantiene las clases base junto con la className', () => {
      render(<Logo className="custom-class" />);
      const logo = screen.getByRole('img');
      expect(logo).toHaveClass('inline-flex');
      expect(logo).toHaveClass('items-center');
      expect(logo).toHaveClass('custom-class');
    });

    it('funciona sin className', () => {
      render(<Logo />);
      const logo = screen.getByRole('img');
      expect(logo).toBeInTheDocument();
    });
  });

  describe('Estructura del SVG', () => {
    it('tiene aria-hidden="true"', () => {
      const { container } = render(<Logo />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('contiene paths con la clase logo-fg (color tematizable)', () => {
      const { container } = render(<Logo />);
      const fgPaths = container.querySelectorAll('.logo-fg');
      expect(fgPaths.length).toBeGreaterThan(0);
    });

    it('contiene path en turquesa (#12a594) para el check', () => {
      const { container } = render(<Logo />);
      const turquoisePaths = container.querySelectorAll('path[fill="#12a594"]');
      expect(turquoisePaths.length).toBeGreaterThan(0);
    });
  });

  describe('Combinaciones de props', () => {
    it('funciona correctamente con múltiples props combinadas', () => {
      const { container } = render(
        <Logo variant="full" size="lg" theme="dark" className="custom" />
      );
      const logo = screen.getByRole('img');
      const svg = container.querySelector('svg');

      expect(logo).toHaveClass('is-dark');
      expect(logo).toHaveClass('custom');
      expect(svg).toHaveAttribute('height', '88');
    });

    it('mantiene la misma altura entre variantes con mismo size', () => {
      const { container: containerFull } = render(<Logo variant="full" size="md" />);
      const { container: containerIcon } = render(<Logo variant="icon" size="md" />);
      const { container: containerText } = render(<Logo variant="text" size="md" />);

      expect(containerFull.querySelector('svg')).toHaveAttribute('height', '56');
      expect(containerIcon.querySelector('svg')).toHaveAttribute('height', '56');
      expect(containerText.querySelector('svg')).toHaveAttribute('height', '56');
    });
  });
});
