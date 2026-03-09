import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ThemeToggle from './ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    // Limpiar localStorage
    localStorage.clear();

    // Limpiar clases del document
    document.documentElement.className = '';

    // Mock de matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  describe('Renderizado básico', () => {
    it('renderiza el botón correctamente', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('tiene aria-label descriptivo', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label');
      expect(button.getAttribute('aria-label')).toContain('Cambiar a');
    });

    it('muestra el icono correcto para tema light', () => {
      render(<ThemeToggle theme="light" />);

      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('muestra el icono correcto para tema dark', () => {
      render(<ThemeToggle theme="dark" />);

      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('muestra el icono correcto para tema system', () => {
      render(<ThemeToggle theme="system" />);

      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Toggle de tema', () => {
    it('cambia de light a dark sin includeSystem', () => {
      const handleChange = vi.fn();
      render(<ThemeToggle theme="light" onChange={handleChange} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleChange).toHaveBeenCalledWith('dark');
    });

    it('cambia de dark a light sin includeSystem', () => {
      const handleChange = vi.fn();
      render(<ThemeToggle theme="dark" onChange={handleChange} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleChange).toHaveBeenCalledWith('light');
    });

    it('cicla correctamente con includeSystem=true', () => {
      const handleChange = vi.fn();
      const { rerender } = render(
        <ThemeToggle theme="light" onChange={handleChange} includeSystem />
      );

      const button = screen.getByRole('button');

      // Light -> Dark
      fireEvent.click(button);
      expect(handleChange).toHaveBeenCalledWith('dark');

      // Dark -> System
      rerender(<ThemeToggle theme="dark" onChange={handleChange} includeSystem />);
      fireEvent.click(button);
      expect(handleChange).toHaveBeenCalledWith('system');

      // System -> Light
      rerender(<ThemeToggle theme="system" onChange={handleChange} includeSystem />);
      fireEvent.click(button);
      expect(handleChange).toHaveBeenCalledWith('light');
    });
  });

  describe('showLabel', () => {
    it('muestra el texto cuando showLabel=true', () => {
      render(<ThemeToggle theme="light" showLabel />);

      expect(screen.getByText('Modo claro')).toBeInTheDocument();
    });

    it('no muestra el texto cuando showLabel=false', () => {
      render(<ThemeToggle theme="light" showLabel={false} />);

      expect(screen.queryByText('Modo claro')).not.toBeInTheDocument();
    });

    it('muestra las etiquetas correctas para cada tema', () => {
      const { rerender } = render(<ThemeToggle theme="light" showLabel />);
      expect(screen.getByText('Modo claro')).toBeInTheDocument();

      rerender(<ThemeToggle theme="dark" showLabel />);
      expect(screen.getByText('Modo oscuro')).toBeInTheDocument();

      rerender(<ThemeToggle theme="system" showLabel />);
      expect(screen.getByText('Automático')).toBeInTheDocument();
    });
  });

  describe('Tamaños', () => {
    it('aplica las clases correctas para size="sm"', () => {
      render(<ThemeToggle size="sm" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-8', 'w-8');
    });

    it('aplica las clases correctas para size="md"', () => {
      render(<ThemeToggle size="md" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-9', 'w-9');
    });

    it('aplica las clases correctas para size="lg"', () => {
      render(<ThemeToggle size="lg" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-10', 'w-10');
    });
  });

  describe('Aplicación de tema al document', () => {
    it('añade clase "dark" cuando el tema es dark', () => {
      render(<ThemeToggle theme="dark" />);

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('remueve clase "dark" cuando el tema es light', () => {
      render(<ThemeToggle theme="light" />);

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('aplica el tema del sistema cuando theme="system"', () => {
      // Mock sistema en modo claro
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(<ThemeToggle theme="system" />);

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('aplica tema oscuro del sistema cuando prefers-color-scheme es dark', () => {
      // Mock sistema en modo oscuro
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? true : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(<ThemeToggle theme="system" />);

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('Modo no controlado', () => {
    it('funciona sin prop onChange', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // No debe lanzar errores
      expect(button).toBeInTheDocument();
    });

    it('persiste el tema en localStorage', async () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const stored = localStorage.getItem('wr-theme');
        expect(stored).toBeTruthy();
      });
    });

    it('carga el tema desde localStorage al montar', () => {
      localStorage.setItem('wr-theme', 'dark');

      render(<ThemeToggle showLabel />);

      expect(screen.getByText('Modo oscuro')).toBeInTheDocument();
    });

    it('usa tema por defecto si localStorage no tiene valor válido', () => {
      localStorage.setItem('wr-theme', 'invalid-theme');

      render(<ThemeToggle showLabel />);

      expect(screen.getByText('Modo claro')).toBeInTheDocument();
    });
  });

  describe('Modo controlado', () => {
    it('usa el tema de la prop theme', () => {
      render(<ThemeToggle theme="dark" showLabel />);

      expect(screen.getByText('Modo oscuro')).toBeInTheDocument();
    });

    it('no persiste en localStorage en modo controlado', () => {
      const handleChange = vi.fn();
      render(<ThemeToggle theme="light" onChange={handleChange} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleChange).toHaveBeenCalled();
      // Verify localStorage was NOT modified in controlled mode
      expect(localStorage.getItem('wr-theme')).toBeNull();
    });
    it('actualiza cuando cambia la prop theme', () => {
      const { rerender } = render(<ThemeToggle theme="light" showLabel />);

      expect(screen.getByText('Modo claro')).toBeInTheDocument();

      rerender(<ThemeToggle theme="dark" showLabel />);

      expect(screen.getByText('Modo oscuro')).toBeInTheDocument();
    });
  });

  describe('className personalizada', () => {
    it('aplica className adicional', () => {
      const { container } = render(<ThemeToggle className="custom-class" />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('custom-class');
    });
  });

  describe('Accesibilidad', () => {
    it('tiene el aria-label correcto indicando el próximo tema', () => {
      render(<ThemeToggle theme="light" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Cambiar a Modo oscuro');
    });

    it('actualiza aria-label cuando cambia el tema', () => {
      const { rerender } = render(<ThemeToggle theme="light" />);

      let button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Cambiar a Modo oscuro');

      rerender(<ThemeToggle theme="dark" />);

      button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Cambiar a Modo claro');
    });

    it('incluye "Automático" en aria-label cuando includeSystem=true', () => {
      render(<ThemeToggle theme="dark" includeSystem />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Cambiar a Automático');
    });
  });
});
