import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  });

  describe('Variantes', () => {
    it('debe renderizar la variante "full" con icono y texto', () => {
      const { container } = render(<Logo variant="full" />);
      const svg = container.querySelector('svg');
      const textElements = container.querySelectorAll('span');

      expect(svg).toBeInTheDocument();
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('debe renderizar la variante "icon" solo con el icono', () => {
      const { container } = render(<Logo variant="icon" />);
      const svg = container.querySelector('svg');
      const textContent = container.textContent;

      expect(svg).toBeInTheDocument();
      expect(textContent).toBe(''); // No debe contener texto visible
    });

    it('debe renderizar la variante "text" solo con texto', () => {
      const { container } = render(<Logo variant="text" />);
      const svg = container.querySelector('svg');
      const textElements = container.querySelectorAll('span');

      expect(svg).not.toBeInTheDocument();
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('debe mostrar "Work" y "Rules" en la variante text', () => {
      const { container } = render(<Logo variant="text" />);
      expect(container.textContent).toContain('Work');
      expect(container.textContent).toContain('Rules');
    });
  });

  describe('Tamaños', () => {
    it('debe aplicar la clase "h-6" para size="sm"', () => {
      render(<Logo size="sm" />);
      const logo = screen.getByRole('img');
      expect(logo).toHaveClass('h-6');
    });

    it('debe aplicar la clase "h-8" para size="md"', () => {
      render(<Logo size="md" />);
      const logo = screen.getByRole('img');
      expect(logo).toHaveClass('h-8');
    });

    it('debe aplicar la clase "h-12" para size="lg"', () => {
      render(<Logo size="lg" />);
      const logo = screen.getByRole('img');
      expect(logo).toHaveClass('h-12');
    });

    it('debe usar size="md" por defecto', () => {
      render(<Logo />);
      const logo = screen.getByRole('img');
      expect(logo).toHaveClass('h-8');
    });
  });

  describe('Temas', () => {
    it('debe aplicar clases de tema light', () => {
      const { container } = render(<Logo theme="light" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-gray-900');
    });

    it('debe aplicar clases de tema dark', () => {
      const { container } = render(<Logo theme="dark" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-white');
    });

    it('debe aplicar clases de tema auto (responsivo)', () => {
      const { container } = render(<Logo theme="auto" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-gray-900');
      expect(svg).toHaveClass('dark:text-white');
    });

    it('debe usar theme="auto" por defecto', () => {
      const { container } = render(<Logo />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-gray-900');
      expect(svg).toHaveClass('dark:text-white');
    });
  });

  describe('ClassName personalizada', () => {
    it('debe aceptar y aplicar una className personalizada', () => {
      const customClass = 'custom-logo-class';
      render(<Logo className={customClass} />);
      const logo = screen.getByRole('img');
      expect(logo).toHaveClass(customClass);
    });

    it('debe mantener las clases base cuando se agrega className', () => {
      render(<Logo className="custom-class" />);
      const logo = screen.getByRole('img');
      expect(logo).toHaveClass('inline-flex');
      expect(logo).toHaveClass('items-center');
      expect(logo).toHaveClass('gap-2');
      expect(logo).toHaveClass('custom-class');
    });

    it('debe funcionar sin className', () => {
      render(<Logo />);
      const logo = screen.getByRole('img');
      expect(logo).toBeInTheDocument();
    });
  });

  describe('Estructura del SVG', () => {
    it('debe tener el viewBox correcto en el SVG', () => {
      const { container } = render(<Logo variant="icon" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 32 32');
    });

    it('debe tener aria-hidden="true" en el SVG', () => {
      const { container } = render(<Logo variant="icon" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('debe ajustar el tamaño del SVG según el size prop', () => {
      const { container: containerSm } = render(<Logo variant="icon" size="sm" />);
      const svgSm = containerSm.querySelector('svg');
      expect(svgSm).toHaveAttribute('width', '24');
      expect(svgSm).toHaveAttribute('height', '24');

      const { container: containerMd } = render(<Logo variant="icon" size="md" />);
      const svgMd = containerMd.querySelector('svg');
      expect(svgMd).toHaveAttribute('width', '32');
      expect(svgMd).toHaveAttribute('height', '32');

      const { container: containerLg } = render(<Logo variant="icon" size="lg" />);
      const svgLg = containerLg.querySelector('svg');
      expect(svgLg).toHaveAttribute('width', '48');
      expect(svgLg).toHaveAttribute('height', '48');
    });
  });

  describe('Estructura del texto', () => {
    it('debe tener aria-hidden="true" en el texto', () => {
      const { container } = render(<Logo variant="text" />);
      const spans = container.querySelectorAll('span');
      const textContainer = Array.from(spans).find(
        span => span.classList.contains('font-bold')
      );
      expect(textContainer).toHaveAttribute('aria-hidden', 'true');
    });

    it('debe aplicar diferentes tamaños de texto según size prop', () => {
      const { container: containerSm } = render(<Logo variant="text" size="sm" />);
      const textSm = containerSm.querySelector('.text-lg');
      expect(textSm).toBeInTheDocument();

      const { container: containerMd } = render(<Logo variant="text" size="md" />);
      const textMd = containerMd.querySelector('.text-2xl');
      expect(textMd).toBeInTheDocument();

      const { container: containerLg } = render(<Logo variant="text" size="lg" />);
      const textLg = containerLg.querySelector('.text-4xl');
      expect(textLg).toBeInTheDocument();
    });

    it('debe aplicar clases de color primary y secondary correctamente', () => {
      const { container } = render(<Logo variant="text" />);
      const primaryText = container.querySelector('.text-primary');
      const secondaryText = container.querySelector('.text-secondary');

      expect(primaryText).toBeInTheDocument();
      expect(secondaryText).toBeInTheDocument();
      expect(primaryText?.textContent).toBe('Work');
      expect(secondaryText?.textContent).toBe('Rules');
    });
  });

  describe('Combinaciones de props', () => {
    it('debe funcionar correctamente con múltiples props combinadas', () => {
      render(<Logo variant="full" size="lg" theme="dark" className="custom" />);
      const logo = screen.getByRole('img');

      expect(logo).toHaveClass('h-12'); // size lg
      expect(logo).toHaveClass('custom'); // className
      expect(logo).toBeInTheDocument();
    });

    it('debe mantener consistencia entre todas las variantes con mismo size', () => {
      const { container: containerFull } = render(<Logo variant="full" size="md" />);
      const { container: containerIcon } = render(<Logo variant="icon" size="md" />);
      const { container: containerText } = render(<Logo variant="text" size="md" />);

      expect(containerFull.querySelector('[role="img"]')).toHaveClass('h-8');
      expect(containerIcon.querySelector('[role="img"]')).toHaveClass('h-8');
      expect(containerText.querySelector('[role="img"]')).toHaveClass('h-8');
    });
  });
});
